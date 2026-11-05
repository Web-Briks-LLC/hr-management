#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
read -r -a apps <<< "${APPS:-client server payment}"
for app in "${apps[@]}"; do
    case "$app" in
        client|server|payment) ;;
        *) echo "Unknown app: $app (choose client, server or payment)." >&2; exit 1 ;;
    esac
done

for app in "${apps[@]}"; do
    if [[ ${1:-dev} == install || ! -d "$app/node_modules" ]]; then
        (cd "$app" && npm ci --include=dev)
    fi
done
[[ ${1:-dev} != install ]] || exit 0

# Separate process groups allow Ctrl+C to stop npm and all of its children.
command -v setsid >/dev/null || { echo 'make dev requires setsid (util-linux).' >&2; exit 1; }
pids=()
cleanup() {
    trap - EXIT INT TERM
    for pid in "${pids[@]}"; do
        kill -TERM -- "-$pid" 2>/dev/null || true
    done
    wait || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
for app in "${apps[@]}"; do
    (cd "$app" && exec setsid npm run dev) &
    pids+=("$!")
done
# If any app exits, stop its siblings too; preserve the failing exit code.
wait -n "${pids[@]}"
