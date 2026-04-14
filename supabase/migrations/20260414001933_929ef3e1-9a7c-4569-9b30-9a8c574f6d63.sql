
-- Create child_profiles table
CREATE TABLE public.child_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  preferred_color INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;

-- Only parent can see their child profiles
CREATE POLICY "Users can view their own child profiles"
ON public.child_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = parent_user_id);

-- Only parent can create child profiles
CREATE POLICY "Users can create their own child profiles"
ON public.child_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = parent_user_id);

-- Only parent can update their child profiles
CREATE POLICY "Users can update their own child profiles"
ON public.child_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = parent_user_id);

-- Only parent can delete their child profiles
CREATE POLICY "Users can delete their own child profiles"
ON public.child_profiles
FOR DELETE
TO authenticated
USING (auth.uid() = parent_user_id);

-- Trigger for updated_at
CREATE TRIGGER update_child_profiles_updated_at
BEFORE UPDATE ON public.child_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add child_profile_id to events (nullable - null means regular user event)
ALTER TABLE public.events
ADD COLUMN child_profile_id UUID REFERENCES public.child_profiles(id) ON DELETE SET NULL;

-- Allow anyone to view child profiles referenced by public events (for display names)
CREATE POLICY "Anyone can view child profiles on public events"
ON public.child_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.child_profile_id = id
    AND e.visibility = 'public'
  )
);

-- Enable realtime for child_profiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.child_profiles;
