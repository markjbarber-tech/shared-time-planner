import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Nickname {
  id: string;
  targetUserId: string;
  nickname: string;
}

export function useNicknames() {
  const { user } = useAuth();
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [nicknameEntries, setNicknameEntries] = useState<Nickname[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('user_nicknames')
        .select('*')
        .eq('owner_user_id', user.id);
      if (data) {
        const map: Record<string, string> = {};
        const entries: Nickname[] = [];
        data.forEach((n: any) => {
          map[n.target_user_id] = n.nickname;
          entries.push({ id: n.id, targetUserId: n.target_user_id, nickname: n.nickname });
        });
        setNicknames(map);
        setNicknameEntries(entries);
      }
    };
    fetch();
  }, [user]);

  const setNickname = useCallback(async (targetUserId: string, nickname: string) => {
    if (!user) return;
    const trimmed = nickname.trim();
    if (!trimmed) {
      // Delete nickname
      await supabase
        .from('user_nicknames')
        .delete()
        .eq('owner_user_id', user.id)
        .eq('target_user_id', targetUserId);
      setNicknames(prev => {
        const next = { ...prev };
        delete next[targetUserId];
        return next;
      });
      setNicknameEntries(prev => prev.filter(n => n.targetUserId !== targetUserId));
      return;
    }

    const { data } = await supabase
      .from('user_nicknames')
      .upsert(
        { owner_user_id: user.id, target_user_id: targetUserId, nickname: trimmed },
        { onConflict: 'owner_user_id,target_user_id' }
      )
      .select()
      .single();

    if (data) {
      setNicknames(prev => ({ ...prev, [targetUserId]: trimmed }));
      setNicknameEntries(prev => {
        const existing = prev.find(n => n.targetUserId === targetUserId);
        if (existing) {
          return prev.map(n => n.targetUserId === targetUserId ? { ...n, nickname: trimmed, id: data.id } : n);
        }
        return [...prev, { id: data.id, targetUserId, nickname: trimmed }];
      });
    }
  }, [user]);

  const getDisplayName = useCallback((userId: string, originalName: string) => {
    return nicknames[userId] || originalName;
  }, [nicknames]);

  return { nicknames, nicknameEntries, setNickname, getDisplayName };
}
