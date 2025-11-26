-- Add detailed fields to missing_persons table
ALTER TABLE public.missing_persons
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS height_cm integer,
ADD COLUMN IF NOT EXISTS weight_kg integer,
ADD COLUMN IF NOT EXISTS hair_color text,
ADD COLUMN IF NOT EXISTS eye_color text,
ADD COLUMN IF NOT EXISTS clothing_description text,
ADD COLUMN IF NOT EXISTS medical_conditions text,
ADD COLUMN IF NOT EXISTS languages_spoken text[];

-- Add comment for documentation
COMMENT ON COLUMN public.missing_persons.city IS 'City where the person was last seen';
COMMENT ON COLUMN public.missing_persons.height_cm IS 'Height in centimeters';
COMMENT ON COLUMN public.missing_persons.weight_kg IS 'Weight in kilograms';
COMMENT ON COLUMN public.missing_persons.hair_color IS 'Hair color description';
COMMENT ON COLUMN public.missing_persons.eye_color IS 'Eye color description';
COMMENT ON COLUMN public.missing_persons.clothing_description IS 'Description of clothing worn when last seen';
COMMENT ON COLUMN public.missing_persons.medical_conditions IS 'Any relevant medical conditions or medications';
COMMENT ON COLUMN public.missing_persons.languages_spoken IS 'Languages the person speaks';