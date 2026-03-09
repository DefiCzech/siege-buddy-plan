
CREATE TABLE public.training_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_id text NOT NULL,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes int,
  completed_maps text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_id, completed_date)
);

ALTER TABLE public.training_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own completions" ON public.training_completions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Remove completion columns from schedule_entries (template only)
ALTER TABLE public.schedule_entries DROP COLUMN IF EXISTS completed;
ALTER TABLE public.schedule_entries DROP COLUMN IF EXISTS duration_minutes;
ALTER TABLE public.schedule_entries DROP COLUMN IF EXISTS completed_maps;
