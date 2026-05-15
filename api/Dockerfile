FROM php:8.4-cli-alpine

RUN apk add --no-cache \
    sqlite \
    sqlite-dev \
    libzip-dev \
    icu-dev \
    oniguruma-dev \
    git \
    curl \
    bash \
    && docker-php-ext-install \
        pdo_sqlite \
        zip \
        intl \
        bcmath \
        mbstring \
        opcache

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-scripts --prefer-dist

COPY . .
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh \
    && composer dump-autoload --optimize \
    && mkdir -p storage/framework/{sessions,views,cache} bootstrap/cache /var/lib/sqlite \
    && chmod -R 0777 storage bootstrap/cache /var/lib/sqlite

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public"]
