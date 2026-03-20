# Baseball Game Log - Common Operations
# All targets automatically set PYTHONPATH=. so imports work without hacks.

SHELL := /bin/bash
export PYTHONPATH := .
export DATABASE_URL ?= postgresql+psycopg2://postgres:postgres@localhost:5433/game_log

.PHONY: help test lint up down logs enrich statcast export-all add-game dev build

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# --- Docker ---
up: ## Start database + API containers
	docker compose up -d

down: ## Stop containers
	docker compose down

logs: ## Tail container logs
	docker compose logs -f --tail=50

# --- Testing & Quality ---
test: ## Run test suite
	pytest -v tests/

lint: ## Run ruff linter
	ruff check .

fmt: ## Format with ruff
	ruff format .

# --- Data Pipeline ---
enrich: ## Enrich games with MLB API data (scores, venues, game PKs)
	python -m scraper.enrich_games

statcast: ## Fetch Statcast data. Usage: make statcast GAME=776505 [FORCE=1]
	python -m scraper.statcast_fetcher $(if $(GAME),--game $(GAME)) $(if $(FORCE),--force)

export-all: ## Run all export scripts (JSON + heartbeat + drama + season + spray)
	python scripts/export_json.py web/public/
	python scripts/export_heartbeat_data.py
	python scripts/export_wpa_drama.py
	python scripts/export_season_stats.py
	python scripts/export_spray_chart.py

# --- Full Workflow ---
add-game: ## Add a game end-to-end. Usage: make add-game GAME=776505
ifndef GAME
	$(error GAME is required. Usage: make add-game GAME=776505)
endif
	python -m scraper.statcast_fetcher --game $(GAME) --force
	python scripts/export_json.py web/public/
	python scripts/export_heartbeat_data.py
	python scripts/export_wpa_drama.py
	@echo "✅ Game $(GAME) added. Run 'cd web && npm run build' then push to deploy."

# --- Web ---
dev: ## Start Next.js dev server
	cd web && npm run dev

build: ## Build static site
	cd web && npm run build

# --- Database ---
migrate: ## Run Alembic migrations
	alembic upgrade head

psql: ## Open psql shell
	docker compose exec db psql -U postgres -d game_log
