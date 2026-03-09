
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS ubisoft_username text,
  ADD COLUMN IF NOT EXISTS rank_name text,
  ADD COLUMN IF NOT EXISTS rank_image_url text;
