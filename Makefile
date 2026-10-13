include .env
export

export PROJECT_ROOT=${shell pwd}



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
		echo "Отсутствует необходимый параметр 'seq'. Пример: make migrate-creat seq=init"; \
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
	fi; 

	docker compose run --rm zunno_migrate \
		-path /migrations \
		-database ${POSTGRES_STRING} \
		"${action}"

zunno_run:
	@export LOGGER_FOLDER=${PROJECT_ROOT}/out/logs && \
	export POSTGRES_HOST=localhost && \
	go mod tidy && \
	go run ./cmd/zunno_app/v1/main.go