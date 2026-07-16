-- Seed data matching src/lib/data/mock-data.ts
-- Run AFTER 001_travel_days_admin_schema.sql

INSERT INTO itineraries (id, package_name, destination, slug, pdf_url, cover_image_url, status, download_count, created_at, updated_at) VALUES
  ('11111111-1111-1111-1111-111111111001', '3 Days Jaipur Heritage Tour', 'Jaipur', '3-days-jaipur-heritage', '/uploads/itineraries/jaipur-heritage.pdf', 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800', 'active', 142, '2026-01-15T10:00:00Z', '2026-06-20T14:30:00Z'),
  ('11111111-1111-1111-1111-111111111002', '5 Days Golden Triangle', 'Delhi · Agra · Jaipur', '5-days-golden-triangle', '/uploads/itineraries/golden-triangle.pdf', 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800', 'active', 218, '2026-01-20T10:00:00Z', '2026-06-22T09:15:00Z'),
  ('11111111-1111-1111-1111-111111111003', '4 Days Jaisalmer Desert Safari', 'Jaisalmer', '4-days-jaisalmer-desert', '/uploads/itineraries/jaisalmer-desert.pdf', 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800', 'active', 96, '2026-02-01T10:00:00Z', '2026-06-18T11:00:00Z'),
  ('11111111-1111-1111-1111-111111111004', '3 Days Udaipur Lakes & Palaces', 'Udaipur', '3-days-udaipur-lakes', '/uploads/itineraries/udaipur-lakes.pdf', 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800', 'active', 87, '2026-02-10T10:00:00Z', '2026-06-25T16:45:00Z'),
  ('11111111-1111-1111-1111-111111111005', '2 Days Ranthambore Wildlife', 'Ranthambore', '2-days-ranthambore-wildlife', '/uploads/itineraries/ranthambore-wildlife.pdf', 'https://images.unsplash.com/photo-1561731216-c3a4d994f935?w=800', 'inactive', 34, '2026-03-01T10:00:00Z', '2026-06-10T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO itinerary_downloads (id, itinerary_id, customer_name, email, phone, destination, package_name, source_page, downloaded_at, synced_to_crm) VALUES
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'Priya Sharma', 'priya.sharma@gmail.com', '+91 98765 43210', 'Delhi · Agra · Jaipur', '5 Days Golden Triangle', '/packages/golden-triangle', '2026-07-04T09:12:00Z', true),
  ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111001', 'Rahul Mehta', 'rahul.m@gmail.com', '+91 87654 32109', 'Jaipur', '3 Days Jaipur Heritage Tour', '/destinations/jaipur', '2026-07-04T08:45:00Z', true),
  ('22222222-2222-2222-2222-222222222003', '11111111-1111-1111-1111-111111111003', 'Anita Desai', 'anita.desai@yahoo.com', '+91 76543 21098', 'Jaisalmer', '4 Days Jaisalmer Desert Safari', '/packages/desert-safari', '2026-07-03T16:30:00Z', false),
  ('22222222-2222-2222-2222-222222222004', '11111111-1111-1111-1111-111111111004', 'James Wilson', 'j.wilson@outlook.com', '+44 7700 900123', 'Udaipur', '3 Days Udaipur Lakes & Palaces', '/destinations/udaipur', '2026-07-03T11:20:00Z', true),
  ('22222222-2222-2222-2222-222222222005', '11111111-1111-1111-1111-111111111002', 'Vikram Singh', 'vikram.s@hotmail.com', '+91 99887 76655', 'Delhi · Agra · Jaipur', '5 Days Golden Triangle', '/homepage', '2026-07-02T14:00:00Z', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO contact_queries (id, name, email, mobile, subject, message, status, created_at) VALUES
  ('33333333-3333-3333-3333-333333333001', 'Neha Kapoor', 'neha.kapoor@gmail.com', '+91 91234 56789', 'Group tour enquiry', 'We are a group of 12 people planning a Rajasthan tour in December.', 'open', '2026-07-04T07:30:00Z'),
  ('33333333-3333-3333-3333-333333333002', 'Robert Chen', 'r.chen@company.com', '+1 415 555 0192', 'Corporate retreat', 'Looking for a 4-day corporate retreat package in Jaipur.', 'open', '2026-07-03T15:45:00Z'),
  ('33333333-3333-3333-3333-333333333003', 'Sunita Verma', 'sunita.v@rediffmail.com', '+91 98765 11122', 'Honeymoon package', 'Interested in a romantic Udaipur honeymoon package.', 'resolved', '2026-07-01T10:00:00Z'),
  ('33333333-3333-3333-3333-333333333004', 'Priya Sharma', 'priya.sharma@gmail.com', '+91 98765 43210', 'Payment query', 'Downloaded Golden Triangle PDF — please call about booking.', 'open', '2026-06-28T09:20:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO package_inquiries (id, customer_name, mobile, email, destination, travel_date, adults, children, budget, additional_requirements, status, source_page, created_at) VALUES
  ('44444444-4444-4444-4444-444444444001', 'Priya Sharma', '+91 98765 43210', 'priya.sharma@gmail.com', 'Delhi · Agra · Jaipur', '2026-10-15', 2, 1, '₹75,000 – ₹1,00,000', 'Need child-friendly hotels.', 'quoted', '/packages/golden-triangle', '2026-07-04T09:30:00Z'),
  ('44444444-4444-4444-4444-444444444002', 'Anita Desai', '+91 76543 21098', 'anita.desai@yahoo.com', 'Jaisalmer', '2026-11-20', 4, 0, '₹1,20,000 – ₹1,50,000', 'Desert camp preferred.', 'contacted', '/packages/desert-safari', '2026-07-03T17:00:00Z'),
  ('44444444-4444-4444-4444-444444444003', 'James Wilson', '+44 7700 900123', 'j.wilson@outlook.com', 'Udaipur', '2026-09-05', 2, 0, '₹50,000 – ₹70,000', 'English-speaking guide.', 'new', '/destinations/udaipur', '2026-07-03T12:00:00Z'),
  ('44444444-4444-4444-4444-444444444004', 'Rahul Mehta', '+91 87654 32109', 'rahul.m@gmail.com', 'Jaipur', '2026-08-10', 6, 2, '₹2,00,000+', 'Family reunion.', 'converted', '/destinations/jaipur', '2026-07-02T08:00:00Z'),
  ('44444444-4444-4444-4444-444444444005', 'Kavita Nair', '+91 99876 54321', 'kavita.nair@gmail.com', 'Ranthambore', '2026-12-01', 2, 0, '₹30,000 – ₹45,000', 'Safari for 2 days.', 'new', '/packages/wildlife', '2026-07-04T06:15:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO blog_categories (id, name, slug) VALUES
  ('55555555-5555-5555-5555-555555555001', 'Travel Tips', 'travel-tips'),
  ('55555555-5555-5555-5555-555555555002', 'Destinations', 'destinations'),
  ('55555555-5555-5555-5555-555555555003', 'Culture & Heritage', 'culture-heritage')
ON CONFLICT (id) DO NOTHING;

INSERT INTO blog_tags (id, name, slug) VALUES
  ('66666666-6666-6666-6666-666666666001', 'Rajasthan', 'rajasthan'),
  ('66666666-6666-6666-6666-666666666002', 'Wildlife', 'wildlife'),
  ('66666666-6666-6666-6666-666666666003', 'Heritage', 'heritage'),
  ('66666666-6666-6666-6666-666666666004', 'Desert Safari', 'desert-safari')
ON CONFLICT (id) DO NOTHING;

INSERT INTO blogs (id, title, slug, featured_image_url, content_html, meta_title, meta_description, keywords, category_id, status, publish_date, created_at, updated_at) VALUES
  ('77777777-7777-7777-7777-777777777001', 'Top 10 Must-Visit Forts in Rajasthan', 'top-10-forts-rajasthan', 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800', '<p>Discover the magnificent forts...</p>', 'Top 10 Forts | Travel Days', 'Explore Amber Fort, Mehrangarh...', ARRAY['forts','rajasthan'], '55555555-5555-5555-5555-555555555002', 'published', '2026-06-15T10:00:00Z', '2026-06-10T08:00:00Z', '2026-06-15T10:00:00Z'),
  ('77777777-7777-7777-7777-777777777002', 'Best Time to Visit Jaisalmer Desert', 'best-time-visit-jaisalmer', 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800', '<p>Plan your desert safari...</p>', 'Best Time Jaisalmer | Travel Days', 'October to March is ideal.', ARRAY['jaisalmer','desert'], '55555555-5555-5555-5555-555555555001', 'published', '2026-06-20T10:00:00Z', '2026-06-18T08:00:00Z', '2026-06-20T10:00:00Z'),
  ('77777777-7777-7777-7777-777777777003', 'Rajasthan Food Guide', 'rajasthan-food-guide', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800', '<p>From dal baati churma...</p>', 'Food Guide | Travel Days', 'Must-try Rajasthani dishes.', ARRAY['food','culture'], '55555555-5555-5555-5555-555555555003', 'draft', NULL, '2026-07-01T08:00:00Z', '2026-07-02T14:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO blog_tag_map (blog_id, tag_id) VALUES
  ('77777777-7777-7777-7777-777777777001', '66666666-6666-6666-6666-666666666001'),
  ('77777777-7777-7777-7777-777777777001', '66666666-6666-6666-6666-666666666003'),
  ('77777777-7777-7777-7777-777777777002', '66666666-6666-6666-6666-666666666004'),
  ('77777777-7777-7777-7777-777777777002', '66666666-6666-6666-6666-666666666001'),
  ('77777777-7777-7777-7777-777777777003', '66666666-6666-6666-6666-666666666001')
ON CONFLICT DO NOTHING;

INSERT INTO whatsapp_leads (id, customer_name, phone, selected_package, destination, source_page, landing_url, created_at, synced_to_crm) VALUES
  ('88888888-8888-8888-8888-888888888001', 'Priya Sharma', '+91 98765 43210', '5 Days Golden Triangle', 'Delhi · Agra · Jaipur', '/packages/golden-triangle', 'https://traveldaysrajasthan.com/packages/golden-triangle?utm=google', '2026-07-04T09:15:00Z', true),
  ('88888888-8888-8888-8888-888888888002', NULL, '+91 87654 32109', '3 Days Jaipur Heritage Tour', 'Jaipur', '/destinations/jaipur', 'https://traveldaysrajasthan.com/destinations/jaipur', '2026-07-04T08:50:00Z', true),
  ('88888888-8888-8888-8888-888888888003', 'Anita Desai', '+91 76543 21098', '4 Days Jaisalmer Desert Safari', 'Jaisalmer', '/packages/desert-safari', 'https://traveldaysrajasthan.com/packages/desert-safari?utm=instagram', '2026-07-03T16:45:00Z', false),
  ('88888888-8888-8888-8888-888888888004', 'James Wilson', '+44 7700 900123', '3 Days Udaipur Lakes & Palaces', 'Udaipur', '/destinations/udaipur', 'https://traveldaysrajasthan.com/destinations/udaipur?utm=facebook', '2026-07-03T11:30:00Z', true)
ON CONFLICT (id) DO NOTHING;
