-- Create messages table for coordination chat
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sos_id UUID REFERENCES sos_signals(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'location', 'system')),
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rescuers can view messages"
ON public.messages FOR SELECT
USING (is_rescuer(auth.uid()));

CREATE POLICY "Users can view their SOS messages"
ON public.messages FOR SELECT
USING (
  sos_id IN (
    SELECT id FROM sos_signals WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Update resources table
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS available_now BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS volunteer_operator TEXT,
ADD COLUMN IF NOT EXISTS last_maintenance TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

-- Create resource requests table
CREATE TABLE IF NOT EXISTS public.resource_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sos_id UUID NOT NULL REFERENCES sos_signals(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'delivered', 'cancelled')),
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resource_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rescuers can view resource requests"
ON public.resource_requests FOR SELECT
USING (is_rescuer(auth.uid()));

CREATE POLICY "Rescuers can create resource requests"
ON public.resource_requests FOR INSERT
WITH CHECK (is_rescuer(auth.uid()) AND auth.uid() = requested_by);

CREATE POLICY "Resource owners can update requests"
ON public.resource_requests FOR UPDATE
USING (
  is_rescuer(auth.uid()) AND (
    auth.uid() = requested_by OR
    resource_id IN (SELECT id FROM resources WHERE owner_id = auth.uid())
  )
);

-- Create incident reports table
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sos_id UUID NOT NULL REFERENCES sos_signals(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response_time_minutes INTEGER,
  victims_rescued INTEGER,
  resources_used JSONB DEFAULT '[]'::jsonb,
  outcome TEXT CHECK (outcome IN ('successful', 'partial', 'failed', 'false_alarm')),
  notes TEXT,
  photos TEXT[],
  lessons_learned TEXT
);

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rescuers can view incident reports"
ON public.incident_reports FOR SELECT
USING (is_rescuer(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Rescuers can create incident reports"
ON public.incident_reports FOR INSERT
WITH CHECK (is_rescuer(auth.uid()) AND auth.uid() = reported_by);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_messages_sos_id ON messages(sos_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_requests_sos_id ON resource_requests(sos_id);
CREATE INDEX IF NOT EXISTS idx_resource_requests_status ON resource_requests(status);
CREATE INDEX IF NOT EXISTS idx_incident_reports_created_at ON incident_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rescuer_activity_status ON rescuer_activity(status) WHERE status = 'available';

-- Update rescuer_activity for tracking
ALTER TABLE public.rescuer_activity 
ADD COLUMN IF NOT EXISTS last_ping TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS heading NUMERIC,
ADD COLUMN IF NOT EXISTS speed_kmh NUMERIC;