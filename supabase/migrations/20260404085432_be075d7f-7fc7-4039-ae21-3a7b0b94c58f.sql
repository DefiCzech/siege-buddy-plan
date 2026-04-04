
-- 1. Remove training_completions from Realtime publication (no IF EXISTS support)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'training_completions'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.training_completions;
  END IF;
END;
$$;

-- 2. Fix profiles: drop overly permissive SELECT, add self-read
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Fix friend_follows: restrict INSERT to go through validated RPC only
DROP POLICY IF EXISTS "Users manage own follows" ON public.friend_follows;

CREATE POLICY "Users can read own follows"
  ON public.friend_follows
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own follows"
  ON public.friend_follows
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RPC that validates share code before creating follow
CREATE OR REPLACE FUNCTION public.add_friend_by_share_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_friend_id uuid;
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id INTO v_friend_id
  FROM user_share_codes
  WHERE share_code = p_code
  LIMIT 1;

  IF v_friend_id IS NULL THEN
    RAISE EXCEPTION 'Invalid share code';
  END IF;

  IF v_friend_id = v_caller_id THEN
    RAISE EXCEPTION 'Cannot follow yourself';
  END IF;

  INSERT INTO friend_follows (user_id, friend_user_id)
  VALUES (v_caller_id, v_friend_id)
  ON CONFLICT DO NOTHING;

  RETURN v_friend_id;
END;
$$;
