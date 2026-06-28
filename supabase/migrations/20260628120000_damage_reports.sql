-- First-party structural-damage map (like terremotovenezuela.com), populated by
-- real user reports — buildings/roads damaged by the 2026-06-24 quake. No scraped
-- personal data; reporters consent and only damage location/type/description show.
CREATE TABLE IF NOT EXISTS public.damage_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  location GEOGRAPHY(POINT) NOT NULL,
  address TEXT,
  damage_type TEXT NOT NULL,
  severity INT CHECK (severity BETWEEN 1 AND 5) DEFAULT 3,
  description TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'reported',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "damage_select" ON public.damage_reports
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "damage_insert" ON public.damage_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "damage_update" ON public.damage_reports
  FOR UPDATE TO authenticated USING (auth.uid() = reporter_id OR public.is_admin(auth.uid()));
CREATE POLICY "damage_delete" ON public.damage_reports
  FOR DELETE TO authenticated USING (auth.uid() = reporter_id OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_damage_location ON public.damage_reports USING GIST(location);
ALTER PUBLICATION supabase_realtime ADD TABLE public.damage_reports;
