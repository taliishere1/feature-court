-- Hygiene: drop the legacy catch-all service_role policy.
-- No edge function uses the service_role/secret key anymore — all DB access goes
-- through the publishable key under the scoped anon SELECT/INSERT/UPDATE policies.
-- (service_role bypasses RLS entirely regardless, so this policy was a no-op;
-- removing it keeps the policy list honest and free of legacy-key references.)
DROP POLICY IF EXISTS "Enable all for service_role" ON public.trials;
