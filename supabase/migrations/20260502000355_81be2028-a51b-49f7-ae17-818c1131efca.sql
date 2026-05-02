ALTER TABLE public.events ADD COLUMN IF NOT EXISTS child_profile_ids uuid[] NOT NULL DEFAULT '{}';

-- Backfill from existing single column
UPDATE public.events SET child_profile_ids = ARRAY[child_profile_id] WHERE child_profile_id IS NOT NULL AND (child_profile_ids IS NULL OR array_length(child_profile_ids, 1) IS NULL);