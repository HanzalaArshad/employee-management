// src/utils/storage.ts
import { supabase } from './supabaseClient';

export const uploadEmployeeFile = async (file: File, employeeId: string, type: 'cv' | 'id' | 'contract'): Promise<string | null> => {
  const fileName = `${employeeId}/${type}-${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('employee-files')
    .upload(fileName, file, { upsert: true, contentType: file.type });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: { signedUrl } } = supabase.storage
    .from('employee-files')
    .createSignedUrl(data.path, 3600);  // 1 hour

  return signedUrl;
};

export const listEmployeeFiles = async (employeeId: string): Promise<any[]> => {
  const { data, error } = await supabase.storage
    .from('employee-files')
    .list(`${employeeId}/`, { limit: 100 });

  if (error) return [];

  const filesWithUrls = await Promise.all(
    data.map(async (file) => {
      const { data: { signedUrl } } = supabase.storage
        .from('employee-files')
        .createSignedUrl(file.name, 3600);
      return { ...file, signedUrl };
    })
  );

  return filesWithUrls;
};