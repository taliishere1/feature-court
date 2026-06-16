-- Allow all operations on trials table for anon key (no auth — public app)
CREATE POLICY "Enable all for anon" ON public.trials
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Also allow the service_role key full access (for Edge Functions)
CREATE POLICY "Enable all for service_role" ON public.trials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);