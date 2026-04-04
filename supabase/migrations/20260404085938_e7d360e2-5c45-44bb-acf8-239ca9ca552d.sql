CREATE POLICY "Users can delete own share code"
  ON public.user_share_codes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);