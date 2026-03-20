
ALTER TABLE public.profiles ADD COLUMN mindset_description text;

CREATE POLICY "Friends can read mindset items"
ON public.user_mindset_items
FOR SELECT
TO authenticated
USING (is_friend_of(user_id, auth.uid()));
