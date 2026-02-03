-- Supabase Storage Setup for Application Files
-- Run this in your Supabase SQL Editor

-- Create a storage bucket for application uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view uploaded files
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'uploads');

-- Allow anyone to upload files (for application submissions)
CREATE POLICY "Anyone can upload" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'uploads');

-- Allow service role to manage files
CREATE POLICY "Service role can manage" ON storage.objects
  FOR ALL
  USING (auth.role() = 'service_role');
