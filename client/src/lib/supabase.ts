import { createClient } from '@supabase/supabase-js';

// Reads public Supabase credentials from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo-placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to upload vehicle inspection photos or workshop logos to Supabase Storage
 */
export async function uploadWorkshopAsset(
  bucket: 'inspection-photos' | 'workshop-logos',
  filePath: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: publicUrlData.publicUrl, error: null };
  } catch (err: any) {
    console.error('Error uploading asset to Supabase:', err);
    return { url: null, error: err };
  }
}
