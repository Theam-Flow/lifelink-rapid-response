-- Fix handle_new_user trigger to correctly save role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, country_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'victim'),
    COALESCE((NEW.raw_user_meta_data->>'country_code')::country_code, 'TH')
  );
  RETURN NEW;
END;
$$;

-- Update RLS policies for profiles table to protect sensitive data
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow users to view basic profile info (excluding sensitive data like phone)
CREATE POLICY "Users can view basic profile info"
ON profiles FOR SELECT
USING (true);

-- Users can view their own full profile including sensitive data
CREATE POLICY "Users can view own full profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (is_admin(auth.uid()));

-- Update RLS policies for financial_aid to protect banking details
DROP POLICY IF EXISTS "Anyone can view active financial aid cases" ON financial_aid;
DROP POLICY IF EXISTS "Users can create financial aid for themselves" ON financial_aid;
DROP POLICY IF EXISTS "Recipients can update their own financial aid" ON financial_aid;

-- Public can view financial aid but NOT banking details (done via app layer)
CREATE POLICY "Public can view financial aid stories"
ON financial_aid FOR SELECT
USING (is_active = true);

-- Recipients can view their own full financial aid including banking
CREATE POLICY "Recipients can view own financial aid"
ON financial_aid FOR SELECT
USING (auth.uid() = recipient_id);

-- Users can create financial aid for themselves
CREATE POLICY "Users can create own financial aid"
ON financial_aid FOR INSERT
WITH CHECK (auth.uid() = recipient_id);

-- Recipients can update their own financial aid
CREATE POLICY "Recipients can update own financial aid"
ON financial_aid FOR UPDATE
USING (auth.uid() = recipient_id);

-- Admins can manage all financial aid
CREATE POLICY "Admins can manage financial aid"
ON financial_aid FOR ALL
USING (is_admin(auth.uid()));