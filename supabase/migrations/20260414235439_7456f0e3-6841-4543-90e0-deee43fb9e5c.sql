
-- Calendar groups table
CREATE TABLE public.calendar_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_groups ENABLE ROW LEVEL SECURITY;

-- Calendar group members (many-to-many)
CREATE TABLE public.calendar_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.calendar_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.calendar_group_members ENABLE ROW LEVEL SECURITY;

-- Add group reference to events (nullable for now)
ALTER TABLE public.events ADD COLUMN calendar_group_id UUID REFERENCES public.calendar_groups(id) ON DELETE SET NULL;

-- Timestamp trigger for calendar_groups
CREATE TRIGGER update_calendar_groups_updated_at
  BEFORE UPDATE ON public.calendar_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: calendar_groups
-- Members can view groups they belong to
CREATE POLICY "Members can view their groups"
  ON public.calendar_groups FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calendar_group_members cgm
    WHERE cgm.group_id = id AND cgm.user_id = auth.uid()
  ));

-- Any authenticated user can create a group
CREATE POLICY "Users can create groups"
  ON public.calendar_groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Group admins can update their group
CREATE POLICY "Admins can update their groups"
  ON public.calendar_groups FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calendar_group_members cgm
    WHERE cgm.group_id = id AND cgm.user_id = auth.uid() AND cgm.role = 'admin'
  ));

-- Group admins can delete their group
CREATE POLICY "Admins can delete their groups"
  ON public.calendar_groups FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calendar_group_members cgm
    WHERE cgm.group_id = id AND cgm.user_id = auth.uid() AND cgm.role = 'admin'
  ));

-- RLS: calendar_group_members
-- Members can see other members in their groups
CREATE POLICY "Members can view group membership"
  ON public.calendar_group_members FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.calendar_group_members cgm2
    WHERE cgm2.group_id = calendar_group_members.group_id AND cgm2.user_id = auth.uid()
  ));

-- Admins can add members
CREATE POLICY "Admins can add members"
  ON public.calendar_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_group_members cgm
      WHERE cgm.group_id = calendar_group_members.group_id AND cgm.user_id = auth.uid() AND cgm.role = 'admin'
    )
    OR
    -- Allow the group creator to add themselves as admin (first member)
    (calendar_group_members.user_id = auth.uid() AND calendar_group_members.role = 'admin'
     AND NOT EXISTS (
       SELECT 1 FROM public.calendar_group_members cgm3
       WHERE cgm3.group_id = calendar_group_members.group_id
     ))
  );

-- Admins can remove members, members can remove themselves
CREATE POLICY "Members can leave or admins can remove"
  ON public.calendar_group_members FOR DELETE
  TO authenticated
  USING (
    calendar_group_members.user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.calendar_group_members cgm
      WHERE cgm.group_id = calendar_group_members.group_id AND cgm.user_id = auth.uid() AND cgm.role = 'admin'
    )
  );
