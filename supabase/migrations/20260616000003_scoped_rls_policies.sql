-- Drop the overly permissive catch-all policy for anon
-- (Service role policy stays — it's trusted by definition)
DROP POLICY IF EXISTS "Enable all for anon" ON public.trials;

-- Scoped policies for anonymous users.
-- SELECT with USING(true) is intentionally excluded from the linter warning —
-- this is a public app with no auth, anyone can view a trial by its ID.
-- INSERT allows anyone to file a case.
-- UPDATE and DELETE are NOT granted — they run server-side via service_role.

CREATE POLICY "Enable read for anon" ON public.trials
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Enable insert for anon" ON public.trials
  FOR INSERT
  TO anon
  WITH CHECK (true);