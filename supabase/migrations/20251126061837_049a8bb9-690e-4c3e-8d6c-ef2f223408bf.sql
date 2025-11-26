-- Create function to extract coordinates from PostGIS geometry
CREATE OR REPLACE FUNCTION get_sos_coordinates(sos_id uuid)
RETURNS TABLE (lng double precision, lat double precision)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    ST_X(location::geometry) as lng,
    ST_Y(location::geometry) as lat
  FROM sos_signals
  WHERE id = sos_id;
$$;