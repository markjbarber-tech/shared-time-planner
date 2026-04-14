-- Restrict profiles to authenticated users only
DROP POLICY "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Tighten events INSERT to require own user_id
DROP POLICY "Authenticated users can insert events" ON public.events;
CREATE POLICY "Users can insert their own events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);