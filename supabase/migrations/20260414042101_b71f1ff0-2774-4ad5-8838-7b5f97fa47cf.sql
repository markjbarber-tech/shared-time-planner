CREATE TABLE public.user_nicknames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  nickname TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, target_user_id)
);

ALTER TABLE public.user_nicknames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nicknames"
ON public.user_nicknames FOR SELECT
TO authenticated
USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can create their own nicknames"
ON public.user_nicknames FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update their own nicknames"
ON public.user_nicknames FOR UPDATE
TO authenticated
USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete their own nicknames"
ON public.user_nicknames FOR DELETE
TO authenticated
USING (auth.uid() = owner_user_id);

CREATE TRIGGER update_user_nicknames_updated_at
BEFORE UPDATE ON public.user_nicknames
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();