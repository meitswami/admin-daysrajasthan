DELETE FROM itinerary_revisions WHERE itinerary_id IN (
  SELECT id FROM client_itineraries WHERE type = 'website_package'
);
DELETE FROM client_itineraries WHERE type = 'website_package';
DELETE FROM itineraries WHERE id IN (
  '11111111-1111-1111-1111-111111111001',
  '11111111-1111-1111-1111-111111111002',
  '11111111-1111-1111-1111-111111111003',
  '11111111-1111-1111-1111-111111111004',
  '11111111-1111-1111-1111-111111111005'
);
-- Also clear any previous import with DR* quote ids if re-running
DELETE FROM itinerary_revisions WHERE itinerary_id IN (
  SELECT id FROM client_itineraries WHERE quote_id LIKE 'DR%'
);
DELETE FROM client_itineraries WHERE quote_id LIKE 'DR%';
DELETE FROM itineraries WHERE slug LIKE 'dr%';