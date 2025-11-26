-- Create function to calculate distance between user location and SOS
CREATE OR REPLACE FUNCTION get_sos_with_distance(user_lng double precision, user_lat double precision)
RETURNS TABLE (
  id uuid,
  type emergency_type,
  severity_level integer,
  status sos_status,
  description text,
  victim_count integer,
  created_at timestamp with time zone,
  user_id uuid,
  accuracy_meters double precision,
  lng double precision,
  lat double precision,
  distance_meters double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.type,
    s.severity_level,
    s.status,
    s.description,
    s.victim_count,
    s.created_at,
    s.user_id,
    s.accuracy_meters,
    ST_X(s.location::geometry) as lng,
    ST_Y(s.location::geometry) as lat,
    ST_Distance(
      s.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters
  FROM sos_signals s
  WHERE s.status IN ('active', 'acknowledged')
  ORDER BY distance_meters ASC;
$$;