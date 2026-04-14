import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProfileData {
  userId: string;
  displayName: string;
  preferredColor: number;
  avatarUrl: string | null;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [profileList, setProfileList] = useState<ProfileData[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('profiles').select('user_id, display_name, preferred_color, avatar_url');
      if (data) {
        const map: Record<string, string> = {};
        const list: ProfileData[] = [];
        data.forEach((p: any) => {
          map[p.user_id] = p.display_name || 'Unknown';
          list.push({
            userId: p.user_id,
            displayName: p.display_name || 'Unknown',
            preferredColor: p.preferred_color ?? 0,
            avatarUrl: p.avatar_url,
          });
        });
        setProfiles(map);
        setProfileList(list);
      }
    };
    fetch();
  }, []);

  const getDisplayName = useCallback((userId: string) => {
    return profiles[userId] || 'Unknown';
  }, [profiles]);

  const updateDisplayName = useCallback(async (userId: string, newName: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: newName })
      .eq('user_id', userId);
    if (error) throw error;
    setProfiles(prev => ({ ...prev, [userId]: newName }));
    setProfileList(prev => prev.map(p => p.userId === userId ? { ...p, displayName: newName } : p));
  }, []);

  return { profiles, profileList, getDisplayName, updateDisplayName };
}
