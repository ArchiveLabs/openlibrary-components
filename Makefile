.PHONY: install dev build up down

install:
	cd frontend && npm install

# Run Vite dev server + FastAPI side by side.
# Vite proxies /api/* to the FastAPI process.
dev: install
	@trap 'kill 0' INT; \
	(cd frontend && npm run dev) & \
	(cd backend && uvicorn main:app --reload --port 8000) & \
	wait

build: install
	cd frontend && npm run build

up:
	docker compose up --build

down:
	docker compose down
