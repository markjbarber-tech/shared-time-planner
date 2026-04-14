import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ChildProfile } from '@/types/calendar';

export function useChildProfiles() {
  const { user } = useAuth();
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([]);

  useEffect(() => {
    if (!user) {
      setChildProfiles([]);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from('child_profiles')
        .select('*')
        .eq('parent_user_id', user.id);
      if (data) {
        setChildProfiles(data.map(mapRow));
      }
    };
    fetch();

    const channel = supabase
      .channel('child-profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'child_profiles' }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const mapRow = (row: any): ChildProfile => ({
    id: row.id,
    parentUserId: row.parent_user_id,
    displayName: row.display_name,
    preferredColor: row.preferred_color,
    avatarUrl: row.avatar_url,
  });

  const addChildProfile = useCallback(async (displayName: string, preferredColor: number = 0) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('child_profiles')
      .insert({
        parent_user_id: user.id,
        display_name: displayName,
        preferred_color: preferredColor,
      })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      setChildProfiles(prev => [...prev, mapRow(data)]);
    }
    return data;
  }, [user]);

  const updateChildProfile = useCallback(async (id: string, updates: Partial<Pick<ChildProfile, 'displayName' | 'preferredColor'>>) => {
    const mapped: any = {};
    if (updates.displayName !== undefined) mapped.display_name = updates.displayName;
    if (updates.preferredColor !== undefined) mapped.preferred_color = updates.preferredColor;
    const { data } = await supabase
      .from('child_profiles')
      .update(mapped)
      .eq('id', id)
      .select()
      .single();
    if (data) {
      setChildProfiles(prev => prev.map(cp => cp.id === id ? mapRow(data) : cp));
    }
  }, []);

  const deleteChildProfile = useCallback(async (id: string) => {
    await supabase.from('child_profiles').delete().eq('id', id);
    setChildProfiles(prev => prev.filter(cp => cp.id !== id));
  }, []);

  const getChildProfileName = useCallback((childProfileId: string) => {
    const cp = childProfiles.find(c => c.id === childProfileId);
    return cp?.displayName || 'Unknown';
  }, [childProfiles]);

  return { childProfiles, addChildProfile, updateChildProfile, deleteChildProfile, getChildProfileName };
}
