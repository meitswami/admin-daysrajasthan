-- Multiple transport agencies per vehicle (one vehicle → many providers)
ALTER TABLE website_vehicles
  ADD COLUMN IF NOT EXISTS providers JSONB DEFAULT '[]'::jsonb;

-- Backfill from legacy flat provider/contact/price columns
UPDATE website_vehicles
SET providers = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'provider_company_name', COALESCE(provider_company_name, ''),
    'contact_person_name', contact_person_name,
    'contact_phone_1', contact_phone_1,
    'contact_phone_2', contact_phone_2,
    'price_per_km', price_per_km,
    'price_per_day', price_per_day
  )
)
WHERE
  (providers IS NULL OR providers = '[]'::jsonb)
  AND (
    COALESCE(TRIM(provider_company_name), '') <> ''
    OR COALESCE(TRIM(contact_person_name), '') <> ''
    OR COALESCE(TRIM(contact_phone_1), '') <> ''
    OR COALESCE(TRIM(contact_phone_2), '') <> ''
    OR COALESCE(TRIM(price_per_km), '') <> ''
    OR COALESCE(TRIM(price_per_day), '') <> ''
  );
