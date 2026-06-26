-- missing_persons: keep a findable public-ish board (identifying info visible to
-- every logged-in user, so anyone can recognize/help) WITHOUT exposing the
-- sensitive columns — contact_phone, medical_conditions, and precise GPS
-- (last_seen_location / found_location) — to non-responders.
--
-- RLS cannot column-mask, so we (1) restrict the base table to the reporter +
-- rescuers + admins, and (2) expose a safe-column VIEW to authenticated users
-- for the board. The view is owner-run (security definer semantics) so it can
-- read the base rows, but it only ever selects non-sensitive columns.

-- 1) Lock the base table (full rows incl. phone / medical / exact GPS)
DROP POLICY IF EXISTS "missing_select" ON public.missing_persons;
DROP POLICY IF EXISTS "missing_persons_select_protected" ON public.missing_persons;
DROP POLICY IF EXISTS "missing_persons_select" ON public.missing_persons;

CREATE POLICY "missing_persons_select" ON public.missing_persons
FOR SELECT
TO authenticated
USING (
  auth.uid() = reporter_id
  OR public.is_rescuer(auth.uid())
  OR public.is_admin(auth.uid())
);

-- 2) Safe board view (NO contact_phone, medical_conditions, last_seen_location,
--    found_location, reporter_id). Visible to any logged-in user.
DROP VIEW IF EXISTS public.missing_persons_public;
CREATE VIEW public.missing_persons_public AS
SELECT
  id,
  full_name,
  age,
  gender,
  description,
  last_seen_address,
  last_seen_at,
  photo_urls,
  distinctive_features,
  status,
  created_at,
  city,
  height_cm,
  weight_kg,
  hair_color,
  eye_color,
  clothing_description,
  languages_spoken,
  country_code
FROM public.missing_persons;

GRANT SELECT ON public.missing_persons_public TO authenticated;
