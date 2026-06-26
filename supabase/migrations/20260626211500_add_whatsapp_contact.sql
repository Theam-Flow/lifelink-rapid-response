-- WhatsApp contact, alongside LINE. LINE is used in Asia; WhatsApp is the norm
-- in Venezuela and most Spanish-speaking countries. Both kept for global reach.
ALTER TABLE public.profiles    ADD COLUMN IF NOT EXISTS whatsapp_number  TEXT;
ALTER TABLE public.sos_signals ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT;
