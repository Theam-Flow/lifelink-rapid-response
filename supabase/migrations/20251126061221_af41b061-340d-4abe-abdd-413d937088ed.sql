-- Enable full replica identity for realtime updates
ALTER TABLE public.sos_signals REPLICA IDENTITY FULL;