.PHONY: install install-frontend dev-api dev-web

install:
	pip install -r requirements.txt

install-frontend:
	cd apps/web && npm install

dev-api:
	uvicorn apps.api.main:app --reload --host 0.0.0.0 --port 8000

dev-web:
	cd apps/web && npm run dev
