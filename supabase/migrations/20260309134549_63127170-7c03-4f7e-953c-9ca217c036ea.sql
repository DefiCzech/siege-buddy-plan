
-- Fix search_path on generate_share_code
CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT upper(substr(md5(gen_random_uuid()::text), 1, 8))
$$;

-- Drop duplicate policy on user_share_codes (two SELECT policies)
DROP POLICY IF EXISTS "Users can read own share code" ON public.user_share_codes;

-- Add RLS policies so friends can read each other's data
-- schedule_entries: friends can read
CREATE POLICY "Friends can read entries"
  ON public.schedule_entries FOR SELECT
  TO authenticated
  USING (public.is_friend_of(user_id, auth.uid()));

-- user_activities: friends can read
CREATE POLICY "Friends can read activities"
  ON public.user_activities FOR SELECT
  TO authenticated
  USING (public.is_friend_of(user_id, auth.uid()));

-- user_categories: friends can read
CREATE POLICY "Friends can read categories"
  ON public.user_categories FOR SELECT
  TO authenticated
  USING (public.is_friend_of(user_id, auth.uid()));

-- user_schedules: friends can read
CREATE POLICY "Friends can read schedules"
  ON public.user_schedules FOR SELECT
  TO authenticated
  USING (public.is_friend_of(user_id, auth.uid()));

-- training_completions: friends can read
CREATE POLICY "Friends can read completions"
  ON public.training_completions FOR SELECT
  TO authenticated
  USING (public.is_friend_of(user_id, auth.uid()));

-- profiles: friends can read display name
CREATE POLICY "Friends can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_friend_of(user_id, auth.uid()));

-- Enable realtime on training_completions for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_completions;
