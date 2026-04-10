import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user || null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user || null);
      if (session?.user) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(authId: string) {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('trace_profiles')
      .select('*')
      .eq('auth_id', authId)
      .single();
    if (data) {
      setProfile(data);
    } else {
      // Profile doesn't exist yet — create one
      const { data: newProfile } = await supabase
        .from('trace_profiles')
        .insert({ auth_id: authId, display_name: 'Reader' })
        .select()
        .single();
      setProfile(newProfile);
    }
    setLoading(false);
  }

  async function updateProfile(updates: Record<string, any>) {
    if (!user) return;
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('trace_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('auth_id', user.id)
      .select()
      .single();
    if (data) setProfile(data);
    return data;
  }

  async function signOut() {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return { user, profile, loading, updateProfile, signOut, loadProfile };
}
