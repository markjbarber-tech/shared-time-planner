
ALTER TABLE public.events
ADD COLUMN recurrence_type text DEFAULT NULL,
ADD COLUMN recurrence_interval integer DEFAULT 1,
ADD COLUMN recurrence_end_date date DEFAULT NULL;

COMMENT ON COLUMN public.events.recurrence_type IS 'null = no recurrence, weekly, monthly';
COMMENT ON COLUMN public.events.recurrence_interval IS 'Every N weeks or months';
COMMENT ON COLUMN public.events.recurrence_end_date IS 'When the recurrence ends, null = no end';
