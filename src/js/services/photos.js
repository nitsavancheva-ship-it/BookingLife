import { supabase } from '../supabaseClient.js';

const BUCKET = 'property-photos';

export async function uploadPropertyPhoto(propertyId, file) {
  const path = `${propertyId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('property_photos')
    .insert({ property_id: propertyId, storage_path: path })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function getPhotoUrl(storagePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function setCoverPhoto(propertyId, photoId) {
  await supabase.from('property_photos').update({ is_cover: false }).eq('property_id', propertyId);
  const { error } = await supabase.from('property_photos').update({ is_cover: true }).eq('id', photoId);
  if (error) throw error;
}

export async function deletePropertyPhoto(photoId, storagePath) {
  await supabase.storage.from(BUCKET).remove([storagePath]);
  const { error } = await supabase.from('property_photos').delete().eq('id', photoId);
  if (error) throw error;
}
