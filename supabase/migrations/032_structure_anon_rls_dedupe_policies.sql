-- Company Structure: allow anon (same pattern as policies/categories/inclusions).
-- The admin app uses the Supabase anon key with app-level RBAC, not always Auth sessions.
DROP POLICY IF EXISTS "anon_all_company_structure" ON td_company_structure;
CREATE POLICY "anon_all_company_structure" ON td_company_structure
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Remove duplicate master policy lines (same section + title), keep oldest
DELETE FROM td_master_policies p
USING td_master_policies newer
WHERE p.section = newer.section
  AND trim(p.title) = trim(newer.title)
  AND (
    p.created_at > newer.created_at
    OR (p.created_at = newer.created_at AND p.id::text > newer.id::text)
  );
