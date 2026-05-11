# Управление базой данных

## Содержание
1. [Подключение к БД](#подключение)
2. [Prisma Studio — визуальный редактор](#prisma-studio)
3. [Seed — начальные данные](#seed)
4. [Добавление и управление данными](#данные)
5. [Управление схемой (миграции)](#миграции)
6. [Резервное копирование](#бэкап)
7. [Полезные команды psql](#psql)

---

## Подключение

### Через Docker (контейнер уже запущен)

```bash
# Открыть psql внутри контейнера postgres
docker compose exec postgres psql -U shopuser -d shopdb

# Или с паролем
docker compose exec postgres psql -U shopuser -d shopdb -W
```

### Через внешний клиент (DBeaver, TablePlus, DataGrip)

```
Host:     localhost
Port:     5432
Database: shopdb
User:     shopuser
Password: shoppassword
```

> Значения берутся из `backend/.env` или `docker-compose.yml`

---

## Prisma Studio

Визуальный браузер таблиц — самый удобный способ просматривать и редактировать данные.

```bash
# Запустить Prisma Studio (открывается на http://localhost:5555)
docker compose exec backend node_modules/.bin/prisma studio
```

> Если контейнер не запущен — запусти локально:
> ```bash
> cd backend
> npm install
> npx prisma studio
> ```

---

## Seed

Seed заполняет БД начальными данными: администратор + 6 товаров.

```bash
# Запустить seed внутри контейнера
docker compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('ts-node').register();
" 
```

Проще — запустить seed напрямую через ts-node (если есть локальный Node):

```bash
cd backend
npm install
npx ts-node prisma/seed.ts
```

**Что создаёт seed:**
- Пользователь-администратор: телефон `+79000000000`
- 6 товаров (мыло с лавандой, мятой, розой и др.)

---

## Данные

### Добавить товар через API (самый простой способ)

```bash
# Сначала авторизоваться как admin и получить токен
curl -X POST http://localhost:4000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+79000000000"}'

# Посмотреть OTP в логах
docker compose logs backend | grep OTP

# Получить токен
curl -X POST http://localhost:4000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+79000000000", "code": "XXXXXX"}'

# Создать товар (вставить токен вместо TOKEN)
curl -X POST http://localhost:4000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Новое мыло",
    "description": "Описание не менее 10 символов",
    "price": 350,
    "stock": 20,
    "imageUrl": "https://example.com/image.jpg"
  }'
```

### Добавить товар через SQL (прямо в psql)

```sql
INSERT INTO "Product" (id, name, description, price, stock, "imageUrl", active, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Мыло с ромашкой',
  'Нежное мыло с экстрактом ромашки для чувствительной кожи',
  290.00,
  30,
  'https://example.com/chamomile.jpg',
  true,
  NOW(),
  NOW()
);
```

### Создать администратора

```sql
-- В psql или DBeaver
INSERT INTO "User" (id, phone, role, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), '+79111111111', 'ADMIN', NOW(), NOW())
ON CONFLICT (phone) DO UPDATE SET role = 'ADMIN';
```

Или через API (после авторизации с существующего admin-аккаунта — через psql):

```sql
-- Повысить существующего пользователя до admin
UPDATE "User" SET role = 'ADMIN' WHERE phone = '+79111111111';
```

### Посмотреть все таблицы

```sql
-- В psql
\dt

-- Или:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

### Просмотр данных

```sql
-- Все товары
SELECT id, name, price, stock, active FROM "Product";

-- Все заказы с пользователями
SELECT o.id, o.status, o.total, u.phone, o."createdAt"
FROM "Order" o
JOIN "User" u ON o."userId" = u.id
ORDER BY o."createdAt" DESC;

-- Заказы с оплатой
SELECT o.id, o.status, o.total, p.status as payment_status
FROM "Order" o
LEFT JOIN "Payment" p ON p."orderId" = o.id;

-- OTP коды (для отладки)
SELECT phone, code, "expiresAt", used FROM "OtpCode"
WHERE used = false AND "expiresAt" > NOW();
```

---

## Миграции

### Текущая схема (db push)

Проект использует `prisma db push` — схема применяется напрямую без файлов миграций.  
Это удобно на старте, но для продакшена нужны нормальные миграции.

### Переход на migrate (для продакшена)

**Шаг 1.** Убедись что БД запущена и схема актуальна.

```bash
# Локально, один раз
cd backend
npm install

# Создать первую миграцию из текущей схемы
npx prisma migrate dev --name init
```

Это создаст папку `prisma/migrations/` с SQL-файлом.

**Шаг 2.** В `Dockerfile` вернуть `migrate deploy`:

```dockerfile
# Заменить:
CMD ["sh", "-c", "node_modules/.bin/prisma db push --accept-data-loss && node dist/main.js"]
# На:
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
```

**Шаг 3.** Закоммитить папку `prisma/migrations/` в git.

### Изменить схему

1. Отредактировать `backend/prisma/schema.prisma`
2. Создать миграцию:
   ```bash
   cd backend
   npx prisma migrate dev --name add_field_name
   ```
3. Проверить что создался файл в `prisma/migrations/`
4. Закоммитить

### Применить изменения схемы в dev (без миграций)

```bash
# Синхронизировать схему с БД (сбросит данные если есть конфликты)
docker compose exec backend node_modules/.bin/prisma db push
```

### Сбросить БД полностью

```bash
# ОСТОРОЖНО: удаляет все данные!
docker compose down -v          # удалить volume с данными
docker compose up --build       # пересоздать с нуля
```

---

## Бэкап

### Создать дамп БД

```bash
# Сохранить дамп в файл
docker compose exec postgres pg_dump -U shopuser shopdb > backup_$(date +%Y%m%d).sql

# Или сжатый формат (рекомендуется)
docker compose exec postgres pg_dump -U shopuser -Fc shopdb > backup_$(date +%Y%m%d).dump
```

### Восстановить из дампа

```bash
# Из SQL-файла
docker compose exec -T postgres psql -U shopuser shopdb < backup_20260511.sql

# Из сжатого формата
docker compose exec -T postgres pg_restore -U shopuser -d shopdb backup_20260511.dump
```

### Автоматический бэкап (cron на хосте)

```bash
# Добавить в crontab (каждый день в 3:00)
0 3 * * * docker compose -f /path/to/soap-shop-lite/docker-compose.yml exec -T postgres pg_dump -U shopuser shopdb > /backups/shopdb_$(date +\%Y\%m\%d).sql
```

---

## psql — шпаргалка

```sql
\l          -- список баз данных
\dt         -- список таблиц
\d "User"   -- структура таблицы User
\q          -- выйти

-- Подсчёт записей
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Order";
SELECT COUNT(*) FROM "Product";

-- Очистить таблицу (с учётом FK)
TRUNCATE "OtpCode";

-- Удалить конкретный заказ и связанные записи
DELETE FROM "Payment" WHERE "orderId" = 'ORDER_ID';
DELETE FROM "OrderItem" WHERE "orderId" = 'ORDER_ID';
DELETE FROM "CrmLog" WHERE "orderId" = 'ORDER_ID';
DELETE FROM "Order" WHERE id = 'ORDER_ID';
```

---

## Переменные подключения

| Переменная | Значение по умолчанию | Файл |
|---|---|---|
| `POSTGRES_USER` | `shopuser` | `docker-compose.yml` |
| `POSTGRES_PASSWORD` | `shoppassword` | `docker-compose.yml` |
| `POSTGRES_DB` | `shopdb` | `docker-compose.yml` |
| `DATABASE_URL` | `postgresql://shopuser:shoppassword@postgres:5432/shopdb` | `backend/.env` |
