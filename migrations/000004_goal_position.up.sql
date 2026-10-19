ALTER TABLE zunno.goal_categories 
ADD COLUMN position INT NOT NULL DEFAULT 0;

ALTER TABLE zunno.goal_items 
ADD COLUMN position INT NOT NULL DEFAULT 0;

-- Инициализируем позиции существующих записей по created_at
WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY id) - 1 AS pos
    FROM zunno.goal_categories
)
UPDATE zunno.goal_categories c SET position = r.pos FROM ranked r WHERE c.id = r.id;

WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) - 1 AS pos
    FROM zunno.goal_items
)
UPDATE zunno.goal_items i SET position = r.pos FROM ranked r WHERE i.id = r.id;
