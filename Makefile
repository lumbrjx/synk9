.PHONY: build-mdb-server install-mdb-server-deps run build-server-dev build-server-prod start-backend start-ai-server stop-backend clean

# Install dependencies for modbus server
install-mdb-server-deps:
	sudo apt install libmodbus-dev

# Build the modbus server
build-mdb-server:
	cd mdb-server && gcc main.c -o main -lmodbus -lpthread

# Build Docker images
build-server-dev:
	cd server && docker build --target development -t synk-9:dev .

build-server-prod:
	cd server && docker build --target production -t synk-9:prod .

# Start backend services
start-backend:
	cd server && docker compose --env-file=.env.docker up -d

# Start AI server
start-ai-server:
	cd $(HOME)/Projects/important/B.R.A.I.N/Ai && bash -c "source .venv/bin/activate && python3 Host.py"

# Stop backend services
stop-backend:
	cd server && docker compose --env-file=.env.docker down

# Run both backend and AI server (sequential)
run-sequential: start-backend
	@echo "Waiting for backend to start..."
	@sleep 5
	@$(MAKE) start-ai-server

# Run both services in parallel (better approach)
run:
	@echo "Starting backend services..."
	@$(MAKE) start-backend
	@echo "Starting AI server in background..."
	@nohup $(MAKE) start-ai-server > ai-server.log 2>&1 &
	@echo "Both services started. Check ai-server.log for AI server output."

# Clean up
clean:
	cd server && docker compose --env-file=.env.docker down --remove-orphans
  kill -9 $(lsof -ti :8022)
	rm -f ai-server.log

# Development helpers
dev-logs:
	cd server && docker compose --env-file=.env.docker logs -f

ai-logs:
	tail -f ai-server.log

# Health check
health:
	cd server
	@echo "Checking backend health..."
	@docker compose --env-file=.env.docker ps
	@echo "Checking AI server..."
	@ps aux | grep Host.py | grep -v grep || echo "AI server not running"
