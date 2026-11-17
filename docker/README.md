# HR Management — local Docker setup

All services belong to the `hr-management` Compose project. MongoDB runs a
single-node `rs0` replica set to support Better Auth and application transactions:

| Service | Local URL |
| --- | --- |
| Client/dashboard | http://localhost:3000 |
| Payment | http://localhost:3001 |
| API | http://localhost:5000 |
| MongoDB | mongodb://127.0.0.1:27017/hr-management-local?replicaSet=rs0&directConnection=true |
| Mailpit inbox | http://localhost:8025 |

`make dev` builds and starts the group in the background. `make status` shows
containers, `make docker-logs SERVICE=server` follows a service, and `make stop`
stops the group. `make down` removes containers but keeps the database volume.
Do not use `docker compose down -v` unless you intend to delete local data.

Local configuration is in `server/.env`, `client/.env.local`, and
`payment/.env.local`. These files, `.local/` backups and admin credentials are
ignored by Git and excluded from Docker build contexts. Never copy production
integration credentials into these files. Email is captured by Mailpit; payment,
SMS and Cloudinary credentials are disabled/test placeholders. Scheduled jobs are
disabled locally with `DISABLE_SCHEDULERS=true`.

Restore a downloaded gzip mongodump archive with:

```sh
make restore BACKUP=.local/backups/hr-source.archive.gz
make local-admin
make seed-demo
```

Restore replaces matching collections **only** in `hr-management-local`, mapping
from `hr-management.*`. It does not connect to the production database. Use it
before testing: another restore replaces local edits to imported collections.
Admin setup reads `{ "email": "...", "password": "..." }` from the private file
`.local/admin.json`, verifies the account locally and invalidates imported sessions.
Demo seeding adds 1,000 identifiable `LOCAL-DEMO-*` orders, 20 demo clients, and
associated paid/unpaid demo earnings. Re-running it does not duplicate the orders.
Imported records remain intact.

The three application source directories are mounted for hot reload. Rebuild
with `make docker-build` after dependency changes, then `make dev`.
There is no BullMQ/Redis dependency in this checkout.

`make prod`, `make restart`, and `make stop-prod` remain the existing PM2
production commands; run them only in the intended production checkout.
`make native-dev` / `make native-stop` are available for running apps on the host.
