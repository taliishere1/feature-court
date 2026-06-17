-- Section edge functions now talk to the DB with the publishable (anon) key
-- instead of a privileged key, so they advance a trial through its stages by
-- UPDATEing the row. Without an explicit anon UPDATE policy those writes pass
-- silently under RLS (0 rows affected), leaving the trial stuck. This grants the
-- missing UPDATE so the per-stage flow can persist prosecution/defense/cross/
-- verdict/summary/ruling. No auth exists in this public app, so the policy is
-- open by design (consistent with the existing SELECT/INSERT policies).
DROP POLICY IF EXISTS "Enable update for anon" ON public.trials;

CREATE POLICY "Enable update for anon" ON public.trials
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
