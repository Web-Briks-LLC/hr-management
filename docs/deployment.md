# Deploy this release on the existing PM2 host

Run these commands on the production host, in its existing `hr-management`
checkout, as the user who owns the PM2 processes. This does not provision a new
host. Keep the production environment files and reverse-proxy configuration.

Before the maintenance window:

- Take a database backup using the existing backup procedure.
- Confirm MongoDB is a replica set or sharded cluster. Standalone MongoDB cannot
  run the production ownership transactions in this release.
- Run `pm2 list`. The Makefile expects `hrapi.webbsiks.com`, `hr.webbsiks.com`, and
  `payment.webbriks.com`. If the actual names differ, supply
  `PM2_NAMES="actual-api actual-client actual-payment"` to the make commands.
- Confirm production `.env` files are present; do not copy local environment
  files. `DISABLE_SCHEDULERS` should not be `true` on the production API.
- Confirm the existing unique OrderImage index on `{ orderId: 1, imageName: 1 }`
  exists. Do not delete duplicate production data to force index creation.

During the maintenance window, pull the release, then stop the old processes
before building in the same checkout. Stop old API instances on every host if
there are several:

```sh
git status --short
# Resolve any local source changes before continuing.
git pull --ff-only origin main && make stop-prod && make prod
```

`make prod` installs locked dependencies (including build tools), builds all
three apps and restarts the existing PM2 processes. It does not create PM2
processes. If a command fails, stop and resolve the error; the apps can remain
stopped. Never run old and new production API writers together.

Verify the release:

```sh
make status-prod
pm2 logs hrapi.webbsiks.com --lines 100 --nostream
```

In the application, check sign-in, Production, order search, page navigation,
and a controlled take/release/retake/QC workflow. Check its work history.
Inspect existing image locks without modifying records:

```sh
cd server
npx tsx src/scripts/production-locks.ts
```

Review any reported mismatches before applying repairs; see
[production-workflow.md](production-workflow.md). New audit events start with
this release; historical events are not fabricated.

`make dev`, Compose, restore, local-admin and seed-demo are local development
commands, not production deployment steps. Staff activation performed against
the local database is not transferred by Git; apply it separately in the live
application if needed.
