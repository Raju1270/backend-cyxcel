-- Remove trailing dashes from Peril.slug
UPDATE "Peril"
SET "slug" = rtrim("slug", '-')
WHERE "slug" LIKE '%-';
