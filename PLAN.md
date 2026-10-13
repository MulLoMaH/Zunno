# Приложение для совместных планов и бюджета

## Стек и архитектура
- **Язык:** Go 1.22+
- **HTTP-роутер:** `chi`
- **СУБД:** PostgreSQL (основные данные), Redis (сессии/кэш)
- **Брокер:** Kafka (одна нода, для асинхронной статистики)
- **Аутентификация:** JWT (access + refresh), пароли bcrypt
- **Инфраструктура:** Docker Compose (PostgreSQL, Redis, Kafka, Zookeeper, приложение)
- **Кодовая структура (монолит с заделом на микросервисы):**
  - `cmd/` – точка входа
  - `internal/domain/` – структуры и интерфейсы
  - `internal/service/` – бизнес-логика
  - `internal/repository/` – PostgreSQL + Redis
  - `internal/transport/` – HTTP-хендлеры
  - `internal/kafka/` – продюсер/консьюмер
  - `pkg/` – middleware, конфиг, утилиты

## План разработки (5 дней)
| День | Фичи                                          |
|------|-----------------------------------------------|
| 1    | Аутентификация, каркас проекта                |
| 2    | Группы                                        |
| 3    | Совместный бюджет                             |
| 4    | Общие планы и чек-листы                       |
| 5    | Цели + Статистика (Kafka), финальные доработки |

---

## Фича 1: Аутентификация и пользователи
### Функционал
- Регистрация нового пользователя `POST /auth/register`
- Логин (по номеру телефона и паролю) `POST /auth/login`
- Обновление токенов `POST /auth/refresh`
- Middleware проверки JWT (access token) для защищённых эндпоинтов
- Хранение refresh-токенов в Redis (с возможностью отзыва)

### Сущности
- **User**
  - `ID` (UUID)
  - `Name` (string)
  - `Age` (int)
  - `Phone` (string, unique)
  - `PasswordHash` (string)
  - `CreatedAt` (time.Time)

---

## Фича 2: Группы
### Функционал
- Создание группы (пользователь становится администратором) `POST /groups`
- Приглашение участника по номеру телефона `POST /groups/{id}/invite`
- Принятие приглашения (участник сам вступает) `POST /groups/{id}/join`
- Роли: `admin` (создатель и назначенные) и `member`
- Все последующие запросы выполняются в контексте группы (заголовок `X-Group-Id`)

### Сущности
- **Group**
  - `ID` (UUID)
  - `Name` (string)
  - `OwnerID` (UUID, ссылка на User)
  - `CreatedAt` (time.Time)
- **Membership**
  - `UserID` (UUID)
  - `GroupID` (UUID)
  - `Role` (string: "admin" или "member")
  - `JoinedAt` (time.Time)

---

## Фича 3: Совместный бюджет
### Функционал
- Создание пользовательских категорий с указанием лимита и типа `POST /categories`
- Получение всех категорий группы `GET /categories`
- Добавление транзакции (покупки) `POST /transactions`
- Просмотр транзакций с фильтрацией по датам и категории `GET /transactions`
- Сводка бюджета за месяц: общий расход, лимиты, остатки `GET /budget/summary?month=2026-08`
- Типы категорий:
  - `fixed` – обязательные траты (например, еда, дом)
  - `spontaneous` – спонтанные покупки (отдельный лимит)
- Контроль лимитов: в сводке показывается превышение

### Сущности
- **Category**
  - `ID` (UUID)
  - `GroupID` (UUID)
  - `Name` (string)
  - `Type` (string: "fixed" или "spontaneous")
  - `Limit` (float64, nullable – для категорий без лимита)
- **Transaction**
  - `ID` (UUID)
  - `GroupID` (UUID)
  - `UserID` (UUID)
  - `CategoryID` (UUID)
  - `Amount` (float64)
  - `Date` (time.Time – дата покупки)
  - `Description` (string)
  - `CreatedAt` (time.Time)

---

## Фича 4: Общие планы и календарь
### Функционал
- Создание события с прикреплённым чек-листом `POST /plans`
- Редактирование события, отметка выполнения `PATCH /plans/{id}`
- Добавление новых пунктов в чек-лист события `POST /plans/{id}/checklist`
- Отметка отдельного пункта чек-листа `PATCH /checklist/{id}`
- Получение событий группы за период (календарь) `GET /plans?from=...&to=...`
- Подсчёт процента выполненных планов/пунктов за период

### Сущности
- **PlanEvent**
  - `ID` (UUID)
  - `GroupID` (UUID)
  - `CreatorID` (UUID)
  - `Title` (string)
  - `Description` (string)
  - `EventDate` (time.Time – дата и время события)
  - `IsDone` (bool)
  - `CreatedAt` (time.Time)
  - `DoneAt` (*time.Time)
- **ChecklistItem**
  - `ID` (UUID)
  - `EventID` (UUID, внешний ключ к PlanEvent)
  - `Text` (string)
  - `IsChecked` (bool)
  - `CheckedAt` (*time.Time)

---

## Фича 5: Цели (учёт впечатлений)
### Функционал
- Создание категории целей (например, «Фильмы», «Книги») `POST /goal-categories`
- Добавление элемента в категорию `POST /goal-categories/{id}/items`
- Отметка выполнения элемента `PATCH /goal-items/{id}`
- Просмотр всех элементов категории `GET /goal-categories/{id}/items`
- Учёт дат добавления, удаления, выполнения

### Сущности
- **GoalCategory**
  - `ID` (UUID)
  - `GroupID` (UUID)
  - `Name` (string)
- **GoalItem**
  - `ID` (UUID)
  - `CategoryID` (UUID)
  - `Title` (string)
  - `Description` (string)
  - `Done` (bool)
  - `CreatedAt` (time.Time)
  - `DoneAt` (*time.Time)

---

## Фича 6: Статистика (асинхронная через Kafka)
### Функционал
- При создании каждой транзакции продюсер отправляет событие `transaction.created` в топик `budget-events`
- Консьюмер (в этом же монолите, отдельная горутина) читает события и обновляет материализованную таблицу `category_stats`
- Эндпоинт получения статистики: `GET /statistics?group_id=...&month=...&user_id=...`
  - Если данные за запрошенный месяц уже есть в `category_stats` – возвращаются мгновенно
  - Если данных ещё нет (свежая транзакция не обработана) – сервер ждёт до 5 секунд, проверяя обновление, иначе отдаёт 504
- Статистика считается по каждой категории, по каждому участнику и общая по группе

### Сущности
- **CategoryStats** (материализованное представление)
  - `GroupID` (UUID)
  - `UserID` (UUID)
  - `CategoryID` (UUID)
  - `Month` (string, формат "YYYY-MM")
  - `TotalAmount` (float64)
  - `UpdatedAt` (time.Time)









  # Фичи приложения Zunno

---

## Фича 1: Аутентификация

### Функционал
- Регистрация пользователя по номеру телефона и паролю
- Логин по номеру телефона и паролю
- Выдача JWT: access token (15 минут) + refresh token (7 дней)
- Обновление access token по refresh token
- Выход из системы (отзыв refresh token в Redis)
- Хеширование паролей bcrypt

### Эндпоинты
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth/register` | Регистрация нового пользователя |
| POST | `/auth/login` | Вход в систему |
| POST | `/auth/refresh` | Обновить access token |
| POST | `/auth/logout` | Выйти из системы |

### Сущности
**User** (таблица `zunno.users`)
- `ID` — UUID, primary key
- `Version` — BIGINT, оптимистичная блокировка
- `FullName` — VARCHAR(100), от 3 до 100 символов
- `Age` — INTEGER
- `PhoneNumber` — VARCHAR(15), уникальный, формат `+[0-9]{10,15}`
- `PasswordHash` — VARCHAR(255), bcrypt
- `CreatedAt` — TIMESTAMPTZ

---

## Фича 2: Пользователи (CRUD)

### Функционал
- Получение своего профиля
- Обновление своего профиля (имя, возраст, телефон)
- Удаление своего аккаунта
- Получение профиля другого участника группы
- Все операции только для авторизованных пользователей

### Эндпоинты
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/users/me` | Получить свой профиль |
| PATCH | `/users/me` | Обновить имя, возраст, телефон |
| DELETE | `/users/me` | Удалить аккаунт |
| GET | `/users/{id}` | Получить профиль участника группы |

### Валидация
- Имя: от 3 до 100 символов
- Возраст: неотрицательное число
- Телефон: формат `+[0-9]{10,15}`, уникальный

---

## Фича 3: Группы

### Функционал
- Создание группы (создатель становится администратором)
- Приглашение участника по номеру телефона
- Принятие приглашения (пользователь сам вступает)
- Получение списка групп текущего пользователя
- Получение списка участников группы
- Роли: `admin` и `member`
- Middleware проверки, что пользователь состоит в группе

### Эндпоинты
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/groups` | Создать группу |
| POST | `/groups/{id}/invite` | Пригласить участника по номеру телефона |
| POST | `/groups/{id}/join` | Принять приглашение |
| GET | `/groups` | Список групп пользователя |
| GET | `/groups/{id}/members` | Список участников группы |

### Сущности
**Group** (таблица `zunno.groups`)
- `ID` — UUID, primary key
- `Version` — BIGINT
- `Name` — VARCHAR(100)
- `OwnerID` — UUID, foreign key к users
- `CreatedAt` — TIMESTAMPTZ

**Membership** (таблица `zunno.memberships`)
- `Version` — BIGINT
- `UserID` — UUID, foreign key к users
- `GroupID` — UUID, foreign key к groups
- `Role` — VARCHAR(10): `admin` или `member`
- `JoinedAt` — TIMESTAMPTZ
- Primary key: (UserID, GroupID)

---

## Фича 4: Совместный бюджет

### Функционал
- Создание категорий с лимитом и типом
- Типы категорий: `fixed` (обязательные) и `spontaneous` (спонтанные)
- Добавление транзакций (покупок) с указанием категории
- Фильтрация транзакций по датам, категории, участнику
- Сводка бюджета за месяц: общий расход, лимиты, остатки
- Контроль превышения лимитов
- Все операции в контексте группы

### Эндпоинты
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/categories` | Создать категорию |
| GET | `/categories` | Список категорий группы |
| PATCH | `/categories/{id}` | Обновить категорию |
| DELETE | `/categories/{id}` | Удалить категорию |
| POST | `/transactions` | Добавить транзакцию |
| GET | `/transactions` | Фильтр по датам, категории, участнику |
| GET | `/budget/summary` | Сводка бюджета за месяц |

### Сущности
**Category** (таблица `zunno.categories`)
- `ID` — UUID, primary key
- `Version` — BIGINT
- `GroupID` — UUID, foreign key к groups
- `Name` — VARCHAR(100)
- `Type` — VARCHAR(15): `fixed` или `spontaneous`
- `MonthlyLimit` — NUMERIC(12,2), default 0
- `CreatedAt` — TIMESTAMPTZ

**Transaction** (таблица `zunno.transactions`)
- `ID` — UUID, primary key
- `Version` — BIGINT
- `GroupID` — UUID, foreign key к groups
- `UserID` — UUID, foreign key к users
- `CategoryID` — UUID, foreign key к categories
- `Amount` — NUMERIC(12,2), > 0
- `Date` — TIMESTAMPTZ, дата покупки
- `Description` — VARCHAR(255), nullable
- `CreatedAt` — TIMESTAMPTZ

---

## Фича 5: Общие планы и календарь

### Функционал
- Создание событий с датой и временем
- Прикрепление чек-листов к событиям
- Редактирование событий (название, описание, дата)
- Отметка события выполненным (вычёркивание)
- Отметка отдельных пунктов чек-листа
- Получение событий за период (календарь)
- Подсчёт процента выполнения планов за период

### Эндпоинты
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/plans` | Создать событие |
| GET | `/plans` | Список событий за период |
| PATCH | `/plans/{id}` | Обновить / отметить выполненным |
| DELETE | `/plans/{id}` | Удалить событие |
| POST | `/plans/{id}/checklist` | Добавить пункт чек-листа |
| PATCH | `/checklist/{id}` | Отметить пункт чек-листа |
| DELETE | `/checklist/{id}` | Удалить пункт чек-листа |

### Сущности
**PlanEvent** (таблица `zunno.plan_events`)
- `ID` — UUID, primary key
- `Version` — BIGINT
- `GroupID` — UUID, foreign key к groups
- `CreatorID` — UUID, foreign key к users
- `Title` — VARCHAR(200)
- `Description` — TEXT, nullable
- `EventDate` — TIMESTAMPTZ
- `IsDone` — BOOLEAN, default false
- `CreatedAt` — TIMESTAMPTZ
- `DoneAt` — TIMESTAMPTZ, nullable

**ChecklistItem** (таблица `zunno.checklist_items`)
- `ID` — UUID, primary key
- `Version` — BIGINT
- `EventID` — UUID, foreign key к plan_events
- `Text` — VARCHAR(500)
- `IsChecked` — BOOLEAN, default false
- `CheckedAt` — TIMESTAMPTZ, nullable

---

## Фича 6: Цели (учёт впечатлений)

### Функционал
- Создание категорий целей (например: Фильмы, Книги, Места)
- Добавление элементов в категории
- Отметка выполнения элементов
- Удаление категорий и элементов
- Просмотр всех элементов категории
- Учёт дат добавления и выполнения

### Эндпоинты
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/goal-categories` | Создать категорию целей |
| GET | `/goal-categories` | Список категорий |
| PATCH | `/goal-categories/{id}` | Переименовать категорию |
| DELETE | `/goal-categories/{id}` | Удалить категорию |
| POST | `/goal-categories/{id}/items` | Добавить элемент |
| GET | `/goal-categories/{id}/items` | Список элементов |
| PATCH | `/goal-items/{id}` | Отметить выполненным |
| DELETE | `/goal-items/{id}` | Удалить элемент |

### Сущности
**GoalCategory** (таблица `zunno.goal_categories`)
- `ID` — UUID, primary key
- `Version` — BIGINT
- `GroupID` — UUID, foreign key к groups
- `Name` — VARCHAR(100)

**GoalItem** (таблица `zunno.goal_items`)
- `ID` — UUID, primary key
- `Version` — BIGINT
- `CategoryID` — UUID, foreign key к goal_categories
- `Title` — VARCHAR(200)
- `Description` — TEXT, nullable
- `Done` — BOOLEAN, default false
- `CreatedAt` — TIMESTAMPTZ
- `DoneAt` — TIMESTAMPTZ, nullable

---

## Фича 7: Статистика (асинхронная через Kafka)

### Функционал
- При создании транзакции продюсер отправляет событие в топик `budget-events`
- Консьюмер читает события и обновляет таблицу `category_stats`
- Статистика по каждой категории, каждому участнику и общая по группе
- Месячная агрегация (формат `YYYY-MM`)
- Таймаут 5 секунд: если данные ещё не обработаны — возврат 504
- Обновление материализованного представления асинхронно

### Эндпоинты
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/statistics` | Получить статистику за месяц |

### Параметры запроса
| Параметр | Обязательный | Описание |
|----------|--------------|----------|
| `group_id` | Да | ID группы |
| `month` | Да | Месяц в формате `YYYY-MM` |
| `user_id` | Нет | Фильтр по участнику |

### Сущности
**CategoryStats** (таблица `zunno.category_stats`)
- `Version` — BIGINT
- `GroupID` — UUID, foreign key к groups
- `UserID` — UUID, foreign key к users
- `CategoryID` — UUID, foreign key к categories
- `Month` — VARCHAR(7), формат `YYYY-MM`
- `TotalAmount` — NUMERIC(12,2)
- `UpdatedAt` — TIMESTAMPTZ
- Primary key: (GroupID, UserID, CategoryID, Month)

---

## Общая сводка

| # | Фича | Эндпоинтов | Таблиц |
|---|------|------------|--------|
| 1 | Аутентификация | 4 | users |
| 2 | Пользователи (CRUD) | 4 | users |
| 3 | Группы | 5 | groups, memberships |
| 4 | Бюджет | 7 | categories, transactions |
| 5 | Планы | 7 | plan_events, checklist_items |
| 6 | Цели | 8 | goal_categories, goal_items |
| 7 | Статистика | 1 | category_stats |
| **Итого** | **36** | **10** |