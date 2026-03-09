
-- Share codes table: each user gets a unique short share code
CREATE TABLE public.user_share_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  share_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_share_codes ENABLE ROW LEVEL SECURITY;

-- Users can read their own share code
CREATE POLICY "Users can read own share code"
  ON public.user_share_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own share code
CREATE POLICY "Users can insert own share code"
  ON public.user_share_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Anyone authenticated can look up a share code (to resolve friend's user_id)
CREATE POLICY "Anyone can lookup share codes"
  ON public.user_share_codes FOR SELECT
  TO authenticated
  USING (true);

-- Friend follows table: who is following whom
CREATE TABLE public.friend_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_user_id)
);

ALTER TABLE public.friend_follows ENABLE ROW LEVEL SECURITY;

-- Users can manage their own follows
CREATE POLICY "Users manage own follows"
  ON public.friend_follows FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to check if someone is a friend (for RLS on other tables)
CREATE OR REPLACE FUNCTION public.is_friend_of(_owner_id uuid, _viewer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friend_follows
    WHERE user_id = _viewer_id AND friend_user_id = _owner_id
  )
$$;

-- Function to generate a short share code
CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT upper(substr(md5(gen_random_uuid()::text), 1, 8))
$$;

-- Auto-generate share code for new users via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_share_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_share_codes (user_id, share_code)
  VALUES (NEW.id, upper(substr(md5(gen_random_uuid()::text), 1, 8)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_share_code
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_share_code();
