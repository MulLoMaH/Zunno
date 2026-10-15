#!/bin/bash
set -e

# Загружаем переменные из .env.prod
if [ ! -f .env.prod ]; then
    echo "ERROR: .env.prod not found"
    exit 1
fi
export $(grep -v '^#' .env.prod | xargs -0 | xargs -d '\n')

if [ -z "$DOMAIN" ] || [ -z "$LETSENCRYPT_EMAIL" ]; then
    echo "ERROR: DOMAIN and LETSENCRYPT_EMAIL must be set in .env.prod"
    exit 1
fi

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

DATA_PATH="./out/certbot"
CERT_PATH="$DATA_PATH/conf/live/$DOMAIN"
STAGING=0    # поставь 1 для теста на staging, 0 для прода

echo "### Creating directories..."
mkdir -p "$DATA_PATH/conf" "$DATA_PATH/www"

if [ -d "$CERT_PATH" ]; then
    echo "### Existing certificate found for $DOMAIN, skipping init"
    echo "### To force reissue: rm -rf $CERT_PATH && ./init-letsencrypt.sh"
    exit 0
fi

echo "### Downloading recommended TLS parameters..."
mkdir -p "$DATA_PATH/conf"
if [ ! -e "$DATA_PATH/conf/options-ssl-nginx.conf" ]; then
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
        > "$DATA_PATH/conf/options-ssl-nginx.conf"
fi
if [ ! -e "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
        > "$DATA_PATH/conf/ssl-dhparams.pem"
fi

echo "### Creating dummy certificate for $DOMAIN..."
mkdir -p "$CERT_PATH"
$COMPOSE run --rm --entrypoint "\
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout '/etc/letsencrypt/live/$DOMAIN/privkey.pem' \
      -out '/etc/letsencrypt/live/$DOMAIN/fullchain.pem' \
      -subj '/CN=localhost'" certbot

echo "### Starting nginx..."
$COMPOSE up --force-recreate -d nginx

echo "### Deleting dummy certificate..."
$COMPOSE run --rm --entrypoint "\
    rm -Rf /etc/letsencrypt/live/$DOMAIN && \
    rm -Rf /etc/letsencrypt/archive/$DOMAIN && \
    rm -Rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

echo "### Requesting Let's Encrypt certificate for $DOMAIN..."
STAGING_ARG=""
if [ "$STAGING" != "0" ]; then
    STAGING_ARG="--staging"
fi

$COMPOSE run --rm --entrypoint "\
    certbot certonly --webroot -w /var/www/certbot \
      $STAGING_ARG \
      --email $LETSENCRYPT_EMAIL \
      -d $DOMAIN \
      --rsa-key-size 4096 \
      --agree-tos \
      --force-renewal \
      --non-interactive" certbot

echo "### Reloading nginx..."
$COMPOSE exec nginx nginx -s reload

echo ""
echo "### DONE. Certificate issued for $DOMAIN"
echo "### Now bring the full stack up:"
echo "###   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d"
