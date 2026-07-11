import { supabase } from '../supabaseClient.js';

export async function listProperties({ city, minPrice, maxPrice, minGuests } = {}) {
  let query = supabase.from('properties').select('*, property_photos(*), reviews(rating)');
  if (city) query = query.eq('city', city);
  if (minPrice) query = query.gte('price_per_night', minPrice);
  if (maxPrice) query = query.lte('price_per_night', maxPrice);
  if (minGuests) query = query.gte('max_guests', minGuests);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPropertyById(id) {
  const { data, error } = await supabase
    .from('properties')
    .select('*, property_photos(*), profiles:owner_id(display_name, avatar_url)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function listPropertiesByOwner(ownerId) {
  const { data, error } = await supabase
    .from('properties')
    .select('*, property_photos(*)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createProperty(property) {
  const { data, error } = await supabase.from('properties').insert(property).select().single();
  if (error) throw error;
  return data;
}

export async function updateProperty(id, updates) {
  const { data, error } = await supabase
    .from('properties')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProperty(id) {
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) throw error;
}

export async function listCities() {
  const { data, error } = await supabase.from('properties').select('city');
  if (error) throw error;
  return [...new Set(data.map((row) => row.city))].sort();
}
