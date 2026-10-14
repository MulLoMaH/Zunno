# Деплой Zunno на сервер

## Требования

- Ubuntu 22.04+ (или любой Linux с Docker)
- Docker 24+ и docker compose plugin
- Домен, A-запись которого указывает на IP сервера
- Открытые порты 80 и 443

## Шаг 1. Установка Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# перелогинься, чтобы группа применилась