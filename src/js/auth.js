import { supabase } from './supabaseClient.js';

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  return session ? session.user : null;
}

export async function getCurrentRole() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (error) return 'user';
  return data.role;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    const redirectTo = window.location.pathname + window.location.search;
    window.location.href = `/login.html?redirect=${encodeURIComponent(redirectTo)}`;
    return null;
  }
  return user;
}

export async function requireRole(role) {
  const user = await requireAuth();
  if (!user) return null;
  const currentRole = await getCurrentRole();
  if (currentRole !== role) {
    window.location.href = '/index.html';
    return null;
  }
  return user;
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = '/index.html';
}
