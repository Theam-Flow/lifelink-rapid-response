-- Add enhanced GPS fields to sos_signals table
ALTER TABLE public.sos_signals 
  ADD COLUMN IF NOT EXISTS altitude_meters DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS altitude_accuracy_meters DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS heading_degrees DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS speed_mps DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gps_timestamp TIMESTAMPTZ;

-- Add enhanced GPS fields to rescuer_activity table for real-time tracking
ALTER TABLE public.rescuer_activity
  ADD COLUMN IF NOT EXISTS altitude_meters DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS altitude_accuracy_meters DOUBLE PRECISION;

-- Create spatial index for 3D location queries (including altitude)
CREATE INDEX IF NOT EXISTS idx_sos_signals_altitude ON public.sos_signals(altitude_meters) WHERE altitude_meters IS NOT NULL;

-- Add comment explaining the enhanced precision fields
COMMENT ON COLUMN public.sos_signals.altitude_meters IS 'Altitude in meters above sea level for precise 3D location';
COMMENT ON COLUMN public.sos_signals.altitude_accuracy_meters IS 'Vertical precision in meters';
COMMENT ON COLUMN public.sos_signals.heading_degrees IS 'Direction of movement (0-360 degrees)';
COMMENT ON COLUMN public.sos_signals.speed_mps IS 'Speed in meters per second';
COMMENT ON COLUMN public.sos_signals.gps_timestamp IS 'Exact timestamp of GPS reading for maximum precision';