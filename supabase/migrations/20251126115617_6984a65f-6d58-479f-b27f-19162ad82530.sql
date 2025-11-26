-- Drop existing policies
DROP POLICY IF EXISTS "shelters_insert" ON public.shelters;
DROP POLICY IF EXISTS "shelters_update" ON public.shelters;

-- Create new policies for shelters
-- Allow authenticated users to create shelters (they become the manager)
CREATE POLICY "Users can create shelters"
ON public.shelters
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = manager_id
);

-- Allow authenticated users to view all shelters
CREATE POLICY "Users can view all shelters"
ON public.shelters
FOR SELECT
TO authenticated
USING (true);

-- Allow shelter managers to update their own shelters
CREATE POLICY "Managers can update their shelters"
ON public.shelters
FOR UPDATE
TO authenticated
USING (auth.uid() = manager_id)
WITH CHECK (auth.uid() = manager_id);

-- Allow shelter managers to delete their own shelters
CREATE POLICY "Managers can delete their shelters"
ON public.shelters
FOR DELETE
TO authenticated
USING (auth.uid() = manager_id);