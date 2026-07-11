import { supabase } from '../supabaseClient.js';

export async function setRole(userId, role) {
  const { error } = await supabase.from('user_roles').update({ role }).eq('user_id', userId);
  if (error) throw error;
}
