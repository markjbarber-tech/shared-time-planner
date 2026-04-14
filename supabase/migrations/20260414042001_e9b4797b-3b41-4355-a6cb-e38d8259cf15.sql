DROP POLICY "Users can insert their own events" ON public.events;

CREATE POLICY "Authenticated users can insert events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (true);