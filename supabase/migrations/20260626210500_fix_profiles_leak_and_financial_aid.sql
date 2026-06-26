-- CORRECTIVE migration. The earlier 20260626210000 was INERT: it recreated a
-- policy named "profiles_select", but the policy actually keeping profiles open
-- is "Anyone can view all profile info" USING(true) (migration 094852), which has
-- no TO clause (=> role public => readable by the anon key shipped in the JS
-- bundle, no login required). Postgres ORs permissive policies, so that open
-- policy neutralized the restrictive one. This migration drops EVERY open SELECT
-- policy on profiles and leaves a single restrictive one.

-- ── profiles ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view all profile info" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view public profile info" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "Users can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Your own profile
  auth.uid() = id
  -- Rescuers and admins coordinate the response and need to see everyone
  OR public.is_rescuer(auth.uid())
  OR public.is_admin(auth.uid())
  -- Anyone can see the contact details of a person with an OPEN SOS,
  -- so anyone can go help them. Disappears once the SOS leaves active/acknowledged.
  OR EXISTS (
    SELECT 1 FROM public.sos_signals s
    WHERE s.user_id = public.profiles.id
      AND s.status IN ('active', 'acknowledged')
  )
  -- A victim can see the profile (name + contact) of the rescuer assigned to
  -- THEIR own open SOS — without exposing every rescuer's location to everyone.
  OR EXISTS (
    SELECT 1 FROM public.sos_signals s
    WHERE s.assigned_rescuer_id = public.profiles.id
      AND s.user_id = auth.uid()
      AND s.status IN ('active', 'acknowledged', 'in_progress')
  )
);

-- ── financial_aid ───────────────────────────────────────────────────────────
-- "Public can view financial aid stories" had no TO clause => anon could read
-- bank_name / account_number / account_name of every active case. No UI reads
-- this table yet, so restricting to the recipient + admins breaks nothing.
DROP POLICY IF EXISTS "Public can view financial aid stories" ON public.financial_aid;
DROP POLICY IF EXISTS "financial_select" ON public.financial_aid;
DROP POLICY IF EXISTS "financial_aid_select_public" ON public.financial_aid;

CREATE POLICY "financial_aid_select_own_admin" ON public.financial_aid
FOR SELECT
TO authenticated
USING (
  auth.uid() = recipient_id
  OR public.is_admin(auth.uid())
);
