# Project configuration
PROJECT_ID := daily-report-481805
REGION := asia-northeast1
SERVICE_NAME := daily-report
IMAGE_NAME := gcr.io/$(PROJECT_ID)/$(SERVICE_NAME)
PORT := 8080

.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: setup
setup: ## Install dependencies and setup project
	npm install
	npx prisma generate

.PHONY: dev
dev: ## Start development server
	npm run dev

.PHONY: build
build: ## Build Next.js application
	npm run build

.PHONY: test
test: ## Run tests
	npm run test:run

.PHONY: lint
lint: ## Run linter
	npm run lint

.PHONY: format
format: ## Format code
	npm run format

.PHONY: type-check
type-check: ## Run TypeScript type check
	npm run type-check

.PHONY: quality-check
quality-check: lint type-check test ## Run all quality checks

.PHONY: docker-build
docker-build: ## Build Docker image
	docker build -t $(IMAGE_NAME):latest .

.PHONY: docker-run
docker-run: ## Run Docker container locally
	docker run -p $(PORT):$(PORT) \
		-e PORT=$(PORT) \
		$(IMAGE_NAME):latest

.PHONY: docker-push
docker-push: ## Push Docker image to GCR
	docker push $(IMAGE_NAME):latest

.PHONY: gcloud-auth
gcloud-auth: ## Authenticate with Google Cloud
	gcloud auth login
	gcloud config set project $(PROJECT_ID)

.PHONY: gcloud-configure-docker
gcloud-configure-docker: ## Configure Docker to use gcloud credentials
	gcloud auth configure-docker

.PHONY: deploy-build
deploy-build: ## Build and push Docker image for deployment
	@echo "Building Docker image..."
	docker build --platform linux/amd64 -t $(IMAGE_NAME):latest .
	@echo "Pushing image to GCR..."
	docker push $(IMAGE_NAME):latest

.PHONY: deploy-run
deploy-run: ## Deploy to Cloud Run
	gcloud run deploy $(SERVICE_NAME) \
		--image $(IMAGE_NAME):latest \
		--platform managed \
		--region $(REGION) \
		--allow-unauthenticated \
		--port $(PORT) \
		--memory 512Mi \
		--cpu 1 \
		--min-instances 0 \
		--max-instances 10 \
		--set-env-vars "NODE_ENV=production"

.PHONY: deploy
deploy: quality-check deploy-build deploy-run ## Full deployment (quality check + build + deploy)

.PHONY: deploy-force
deploy-force: deploy-build deploy-run ## Force deployment without quality checks

.PHONY: logs
logs: ## Show Cloud Run logs
	gcloud run services logs read $(SERVICE_NAME) \
		--region $(REGION) \
		--limit 50

.PHONY: logs-tail
logs-tail: ## Tail Cloud Run logs
	gcloud run services logs tail $(SERVICE_NAME) \
		--region $(REGION)

.PHONY: status
status: ## Show Cloud Run service status
	gcloud run services describe $(SERVICE_NAME) \
		--region $(REGION)

.PHONY: url
url: ## Get service URL
	@gcloud run services describe $(SERVICE_NAME) \
		--region $(REGION) \
		--format 'value(status.url)'

.PHONY: delete
delete: ## Delete Cloud Run service
	gcloud run services delete $(SERVICE_NAME) \
		--region $(REGION)

.PHONY: prisma-migrate
prisma-migrate: ## Run Prisma migrations
	npx prisma migrate dev

.PHONY: prisma-studio
prisma-studio: ## Open Prisma Studio
	npx prisma studio

.PHONY: clean
clean: ## Clean build artifacts
	rm -rf .next
	rm -rf out
	rm -rf dist
	rm -rf build
	rm -rf coverage
	rm -rf node_modules/.cache

.PHONY: clean-all
clean-all: clean ## Clean all generated files including node_modules
	rm -rf node_modules
