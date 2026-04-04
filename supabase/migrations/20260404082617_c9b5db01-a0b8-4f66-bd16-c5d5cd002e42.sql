
-- Drop the open SELECT policy
DROP POLICY IF EXISTS "Anyone can lookup share codes" ON public.user_share_codes;

-- Add owner-only SELECT policy (users can see their own share code)
CREATE POLICY "Users can read own share code"
  ON public.user_share_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RPC for looking up a user by share code (server-side, no table enumeration)
CREATE OR REPLACE FUNCTION public.get_user_by_share_code(p_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM user_share_codes WHERE share_code = p_code LIMIT 1;
$$;
