SHELL := /bin/bash
.DEFAULT_GOAL := help
ROOT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
APPS := server client payment
PM2_NAMES := hrapi.webbsiks.com hr.webbsiks.com payment.webbriks.com
APP ?= hrapi.webbsiks.com

# Local Docker workflow: make dev, make status, make stop.
# Native/PM2 workflows additionally require Node.js, npm and app .env files.
# Production commands operate on this checkout and the current user's PM2 daemon.
# Example: make logs APP=payment.webbriks.com

.PHONY: help dev stop status install cache-clean build prod restart stop-prod status-prod logs
help:
	@printf '%s\n' 'make dev         Start HR Management Docker group (:3000, :3001, :5000)' 'make stop        Stop Docker group; preserve database' 'make status      Check Docker services' 'make install     npm ci in all apps (including build dependencies)' 'make build       Build all apps' 'make prod        Install, clean npm cache, build, then restart existing PM2 apps' 'make restart     Restart the three production PM2 apps by name' 'make stop-prod   Stop the three production PM2 apps' 'make status-prod Show production PM2 status' 'make logs        Follow production PM2 logs' 'make docker-logs Follow local container logs (optional SERVICE=server)' 'make down        Remove local containers; preserve database volume' 'make restore BACKUP=...  Restore HR backup into local MongoDB only' 'make local-admin Create/reset local admin from .local/admin.json' 'make seed-demo   Add 1,000 local demo orders and linked earnings'

dev:
	@docker compose --project-directory "$(ROOT)" up -d --build

stop:
	@docker compose --project-directory "$(ROOT)" stop

status:
	@docker compose --project-directory "$(ROOT)" ps

native-dev:
	@node "$(ROOT)scripts/dev.mjs" dev

native-stop:
	@node "$(ROOT)scripts/dev.mjs" stop

.PHONY: native-dev native-stop down docker-build docker-logs restore local-admin

down:
	@docker compose --project-directory "$(ROOT)" down

docker-build:
	@docker compose --project-directory "$(ROOT)" build

docker-logs:
	@docker compose --project-directory "$(ROOT)" logs -f --tail=100 $(SERVICE)

restore:
	@"$(ROOT)scripts/restore-local.sh" "$(BACKUP)"

local-admin:
	@docker compose --project-directory "$(ROOT)" exec -T server npx tsx src/scripts/local-admin.ts < "$(ROOT).local/admin.json"

install:
	@set -e; for app in $(APPS); do (cd "$(ROOT)$$app" && npm ci --include=dev); done

cache-clean:
	@npm cache clean --force

build:
	@set -e; for app in $(APPS); do (cd "$(ROOT)$$app" && npm run build); done

# Recursive calls preserve ordering even with make -j. Run on the production host.
prod:
	@$(MAKE) --no-print-directory install
	@$(MAKE) --no-print-directory cache-clean
	@$(MAKE) --no-print-directory build
	@if command -v pm2 >/dev/null 2>&1; then $(MAKE) --no-print-directory restart; else printf '%s\n' 'Build complete. PM2 is not installed; restart skipped.'; fi

restart stop-prod:
	@set -e; command -v pm2 >/dev/null || { echo 'PM2 is not installed.'; exit 1; }; \
	for name in $(PM2_NAMES); do pm2 describe "$$name" >/dev/null || { echo "Missing PM2 process: $$name"; exit 1; }; done; \
	for name in $(PM2_NAMES); do if [ '$@' = restart ]; then pm2 restart "$$name"; else pm2 stop "$$name"; fi; done

status-prod:
	@pm2 list

logs:
	@pm2 logs "$(APP)"

.PHONY: seed-demo
seed-demo:
	@docker compose --project-directory "$(ROOT)" exec -T server npx tsx src/scripts/local-demo.ts < "$(ROOT).local/admin.json"
