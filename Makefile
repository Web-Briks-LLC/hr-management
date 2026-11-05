SHELL := /bin/bash
.DEFAULT_GOAL := help

# Local process names and deployment options (never committed).
-include .make.local
export PM2_CLIENT PM2_SERVER PM2_PAYMENT CLEAN_CACHE FORCE APPS

.PHONY: help dev prod install
help:
	@printf '%s\n' \
	  'make dev                         Start client, server and payment locally' \
	  'make dev APPS="client server"    Start selected apps' \
	  'make install                     npm ci for all apps (or APPS="...")' \
	  'make prod                        Pull and deploy changed apps via PM2' \
	  'make prod FORCE=1                Deploy all apps, even without new commits' \
	  'make prod CLEAN_CACHE=1          Also clean npm cache after install' \
	  'Configure existing PM2 process names in .make.local (see .make.local.example).'

install:
	@bash scripts/dev.sh install

dev:
	@bash scripts/dev.sh dev

prod:
	@bash scripts/deploy.sh
