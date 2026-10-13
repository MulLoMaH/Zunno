-- =============================================
-- Откат миграции (down)
-- =============================================

DROP TABLE IF EXISTS zunno.category_stats;
DROP TABLE IF EXISTS zunno.goal_items;
DROP TABLE IF EXISTS zunno.goal_categories;
DROP TABLE IF EXISTS zunno.checklist_items;
DROP TABLE IF EXISTS zunno.plan_events;
DROP TABLE IF EXISTS zunno.transactions;
DROP TABLE IF EXISTS zunno.categories;
DROP TABLE IF EXISTS zunno.memberships;
DROP TABLE IF EXISTS zunno.groups;
DROP TABLE IF EXISTS zunno.users;

DROP SCHEMA IF EXISTS zunno;