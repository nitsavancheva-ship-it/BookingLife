import { supabase } from '../supabaseClient.js';

export async function listReviewsForProperty(propertyId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, profiles:guest_id(display_name, avatar_url)')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createReview(review) {
  const { data, error } = await supabase.from('reviews').insert(review).select().single();
  if (error) throw error;
  return data;
}
