import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  user_id: string;
  display_name: string | null;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('profiles').select('user_id, display_name');
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((p: Profile) => {
          map[p.user_id] = p.display_name || 'Unknown';
        });
        setProfiles(map);
      }
    };
    fetch();
  }, []);

  const getDisplayName = useCallback((userId: string) => {
    return profiles[userId] || 'Unknown';
  }, [profiles]);

  return { profiles, getDisplayName };
}
