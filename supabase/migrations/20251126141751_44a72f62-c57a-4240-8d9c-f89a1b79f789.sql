-- Create shelter activity logs table for tracking all changes
CREATE TABLE IF NOT EXISTS public.shelter_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_id UUID NOT NULL REFERENCES public.shelters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('capacity_update', 'supply_update', 'info_update', 'photo_added', 'photo_removed', 'check_in', 'check_out', 'alert_created', 'status_change')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_shelter_activity_logs_shelter_id ON public.shelter_activity_logs(shelter_id);
CREATE INDEX idx_shelter_activity_logs_created_at ON public.shelter_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.shelter_activity_logs ENABLE ROW LEVEL SECURITY;

-- Managers can view logs for their shelters
CREATE POLICY "Managers can view their shelter logs"
ON public.shelter_activity_logs
FOR SELECT
USING (
  shelter_id IN (
    SELECT id FROM public.shelters WHERE manager_id = auth.uid()
  )
);

-- System can insert logs (anyone authenticated can create logs for now, will be controlled by app logic)
CREATE POLICY "Authenticated users can create logs"
ON public.shelter_activity_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create shelter alerts table
CREATE TABLE IF NOT EXISTS public.shelter_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelter_id UUID NOT NULL REFERENCES public.shelters(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_capacity', 'critical_supply', 'maintenance_needed', 'custom')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
  title TEXT NOT NULL,
  description TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index
CREATE INDEX idx_shelter_alerts_shelter_id ON public.shelter_alerts(shelter_id);
CREATE INDEX idx_shelter_alerts_is_resolved ON public.shelter_alerts(is_resolved);

-- Enable RLS
ALTER TABLE public.shelter_alerts ENABLE ROW LEVEL SECURITY;

-- Managers can view and manage their shelter alerts
CREATE POLICY "Managers can view their shelter alerts"
ON public.shelter_alerts
FOR SELECT
USING (
  shelter_id IN (
    SELECT id FROM public.shelters WHERE manager_id = auth.uid()
  )
);

CREATE POLICY "Managers can create alerts for their shelters"
ON public.shelter_alerts
FOR INSERT
WITH CHECK (
  shelter_id IN (
    SELECT id FROM public.shelters WHERE manager_id = auth.uid()
  )
);

CREATE POLICY "Managers can update their shelter alerts"
ON public.shelter_alerts
FOR UPDATE
USING (
  shelter_id IN (
    SELECT id FROM public.shelters WHERE manager_id = auth.uid()
  )
);

-- Function to automatically create alert when capacity is critical
CREATE OR REPLACE FUNCTION check_shelter_capacity_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- If capacity reaches 90% or more, create a warning alert
  IF NEW.capacity_max IS NOT NULL AND NEW.capacity_current IS NOT NULL THEN
    IF (NEW.capacity_current::float / NEW.capacity_max::float) >= 0.9 THEN
      INSERT INTO public.shelter_alerts (
        shelter_id,
        alert_type,
        severity,
        title,
        description
      ) VALUES (
        NEW.id,
        'low_capacity',
        CASE 
          WHEN (NEW.capacity_current::float / NEW.capacity_max::float) >= 0.95 THEN 'critical'
          ELSE 'warning'
        END,
        'Capacidad crítica',
        'El shelter está alcanzando su capacidad máxima (' || NEW.capacity_current || '/' || NEW.capacity_max || ')'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for capacity alerts
DROP TRIGGER IF EXISTS trigger_check_shelter_capacity_alert ON public.shelters;
CREATE TRIGGER trigger_check_shelter_capacity_alert
AFTER UPDATE OF capacity_current ON public.shelters
FOR EACH ROW
EXECUTE FUNCTION check_shelter_capacity_alert();