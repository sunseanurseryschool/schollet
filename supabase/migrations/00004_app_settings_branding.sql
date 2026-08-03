-- =============================================
-- APP SETTINGS (key-value)
-- Stores app-wide configuration such as school branding
-- (name, tagline, address, phone, logo) shown on fee receipts.
-- The logo is stored inline as a data URL so it is included in
-- the JSON backup/export automatically.
-- =============================================

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read" ON app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON app_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON app_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON app_settings FOR DELETE TO authenticated USING (true);

-- Seed default branding
INSERT INTO app_settings (key, value) VALUES (
  'branding',
  '{"school_name": "Sun Sea Nursery School", "tagline": "", "address": "", "phone": "", "logo_data_url": ""}'
);
