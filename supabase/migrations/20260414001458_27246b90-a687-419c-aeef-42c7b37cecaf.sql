
-- Create event_attendees join table
CREATE TABLE public.event_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view attendees for events they can see
CREATE POLICY "Users can view attendees of visible events"
ON public.event_attendees
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
    AND (e.visibility = 'public' OR e.user_id = auth.uid())
  )
  OR user_id = auth.uid()
);

-- Event owners can add attendees
CREATE POLICY "Event owners can add attendees"
ON public.event_attendees
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
    AND e.user_id = auth.uid()
  )
);

-- Event owners can remove attendees
CREATE POLICY "Event owners can remove attendees"
ON public.event_attendees
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_id
    AND e.user_id = auth.uid()
  )
);

-- Attendees can update their own status (accept/decline)
CREATE POLICY "Attendees can update their own status"
ON public.event_attendees
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON public.event_attendees(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_attendees;
