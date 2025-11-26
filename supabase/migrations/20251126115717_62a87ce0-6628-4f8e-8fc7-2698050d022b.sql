-- Remove duplicate/old SELECT policy
DROP POLICY IF EXISTS "shelters_select" ON public.shelters;