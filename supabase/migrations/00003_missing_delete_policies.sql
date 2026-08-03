-- =============================================
-- MISSING DELETE POLICIES
-- The app exposes DELETE endpoints for these tables, but 00001 never
-- created DELETE policies for them. With RLS enabled and no policy,
-- deletes silently affect 0 rows (Supabase reports success), so
-- deleting a student/staff/fee config/inventory item from the UI
-- appeared to work but never removed anything.
-- =============================================

CREATE POLICY "Authenticated users can delete" ON students FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON staff FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON fee_configs FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON inventory_items FOR DELETE TO authenticated USING (true);
