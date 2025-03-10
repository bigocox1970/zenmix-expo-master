-- Check if the category already exists to avoid duplicates
INSERT INTO sound_categories (name, slug)
SELECT 'mixes', 'mixes'
WHERE NOT EXISTS (
    SELECT 1 FROM sound_categories WHERE name = 'mixes'
); 