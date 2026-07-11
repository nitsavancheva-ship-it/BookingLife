import { supabase } from '../supabaseClient.js';

export async function createBooking(booking) {
  const { data, error } = await supabase.from('bookings').insert(booking).select().single();
  if (error) throw error;
  return data;
}

export async function listMyBookings(userId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, properties(*, property_photos(*)), reviews(*)')
    .eq('guest_id', userId)
    .order('check_in', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listBookingsForProperty(propertyId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, profiles:guest_id(display_name)')
    .eq('property_id', propertyId)
    .order('check_in', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listAllBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, properties(title), profiles:guest_id(display_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function cancelBooking(id) {
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}
