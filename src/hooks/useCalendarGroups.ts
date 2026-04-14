import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { CalendarGroup, CalendarGroupMember } from '@/types/calendar';

export function useCalendarGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CalendarGroup[]>([]);
  const [members, setMembers] = useState<CalendarGroupMember[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch groups the user belongs to
  useEffect(() => {
    if (!user) {
      setGroups([]);
      setMembers([]);
      setActiveGroupId(null);
      setLoading(false);
      return;
    }

    const fetchGroups = async () => {
      // Get groups via membership
      const { data: memberData } = await supabase
        .from('calendar_group_members')
        .select('group_id, role')
        .eq('user_id', user.id);

      if (!memberData || memberData.length === 0) {
        setGroups([]);
        setMembers([]);
        setLoading(false);
        return;
      }

      const groupIds = memberData.map(m => m.group_id);

      const { data: groupData } = await supabase
        .from('calendar_groups')
        .select('*')
        .in('id', groupIds);

      if (groupData) {
        const mapped: CalendarGroup[] = groupData.map(g => ({
          id: g.id,
          name: g.name,
          createdBy: g.created_by,
          createdAt: g.created_at,
        }));
        setGroups(mapped);

        // Set active group from localStorage or first group
        const stored = localStorage.getItem('active_calendar_group');
        const validStored = stored && mapped.some(g => g.id === stored);
        setActiveGroupId(validStored ? stored : mapped[0]?.id ?? null);
      }

      // Fetch all members for user's groups
      const { data: allMembers } = await supabase
        .from('calendar_group_members')
        .select('*')
        .in('group_id', groupIds);

      if (allMembers) {
        setMembers(allMembers.map(m => ({
          id: m.id,
          groupId: m.group_id,
          userId: m.user_id,
          role: m.role,
          createdAt: m.created_at,
        })));
      }

      setLoading(false);
    };

    fetchGroups();
  }, [user]);

  // Persist active group selection
  const switchGroup = useCallback((groupId: string) => {
    setActiveGroupId(groupId);
    localStorage.setItem('active_calendar_group', groupId);
  }, []);

  const createGroup = useCallback(async (name: string) => {
    if (!user) return null;

    const { data: group, error: groupError } = await supabase
      .from('calendar_groups')
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (groupError || !group) throw groupError;

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('calendar_group_members')
      .insert({ group_id: group.id, user_id: user.id, role: 'admin' });

    if (memberError) throw memberError;

    const newGroup: CalendarGroup = {
      id: group.id,
      name: group.name,
      createdBy: group.created_by,
      createdAt: group.created_at,
    };

    setGroups(prev => [...prev, newGroup]);
    setMembers(prev => [...prev, {
      id: crypto.randomUUID(),
      groupId: group.id,
      userId: user.id,
      role: 'admin',
      createdAt: new Date().toISOString(),
    }]);

    // Auto-switch to new group
    switchGroup(group.id);

    return newGroup;
  }, [user, switchGroup]);

  const addMemberToGroup = useCallback(async (groupId: string, userId: string) => {
    const { data, error } = await supabase
      .from('calendar_group_members')
      .insert({ group_id: groupId, user_id: userId, role: 'member' })
      .select()
      .single();

    if (error) throw error;
    if (data) {
      setMembers(prev => [...prev, {
        id: data.id,
        groupId: data.group_id,
        userId: data.user_id,
        role: data.role,
        createdAt: data.created_at,
      }]);
    }
  }, []);

  const removeMemberFromGroup = useCallback(async (groupId: string, userId: string) => {
    await supabase
      .from('calendar_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    setMembers(prev => prev.filter(m => !(m.groupId === groupId && m.userId === userId)));
  }, []);

  const updateGroupName = useCallback(async (groupId: string, name: string) => {
    const { error } = await supabase
      .from('calendar_groups')
      .update({ name })
      .eq('id', groupId);

    if (error) throw error;
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name } : g));
  }, []);

  const deleteGroup = useCallback(async (groupId: string) => {
    await supabase.from('calendar_groups').delete().eq('id', groupId);
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setMembers(prev => prev.filter(m => m.groupId !== groupId));
    // Switch to another group if we deleted the active one
    if (activeGroupId === groupId) {
      const remaining = groups.filter(g => g.id !== groupId);
      const next = remaining[0]?.id ?? null;
      setActiveGroupId(next);
      if (next) localStorage.setItem('active_calendar_group', next);
      else localStorage.removeItem('active_calendar_group');
    }
  }, [activeGroupId, groups]);

  const getGroupMembers = useCallback((groupId: string) => {
    return members.filter(m => m.groupId === groupId);
  }, [members]);

  const isAdmin = useCallback((groupId: string) => {
    if (!user) return false;
    return members.some(m => m.groupId === groupId && m.userId === user.id && m.role === 'admin');
  }, [members, user]);

  return {
    groups,
    members,
    activeGroupId,
    loading,
    switchGroup,
    createGroup,
    addMemberToGroup,
    removeMemberFromGroup,
    updateGroupName,
    deleteGroup,
    getGroupMembers,
    isAdmin,
  };
}
