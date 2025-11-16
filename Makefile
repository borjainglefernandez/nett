DOCKER_COMPOSE := docker compose
DOCKER_COMPOSE_YML := --file docker-compose.yml
ifneq ("$(wildcard docker-compose.local.yml)","")
DOCKER_COMPOSE_YML += --file docker-compose.local.yml
endif

SUCCESS_MESSAGE := "✅ Nett is running - Backend: http://localhost:8000, Frontend: http://localhost:3000"

.PHONY: up
up:
	$(DOCKER_COMPOSE) \
		$(DOCKER_COMPOSE_YML) \
		up --build --detach --remove-orphans
	@echo $(SUCCESS_MESSAGE)

.PHONY: logs
logs:
	$(DOCKER_COMPOSE) \
		$(DOCKER_COMPOSE_YML) \
		logs --follow

.PHONY: stop
stop:
	$(DOCKER_COMPOSE) \
		$(DOCKER_COMPOSE_YML) \
		stop

.PHONY: build
build:
	$(DOCKER_COMPOSE) \
		$(DOCKER_COMPOSE_YML) \
		build

.PHONY: down
down:
	$(DOCKER_COMPOSE) \
		$(DOCKER_COMPOSE_YML) \
		down

