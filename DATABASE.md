# 🗄️ Database Documentation

## Overview

LifeLink Asia uses PostgreSQL 15 with PostGIS extension for geospatial capabilities, hosted on Supabase.

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐
│  profiles   │
│─────────────│
│ id (PK)     │────┐
│ full_name   │    │
│ phone       │    │
│ role        │    │
│ status      │    │
│ location    │    │
└─────────────┘    │
                   │
         ┌─────────┴────────┬───────────────┐
         │                  │               │
         ▼                  ▼               ▼
┌─────────────────┐  ┌─────────────┐  ┌──────────────────┐
│  sos_signals    │  │  messages   │  │ missing_persons  │
│─────────────────│  │─────────────│  │──────────────────│
│ id (PK)         │  │ id (PK)     │  │ id (PK)          │
│ user_id (FK)    │  │ user_id(FK) │  │ reporter_id (FK) │
│ location        │  │ sos_id (FK) │  │ full_name        │
│ type            │  │ content     │  │ last_seen_loc    │
│ severity_level  │  │ created_at  │  │ photo_urls[]     │
│ status          │  └─────────────┘  └──────────────────┘
│ victim_count    │
└─────────────────┘
         │
         ├──────────────┬─────────────────┐
         ▼              ▼                 ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│incident_reports │ │  resources   │ │rescuer_activity  │
│─────────────────│ │──────────────│ │──────────────────│
│ id (PK)         │ │ id (PK)      │ │ id (PK)          │
│ sos_id (FK)     │ │ owner_id(FK) │ │ rescuer_id (FK)  │
│ reported_by(FK) │ │ type         │ │ current_sos(FK)  │
│ outcome         │ │ location     │ │ location         │
│ photos[]        │ │ status       │ │ status           │
└─────────────────┘ └──────────────┘ └──────────────────┘
```

## Table Definitions

### profiles

Stores user account information and current status.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  full_name TEXT NOT NULL,
  phone TEXT,
  line_id TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('victim', 'rescuer', 'admin', 'medical', 'logistics', 'shelter_manager')),
  status TEXT CHECK (status IN ('safe', 'danger', 'missing', 'deceased', 'unknown')),
  country_code TEXT CHECK (country_code IN ('TH', 'VN', 'MY', 'ID')),
  last_seen_location GEOGRAPHY(POINT, 4326),
  location_accuracy_meters NUMERIC,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_active TIMESTAMPTZ,
  skills JSONB
);

-- Indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_location ON profiles USING GIST(last_seen_location);
```

**Fields:**
- `id`: User UUID from Supabase Auth
- `full_name`: User's display name
- `role`: User's role in the system
- `status`: Current safety status
- `last_seen_location`: PostGIS geography point
- `skills`: JSON array of rescuer skills

### sos_signals

Emergency distress signals from victims.

```sql
CREATE TABLE sos_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  accuracy_meters NUMERIC,
  altitude_meters NUMERIC,
  altitude_accuracy_meters NUMERIC,
  heading_degrees NUMERIC,
  speed_mps NUMERIC,
  gps_timestamp TIMESTAMPTZ,
  type TEXT NOT NULL CHECK (type IN (
    'flood_trap', 'medical_emergency', 'food_water', 
    'evacuation', 'power_outage', 'structural_collapse', 
    'fire', 'other'
  )),
  severity_level INTEGER NOT NULL CHECK (severity_level BETWEEN 1 AND 5),
  victim_count INTEGER DEFAULT 1,
  description TEXT,
  photo_url TEXT,
  contact_phone TEXT,
  contact_line_id TEXT,
  special_needs JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN (
    'active', 'acknowledged', 'in_progress', 'rescued', 
    'cancelled', 'false_alarm'
  )),
  assigned_rescuer_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  in_progress_at TIMESTAMPTZ,
  rescued_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_sos_status ON sos_signals(status);
CREATE INDEX idx_sos_type ON sos_signals(type);
CREATE INDEX idx_sos_severity ON sos_signals(severity_level DESC);
CREATE INDEX idx_sos_created ON sos_signals(created_at DESC);
CREATE INDEX idx_sos_location ON sos_signals USING GIST(location);
CREATE INDEX idx_sos_active ON sos_signals(status, created_at) 
  WHERE status IN ('active', 'acknowledged', 'in_progress');
```

**Fields:**
- `location`: PostGIS geography point (lat/lng)
- `type`: Emergency category
- `severity_level`: 1=Low to 5=Critical
- `status`: Current state of emergency
- `special_needs`: JSON for medical conditions, etc.

### shelters

Emergency evacuation centers and temporary shelters.

```sql
CREATE TABLE shelters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'temple', 'school', 'hospital', 'high_ground', 
    'community_center', 'sports_complex'
  )),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address TEXT,
  country_code TEXT CHECK (country_code IN ('TH', 'VN', 'MY', 'ID')),
  contact_phone TEXT,
  capacity_max INTEGER,
  capacity_current INTEGER DEFAULT 0,
  manager_id UUID REFERENCES profiles(id),
  supplies_status JSONB,
  photo_urls TEXT[],
  notes TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_shelters_type ON shelters(type);
CREATE INDEX idx_shelters_location ON shelters USING GIST(location);
CREATE INDEX idx_shelters_verified ON shelters(is_verified);
```

**supplies_status JSON structure:**
```json
{
  "water": {"available": true, "quantity": 1000, "unit": "liters"},
  "food": {"available": true, "quantity": 500, "unit": "meals"},
  "medical": {"available": true, "quantity": 50, "unit": "kits"},
  "blankets": {"available": true, "quantity": 200, "unit": "pieces"}
}
```

### missing_persons

Registry of people reported missing during disasters.

```sql
CREATE TABLE missing_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  height_cm INTEGER,
  weight_kg INTEGER,
  hair_color TEXT,
  eye_color TEXT,
  city TEXT,
  last_seen_at TIMESTAMPTZ,
  last_seen_location GEOGRAPHY(POINT, 4326),
  last_seen_address TEXT,
  clothing_description TEXT,
  distinctive_features TEXT,
  medical_conditions TEXT,
  languages_spoken TEXT[],
  photo_urls TEXT[],
  description TEXT,
  contact_phone TEXT,
  country_code TEXT CHECK (country_code IN ('TH', 'VN', 'MY', 'ID')),
  status TEXT DEFAULT 'missing' CHECK (status IN (
    'safe', 'danger', 'missing', 'deceased', 'unknown'
  )),
  found_at TIMESTAMPTZ,
  found_location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_missing_status ON missing_persons(status);
CREATE INDEX idx_missing_created ON missing_persons(created_at DESC);
CREATE INDEX idx_missing_location ON missing_persons USING GIST(last_seen_location);
CREATE INDEX idx_missing_city ON missing_persons(city);
```

### messages

Real-time chat messages linked to SOS signals.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  sos_id UUID REFERENCES sos_signals(id),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'location', 'system')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_messages_sos ON messages(sos_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id, created_at DESC);
```

### resources

Registry of rescue equipment and supplies.

```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'boat_small', 'boat_large', '4x4_truck', 'helicopter', 
    'drone', 'generator', 'food_stock', 'medical_kit', 'water_supply'
  )),
  current_location GEOGRAPHY(POINT, 4326) NOT NULL,
  capacity INTEGER,
  license_plate TEXT,
  volunteer_operator TEXT,
  contact_info TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN (
    'available', 'busy', 'out_of_fuel', 'maintenance', 'offline'
  )),
  available_now BOOLEAN DEFAULT true,
  last_maintenance TIMESTAMPTZ,
  photo_urls TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_location ON resources USING GIST(current_location);
CREATE INDEX idx_resources_available ON resources(available_now, status);
```

### rescuer_activity

Real-time tracking of active rescuers.

```sql
CREATE TABLE rescuer_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rescuer_id UUID REFERENCES profiles(id) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  altitude_meters NUMERIC,
  altitude_accuracy_meters NUMERIC,
  heading NUMERIC,
  speed_kmh NUMERIC,
  status TEXT DEFAULT 'available' CHECK (status IN (
    'available', 'busy', 'out_of_fuel', 'maintenance', 'offline'
  )),
  current_sos_id UUID REFERENCES sos_signals(id),
  timestamp TIMESTAMPTZ DEFAULT now(),
  last_ping TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_rescuer_activity_rescuer ON rescuer_activity(rescuer_id);
CREATE INDEX idx_rescuer_activity_status ON rescuer_activity(status);
CREATE INDEX idx_rescuer_activity_location ON rescuer_activity USING GIST(location);
CREATE INDEX idx_rescuer_activity_sos ON rescuer_activity(current_sos_id);
```

## Custom Functions

### get_sos_nearby

Find SOS signals within a radius of a location.

```sql
CREATE OR REPLACE FUNCTION get_sos_nearby(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 50,
  page_size INTEGER DEFAULT 50,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  type TEXT,
  severity_level INTEGER,
  victim_count INTEGER,
  status TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  accuracy_meters NUMERIC,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    ST_Y(s.location::geometry) as lat,
    ST_X(s.location::geometry) as lng,
    s.type,
    s.severity_level,
    s.victim_count,
    s.status,
    s.description,
    s.created_at,
    s.accuracy_meters,
    ST_Distance(
      s.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters
  FROM sos_signals s
  WHERE 
    ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
    AND s.status IN ('active', 'acknowledged', 'in_progress')
  ORDER BY distance_meters ASC
  LIMIT page_size
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;
```

### get_clustered_sos

Cluster SOS signals for efficient map rendering.

```sql
CREATE OR REPLACE FUNCTION get_clustered_sos(
  min_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  cluster_distance DOUBLE PRECISION DEFAULT 100
)
RETURNS TABLE (
  cluster_id INTEGER,
  centroid_lat DOUBLE PRECISION,
  centroid_lng DOUBLE PRECISION,
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
      s.*,
      ST_ClusterDBSCAN(s.location::geometry, cluster_distance, 1) OVER() as cluster
    FROM sos_signals s
    WHERE 
      ST_Intersects(
        s.location::geometry,
        ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
      )
      AND s.status IN ('active', 'acknowledged', 'in_progress')
  ),
  cluster_stats AS (
    SELECT 
      cluster as cluster_id,
      ST_Y(ST_Centroid(ST_Collect(location::geometry))) as centroid_lat,
      ST_X(ST_Centroid(ST_Collect(location::geometry))) as centroid_lng,
      COUNT(*) as point_count,
      MAX(severity_level) as max_severity,
      (ARRAY_AGG(id ORDER BY severity_level DESC, created_at DESC))[1] as representative_id
    FROM clustered
    GROUP BY cluster
  )
  SELECT 
    cs.cluster_id::INTEGER,
    cs.centroid_lat,
    cs.centroid_lng,
    cs.point_count::INTEGER,
    cs.max_severity::INTEGER,
    cs.representative_id,
    c.type as representative_type,
    c.status as representative_status
  FROM cluster_stats cs
  JOIN clustered c ON c.id = cs.representative_id;
END;
$$ LANGUAGE plpgsql;
```

## Row Level Security (RLS)

### Example Policies

```sql
-- Profiles: Users can only update their own profile
CREATE POLICY "Users can view all profiles"
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE USING (auth.uid() = id);

-- SOS Signals: Public read, authenticated write
CREATE POLICY "SOS signals are viewable by everyone"
ON sos_signals FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create SOS"
ON sos_signals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SOS"
ON sos_signals FOR UPDATE 
USING (auth.uid() = user_id);

-- Messages: Users can see messages for their SOS signals
CREATE POLICY "Users can view relevant messages"
ON messages FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM sos_signals WHERE id = messages.sos_id
    UNION
    SELECT assigned_rescuer_id FROM sos_signals WHERE id = messages.sos_id
  )
  OR auth.uid() = user_id
);

-- Shelters: Public read, managers can update
CREATE POLICY "Shelters are viewable by everyone"
ON shelters FOR SELECT USING (true);

CREATE POLICY "Shelter managers can update"
ON shelters FOR UPDATE 
USING (auth.uid() = manager_id);
```

## Migrations

Database migrations are managed in `supabase/migrations/` directory.

### Creating a Migration

```bash
# Generate a new migration file
supabase migration new add_new_feature

# Edit the generated SQL file
# Apply migration
supabase db push
```

## Backup & Recovery

### Automated Backups

- Daily automated backups (7-day retention)
- Point-in-time recovery available
- Backups stored across multiple availability zones

### Manual Backup

```bash
# Export entire database
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql

# Export specific table
pg_dump -h db.xxx.supabase.co -U postgres -d postgres -t sos_signals > sos_backup.sql
```

### Restore

```bash
# Restore from backup
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

## Performance Tips

1. **Use spatial indexes** for all geography columns
2. **Limit result sets** with pagination
3. **Use prepared statements** for repeated queries
4. **Monitor slow queries** via Supabase dashboard
5. **Use connection pooling** (handled by Supabase)

## Monitoring

Track these metrics:
- Query execution time
- Active connections
- Database size
- Index usage
- Cache hit ratio

Access via Supabase Dashboard → Database → Statistics

---

**Last Updated**: January 2025  
**Database Version**: PostgreSQL 15 + PostGIS 3.3  
**Maintainer**: @withkevinm
