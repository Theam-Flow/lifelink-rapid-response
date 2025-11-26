-- ============================================================
-- LIFELINK ASIA - SISTEMA DE GESTIÓN DE DESASTRES
-- Schema Completo con PostGIS, RLS y Seguridad Máxima
-- ============================================================

-- Habilitar extensiones críticas
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TIPOS ENUM
-- ============================================================

CREATE TYPE user_role AS ENUM ('victim', 'rescuer', 'admin', 'medical', 'logistics', 'shelter_manager');
CREATE TYPE user_status AS ENUM ('safe', 'danger', 'missing', 'deceased', 'unknown');
CREATE TYPE country_code AS ENUM ('TH', 'VN', 'MY', 'ID');
CREATE TYPE sos_status AS ENUM ('active', 'acknowledged', 'in_progress', 'rescued', 'cancelled', 'false_alarm');
CREATE TYPE emergency_type AS ENUM ('flood_trap', 'medical_emergency', 'food_water', 'evacuation', 'power_outage', 'structural_collapse', 'fire', 'other');
CREATE TYPE resource_type AS ENUM ('boat_small', 'boat_large', '4x4_truck', 'helicopter', 'drone', 'generator', 'food_stock', 'medical_kit', 'water_supply');
CREATE TYPE resource_status AS ENUM ('available', 'busy', 'out_of_fuel', 'maintenance', 'offline');
CREATE TYPE shelter_type AS ENUM ('temple', 'school', 'hospital', 'high_ground', 'community_center', 'sports_complex');

-- ============================================================
-- TABLA DE PERFILES
-- ============================================================

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  phone TEXT,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'victim',
  status user_status DEFAULT 'unknown',
  country_code country_code DEFAULT 'TH',
  skills JSONB DEFAULT '{}',
  verified BOOLEAN DEFAULT FALSE,
  last_seen_location GEOGRAPHY(POINT),
  location_accuracy_meters FLOAT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT phone_format CHECK (phone ~ '^\+[0-9]{10,15}$' OR phone IS NULL)
);

CREATE INDEX idx_profiles_location ON public.profiles USING GIST(last_seen_location);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_profiles_country ON public.profiles(country_code);
CREATE INDEX idx_profiles_full_name_trgm ON public.profiles USING GIN(full_name gin_trgm_ops);

-- ============================================================
-- TABLA DE SEÑALES SOS
-- ============================================================

CREATE TABLE public.sos_signals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  location GEOGRAPHY(POINT) NOT NULL,
  accuracy_meters FLOAT CHECK (accuracy_meters >= 0),
  severity_level INT CHECK (severity_level BETWEEN 1 AND 5) NOT NULL,
  type emergency_type NOT NULL,
  description TEXT,
  photo_url TEXT,
  victim_count INT DEFAULT 1 CHECK (victim_count > 0),
  special_needs JSONB DEFAULT '{}',
  status sos_status DEFAULT 'active',
  assigned_rescuer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  in_progress_at TIMESTAMP WITH TIME ZONE,
  rescued_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sos_location ON public.sos_signals USING GIST(location);
CREATE INDEX idx_sos_status ON public.sos_signals(status);
CREATE INDEX idx_sos_severity ON public.sos_signals(severity_level DESC);
CREATE INDEX idx_sos_type ON public.sos_signals(type);
CREATE INDEX idx_sos_created_at ON public.sos_signals(created_at DESC);
CREATE INDEX idx_sos_assigned_rescuer ON public.sos_signals(assigned_rescuer_id);
CREATE INDEX idx_sos_user_id ON public.sos_signals(user_id);

-- ============================================================
-- TABLA DE RECURSOS
-- ============================================================

CREATE TABLE public.resources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type resource_type NOT NULL,
  name TEXT NOT NULL,
  capacity INT CHECK (capacity > 0),
  current_location GEOGRAPHY(POINT) NOT NULL,
  status resource_status DEFAULT 'available',
  contact_info TEXT,
  license_plate TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_resources_location ON public.resources USING GIST(current_location);
CREATE INDEX idx_resources_status ON public.resources(status);
CREATE INDEX idx_resources_type ON public.resources(type);
CREATE INDEX idx_resources_owner ON public.resources(owner_id);

-- ============================================================
-- TABLA DE REFUGIOS
-- ============================================================

CREATE TABLE public.shelters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type shelter_type NOT NULL,
  location GEOGRAPHY(POINT) NOT NULL,
  address TEXT,
  capacity_max INT CHECK (capacity_max > 0),
  capacity_current INT DEFAULT 0 CHECK (capacity_current >= 0),
  supplies_status JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  contact_phone TEXT,
  notes TEXT,
  country_code country_code DEFAULT 'TH',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT capacity_check CHECK (capacity_current <= capacity_max)
);

CREATE INDEX idx_shelters_location ON public.shelters USING GIST(location);
CREATE INDEX idx_shelters_country ON public.shelters(country_code);
CREATE INDEX idx_shelters_verified ON public.shelters(is_verified);
CREATE INDEX idx_shelters_capacity ON public.shelters(capacity_current, capacity_max);

-- ============================================================
-- TABLA DE PERSONAS DESAPARECIDAS
-- ============================================================

CREATE TABLE public.missing_persons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT,
  full_name TEXT NOT NULL,
  age INT CHECK (age > 0),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  last_seen_location GEOGRAPHY(POINT),
  last_seen_address TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  description TEXT,
  distinctive_features TEXT,
  status user_status DEFAULT 'missing',
  found_at TIMESTAMP WITH TIME ZONE,
  found_location GEOGRAPHY(POINT),
  contact_phone TEXT,
  country_code country_code DEFAULT 'TH',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_missing_location ON public.missing_persons USING GIST(last_seen_location);
CREATE INDEX idx_missing_status ON public.missing_persons(status);
CREATE INDEX idx_missing_name_trgm ON public.missing_persons USING GIN(full_name gin_trgm_ops);
CREATE INDEX idx_missing_country ON public.missing_persons(country_code);

-- ============================================================
-- TABLA DE AYUDA FINANCIERA
-- ============================================================

CREATE TABLE public.financial_aid (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  story_summary TEXT NOT NULL,
  verification_docs_url TEXT,
  total_needed NUMERIC(10,2) CHECK (total_needed > 0),
  total_reported_received NUMERIC(10,2) DEFAULT 0 CHECK (total_reported_received >= 0),
  is_active BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_financial_aid_active ON public.financial_aid(is_active);
CREATE INDEX idx_financial_aid_recipient ON public.financial_aid(recipient_id);

-- ============================================================
-- TABLA DE ACTIVIDAD DE RESCATISTAS
-- ============================================================

CREATE TABLE public.rescuer_activity (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rescuer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  location GEOGRAPHY(POINT) NOT NULL,
  status resource_status DEFAULT 'available',
  current_sos_id UUID REFERENCES public.sos_signals(id) ON DELETE SET NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rescuer_activity_location ON public.rescuer_activity USING GIST(location);
CREATE INDEX idx_rescuer_activity_rescuer ON public.rescuer_activity(rescuer_id);
CREATE INDEX idx_rescuer_activity_timestamp ON public.rescuer_activity(timestamp DESC);

-- ============================================================
-- FUNCIONES DE SEGURIDAD
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_rescuer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role IN ('rescuer', 'admin', 'medical', 'logistics')
  );
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sos_signals_updated_at BEFORE UPDATE ON public.sos_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shelters_updated_at BEFORE UPDATE ON public.shelters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_missing_persons_updated_at BEFORE UPDATE ON public.missing_persons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_aid_updated_at BEFORE UPDATE ON public.financial_aid
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, country_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'),
    COALESCE((NEW.raw_user_meta_data->>'country_code')::country_code, 'TH')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missing_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_aid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescuer_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "sos_select" ON public.sos_signals FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_rescuer(auth.uid()));
CREATE POLICY "sos_insert" ON public.sos_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sos_update" ON public.sos_signals FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_rescuer(auth.uid()));
CREATE POLICY "sos_delete" ON public.sos_signals FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "resources_select" ON public.resources FOR SELECT TO authenticated USING (public.is_rescuer(auth.uid()));
CREATE POLICY "resources_all" ON public.resources FOR ALL TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "shelters_select" ON public.shelters FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "shelters_update" ON public.shelters FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR auth.uid() = manager_id);
CREATE POLICY "shelters_insert" ON public.shelters FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "missing_select" ON public.missing_persons FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "missing_insert" ON public.missing_persons FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "missing_update" ON public.missing_persons FOR UPDATE TO authenticated USING (auth.uid() = reporter_id OR public.is_admin(auth.uid()));

CREATE POLICY "financial_select" ON public.financial_aid FOR SELECT TO authenticated USING (is_active = TRUE OR auth.uid() = recipient_id OR public.is_admin(auth.uid()));
CREATE POLICY "financial_insert" ON public.financial_aid FOR INSERT TO authenticated WITH CHECK (auth.uid() = recipient_id);
CREATE POLICY "financial_update" ON public.financial_aid FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "rescuer_activity_select" ON public.rescuer_activity FOR SELECT TO authenticated USING (public.is_rescuer(auth.uid()));
CREATE POLICY "rescuer_activity_insert" ON public.rescuer_activity FOR INSERT TO authenticated WITH CHECK (auth.uid() = rescuer_id AND public.is_rescuer(auth.uid()));

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('sos-evidence', 'sos-evidence', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('missing-persons', 'missing-persons', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "sos_evidence_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sos-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "sos_evidence_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'sos-evidence' AND public.is_rescuer(auth.uid()));

CREATE POLICY "missing_photos_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'missing-persons');
CREATE POLICY "missing_photos_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'missing-persons');

CREATE POLICY "avatars_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rescuer_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shelters;