#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
apps=(client server payment)
for command in git npm pm2 flock; do
    command -v "$command" >/dev/null || { echo "Required command missing: $command" >&2; exit 1; }
done

# Serialise deployments of this checkout, including across linked worktrees.
common_dir=$(git rev-parse --git-common-dir)
exec 9>"$common_dir/hr-deploy.lock"
flock -n 9 || { echo 'Another deployment is already running.' >&2; exit 1; }
state_dir=$(git rev-parse --git-path hr-deploy-state)

if [[ -n $(git status --porcelain) ]]; then
    echo 'Deployment requires a clean checkout. Commit or move local changes first.' >&2
    exit 1
fi
if ! git symbolic-ref -q HEAD >/dev/null; then
    echo 'Checkout a branch with an upstream before deploying.' >&2
    exit 1
fi
if ! git rev-parse --verify '@{upstream}' >/dev/null 2>&1; then
    echo 'Set this branch upstream before deploying.' >&2
    exit 1
fi

git pull --ff-only
revision=$(git rev-parse HEAD)
changed=()
for app in "${apps[@]}"; do
    previous=''
    [[ ! -f "$state_dir/$app" ]] || previous=$(<"$state_dir/$app")
    if [[ ${FORCE:-0} == 1 || -z $previous ]] ||
       ! git cat-file -e "${previous}^{commit}" 2>/dev/null ||
       ! git diff --quiet "$previous" "$revision" -- "$app/" .npmrc Makefile scripts/; then
        changed+=("$app")
    fi
done

if (( ${#changed[@]} == 0 )); then
    echo 'No app changes since the last successful deployment.'
    exit 0
fi
printf 'Deploying: %s\n' "${changed[*]}"

# Validate every selected process before installing or building anything.
for app in "${changed[@]}"; do
    variable="PM2_${app^^}"
    process=${!variable:-}
    if [[ -z $process ]]; then
        echo "Set $variable in .make.local to the existing PM2 process name (see pm2 list)." >&2
        exit 1
    fi
    pm2 describe "$process" >/dev/null || {
        echo "PM2 process not found: $process. Register it with the correct port/environment first." >&2
        exit 1
    }
done

# Build all affected apps before restarting any of them.
for app in "${changed[@]}"; do
    printf '\nInstalling and building %s\n' "$app"
    (
        cd "$app"
        npm ci --include=dev
        if [[ ${CLEAN_CACHE:-0} == 1 ]]; then
            npm cache clean --force
        fi
        NODE_ENV=production npm run build
    )
done

for app in "${changed[@]}"; do
    variable="PM2_${app^^}"
    # Preserve the environment/ports already configured in PM2.
    pm2 restart "${!variable}"
done
pm2 save

# Advance state only after every restart and pm2 save succeeds.
mkdir -p "$state_dir"
for app in "${changed[@]}"; do
    printf '%s\n' "$revision" >"$state_dir/$app.tmp"
    mv "$state_dir/$app.tmp" "$state_dir/$app"
done
printf '\nDeployment finished at %s\n' "$revision"
