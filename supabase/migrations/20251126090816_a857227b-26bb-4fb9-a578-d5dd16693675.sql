-- Función optimizada con paginación geográfica
CREATE OR REPLACE FUNCTION get_sos_nearby(
  user_lng DOUBLE PRECISION,
  user_lat DOUBLE PRECISION,
  radius_km INTEGER DEFAULT 50,
  page_size INTEGER DEFAULT 100,
  page_offset INTEGER DEFAULT 0
) RETURNS TABLE(
  id UUID,
  user_id UUID,
  type TEXT,
  severity_level INTEGER,
  status TEXT,
  description TEXT,
  victim_count INTEGER,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  accuracy_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.type::TEXT,
    s.severity_level,
    s.status::TEXT,
    s.description,
    s.victim_count,
    ST_Y(s.location::geometry) as lat,
    ST_X(s.location::geometry) as lng,
    ST_Distance(
      s.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters,
    s.created_at,
    s.accuracy_meters
  FROM sos_signals s
  WHERE ST_DWithin(
    s.location::geography,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    radius_km * 1000
  )
  AND s.status IN ('active', 'acknowledged', 'in_progress')
  ORDER BY s.severity_level DESC, distance_meters ASC
  LIMIT page_size OFFSET page_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Función de clustering en PostgreSQL
CREATE OR REPLACE FUNCTION get_clustered_sos(
  min_lng DOUBLE PRECISION,
  min_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  cluster_distance DOUBLE PRECISION
) RETURNS TABLE(
  cluster_id INTEGER,
  centroid_lng DOUBLE PRECISION,
  centroid_lat DOUBLE PRECISION,
  point_count INTEGER,
  max_severity INTEGER,
  representative_id UUID,
  representative_type TEXT,
  representative_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH clustered AS (
    SELECT 
      ST_ClusterDBSCAN(location::geometry, eps := cluster_distance, minpoints := 1) OVER () AS cluster_id,
      s.*
    FROM sos_signals s
    WHERE s.location::geometry && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
      AND s.status IN ('active', 'acknowledged', 'in_progress')
  )
  SELECT 
    c.cluster_id,
    ST_X(ST_Centroid(ST_Collect(c.location::geometry))) as centroid_lng,
    ST_Y(ST_Centroid(ST_Collect(c.location::geometry))) as centroid_lat,
    COUNT(*)::INTEGER as point_count,
    MAX(c.severity_level) as max_severity,
    (array_agg(c.id ORDER BY c.severity_level DESC))[1] as representative_id,
    (array_agg(c.type::TEXT ORDER BY c.severity_level DESC))[1] as representative_type,
    (array_agg(c.status::TEXT ORDER BY c.severity_level DESC))[1] as representative_status
  FROM clustered c
  WHERE c.cluster_id IS NOT NULL
  GROUP BY c.cluster_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Índice compuesto optimizado para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_sos_active_severity_location 
ON sos_signals (status, severity_level DESC) 
WHERE status IN ('active', 'acknowledged', 'in_progress');

-- Índice espacial con filtro de status activo
CREATE INDEX IF NOT EXISTS idx_sos_location_active 
ON sos_signals USING GIST (location) 
WHERE status IN ('active', 'acknowledged', 'in_progress');

-- Índice para rescuer_activity optimizado
CREATE INDEX IF NOT EXISTS idx_rescuer_location_active 
ON rescuer_activity USING GIST (location) 
WHERE status = 'available';

-- Índice para mensajes por SOS
CREATE INDEX IF NOT EXISTS idx_messages_sos_created 
ON messages (sos_id, created_at DESC) 
WHERE sos_id IS NOT NULL;