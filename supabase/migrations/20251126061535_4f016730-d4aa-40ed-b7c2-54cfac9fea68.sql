-- Update RLS policy to allow all authenticated users to see active SOS signals
DROP POLICY IF EXISTS "sos_select" ON public.sos_signals;

CREATE POLICY "sos_select" ON public.sos_signals
FOR SELECT
USING (
  -- User can see their own SOS
  (auth.uid() = user_id)
  OR 
  -- All authenticated users can see active/acknowledged SOS
  (status IN ('active', 'acknowledged') AND auth.uid() IS NOT NULL)
  OR 
  -- Rescuers can see all SOS
  is_rescuer(auth.uid())
);