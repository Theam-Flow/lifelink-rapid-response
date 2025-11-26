-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "sos_select" ON sos_signals;

-- Create a new policy that allows everyone to see active SOS signals
CREATE POLICY "sos_select" ON sos_signals
  FOR SELECT
  USING (
    -- Users can always see their own SOS
    (auth.uid() = user_id) 
    OR 
    -- Everyone (even unauthenticated) can see active, acknowledged, or in_progress SOS
    (status IN ('active', 'acknowledged', 'in_progress'))
    OR 
    -- Rescuers can see all SOS
    is_rescuer(auth.uid())
  );