include .env
export

export PROJECT_ROOT=${shell pwd}

# ============================================================
# ЛОКАЛЬНАЯ РАЗРАБОТКА
# ============================================================

env-up:
	@docker compose up zunno_postgres -d && \
	docker compose up zunno_redis -d && \
	docker compose up zunno_kafka -d

env-down:
	@docker compose down zunno_postgres && \
	docker compose down zunno_redis && \
	docker compose down zunno_kafka

env-cleanup:
	@read -p "Очистить все volume файлы окружения? Опасность утери данных. [y/N]: " ans; \
	if [ "$$ans" = "y" ]; then \
		docker compose down zunno_postgres && \
		docker compose down zunno_redis && \
		docker compose down zunno_kafka && \
		rm -rf out/pg_data && \
		rm -rf out/kafka_data && \
		rm -rf out/redis_data && \
		echo "Файлы окружения очищены"; \
	else \
		echo "Очистка окружения отменена"; \
	fi

migrate-create:
	@if [ -z "${seq}" ]; then \
		echo "Отсутствует необходимый параметр 'seq'. Пример: make migrate-create seq=init"; \
		exit 1; \
	fi; \
	docker compose run --rm --no-deps zunno_migrate \
		create \
		-ext sql \
		-dir /migrations \
		-seq ${seq}

migrate-up:
	@make migrate-action action=up

migrate-down:
	@make migrate-action action=down

migrate-force:
	@docker compose run --rm zunno_migrate \
		-path /migrations \
		-database ${POSTGRES_STRING} \
		force 1

migrate-action:
	@if [ -z "${action}" ]; then \
		echo "Отсутствует необходимый параметр 'action'. Пример: make migrate-action action=down 1"; \
		exit 1; \
	fi; \
	docker compose run --rm zunno_migrate \
		-path /migrations \
		-database ${POSTGRES_STRING} \
		"${action}"

zunno_run:
	@export LOGGER_FOLDER=${PROJECT_ROOT}/out/logs && \
	export POSTGRES_HOST=localhost && \
	go mod tidy && \
	go run ./cmd/zunno_app/v1/main.go

test:
	@go test ./... -count=1 -race

# ============================================================
# ПРОДАКШН / ДЕПЛОЙ
# ============================================================

# Файл с прод-переменными окружения. По умолчанию .env.prod
ENV_FILE ?= .env.prod
COMPOSE_PROD = docker compose -f docker-compose.prod.yml --env-file $(ENV_FILE)

# Проверка, что .env.prod существует
check-prod-env:
	@if [ ! -f "$(ENV_FILE)" ]; then \
		echo "ERROR: $(ENV_FILE) не найден."; \
		echo "Скопируйте .env.prod.example → $(ENV_FILE) и заполните."; \
		exit 1; \
	fi

# Инициализация окружения на сервере: папки + .env.prod
prod-init: check-prod-env
	@echo "=== Создание директорий ==="
	@mkdir -p out/logs out/pg_data out/redis_data out/kafka_data
	@mkdir -p out/certbot/conf out/certbot/www
	@echo "=== Готово ==="
	@echo "Дальше: make prod-cert (первый выпуск сертификата)"
	@echo "Потом:  make prod-up"

# Первый выпуск Let's Encrypt (запускать один раз)
prod-cert: check-prod-env
	@chmod +x init-letsencrypt.sh
	@./init-letsencrypt.sh

# Сборка образа приложения
prod-build: check-prod-env
	@$(COMPOSE_PROD) build --no-cache zunno_app

# Запуск всего стека в проде
prod-up: check-prod-env
	@$(COMPOSE_PROD) up -d

# Остановка без удаления данных
prod-down: check-prod-env
	@$(COMPOSE_PROD) down

# Остановка + удаление контейнеров (данные в ./out сохраняются)
prod-stop: check-prod-env
	@$(COMPOSE_PROD) stop

# Показать статус
prod-ps: check-prod-env
	@$(COMPOSE_PROD) ps

# Логи приложения
prod-logs: check-prod-env
	@$(COMPOSE_PROD) logs -f zunno_app

# Логи nginx
prod-logs-nginx: check-prod-env
	@$(COMPOSE_PROD) logs -f nginx

# Логи всего стека
prod-logs-all: check-prod-env
	@$(COMPOSE_PROD) logs -f

# Обновление кода из репы + пересборка + перезапуск
prod-deploy: check-prod-env
	@echo "=== git pull ==="
	@git pull
	@echo "=== build ==="
	@$(COMPOSE_PROD) build zunno_app
	@echo "=== up ==="
	@$(COMPOSE_PROD) up -d
	@echo "=== status ==="
	@$(COMPOSE_PROD) ps

# Обновить только приложение (без git pull)
prod-redeploy: check-prod-env
	@$(COMPOSE_PROD) up -d --build zunno_app

# Применить миграции в проде
prod-migrate: check-prod-env
	@$(COMPOSE_PROD) run --rm zunno_migrate

# Проверка сертификата
prod-cert-check: check-prod-env
	@$(COMPOSE_PROD) exec certbot certbot certificates

# Принудительное обновление сертификата
prod-cert-renew: check-prod-env
	@$(COMPOSE_PROD) exec certbot certbot renew --force-renewal
	@$(COMPOSE_PROD) exec nginx nginx -s reload

# Бэкап Postgres
prod-backup-db: check-prod-env
	@mkdir -p out/backups
	@$(COMPOSE_PROD) exec -T zunno_postgres \
		pg_dump -U $${POSTGRES_USER} $${POSTGRES_DB} \
		> out/backups/db-$$(date +%Y%m%d-%H%M%S).sql
	@echo "Бэкап сохранён в out/backups/"

# Полная очистка прода (ОСТОРОЖНО — удалит данные)
prod-cleanup: check-prod-env
	@read -p "УДАЛИТЬ все данные прода (БД, Redis, Kafka, сертификаты)? [y/N]: " ans; \
	if [ "$$ans" = "y" ]; then \
		$(COMPOSE_PROD) down && \
		rm -rf out/pg_data out/redis_data out/kafka_data out/certbot && \
		echo "Всё удалено"; \
	else \
		echo "Отменено"; \
	fi

.PHONY: env-up env-down env-cleanup migrate-create migrate-up migrate-down migrate-force migrate-action zunno_run test \
        check-prod-env prod-init prod-cert prod-build prod-up prod-down prod-stop prod-ps \
        prod-logs prod-logs-nginx prod-logs-all prod-deploy prod-redeploy prod-migrate \
        prod-cert-check prod-cert-renew prod-backup-db prod-cleanup