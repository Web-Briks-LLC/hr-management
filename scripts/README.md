# Local development and production commands

Run these commands from the repository root on Linux with Bash, GNU Make,
Node/npm and util-linux (`flock` and `setsid`). Each app has its own lockfile.

## Development

```sh
make dev                       # client :3000, payment :3002; server uses server/.env
make dev APPS="client server"  # selected apps only
make install                   # clean install in all apps
make install APPS=client       # clean install in one app
```

`make dev` installs dependencies if node_modules is missing. After lockfile changes,
run `make install`. Ctrl+C stops the apps and their child processes. Configure each
app's environment files before starting it.

## Production

First configure **existing** PM2 processes, under the same OS user that owns them:

```sh
pm2 list
cp .make.local.example .make.local
# Edit .make.local to use the actual PM2 names.
make prod
```

The processes must already have the correct working directories, start commands,
ports and environment. This workflow restarts existing processes; it does not
create new ones or change their environment. Use `pm2 startup` separately if you
need the saved process list restored on boot.

`make prod`:

1. Requires a clean checkout on a branch with an upstream, then runs
   `git pull --ff-only`.
2. Detects changes in `client/`, `server/`, `payment/` since each app's last
   successful deployment. Changes in `.npmrc`, `Makefile` or `scripts/` select all
   apps. The first run builds all three apps because no deployment state exists.
3. Checks that each selected PM2 process exists.
4. Runs `npm ci --include=dev` and `NODE_ENV=production npm run build` in selected
   apps only. Dev dependencies are needed for TypeScript/Next.js builds.
5. After every selected app builds, restarts only those PM2 processes, then runs
   `pm2 save` once.
6. Records the deployed commit for each selected app in Git metadata. Failed
   installs/builds/restarts/save do not advance state, so rerunning retries them
   even if the previous command already pulled the commits.

```sh
make prod FORCE=1               # rebuild all apps; useful after manual env changes
make prod CLEAN_CACHE=1         # npm cache clean --force after each install
```

Cache cleanup is optional: npm's cache is shared and self-healing; clearing it
usually just makes future installs slower. `npm ci` already replaces node_modules.
See [npm ci](https://docs.npmjs.com/cli/commands/npm-ci/) and
[npm cache](https://docs.npmjs.com/cli/commands/npm-cache/).

This is an in-place deployment with restart downtime, not an atomic release or
automatic rollback. Installing dependencies and rebuilding Next.js output can
affect running apps even before restart. A build failure stops further steps;
a restart failure can leave some apps updated and others on the earlier version.
Fix the error and rerun `make prod`. A fresh checkout has no recorded state and
rebuilds all apps. Only one deployment can run at a time per Git repository.
