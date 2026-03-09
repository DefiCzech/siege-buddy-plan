
-- User categories
CREATE TABLE public.user_categories (
  id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '📌',
  color text NOT NULL DEFAULT 'bg-muted text-muted-foreground border-border',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own categories" ON public.user_categories
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User activities
CREATE TABLE public.user_activities (
  id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category_id text NOT NULL,
  description text,
  video_url text,
  activity_type text NOT NULL DEFAULT 'default',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own activities" ON public.user_activities
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Schedule entries
CREATE TABLE public.schedule_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  activity_id text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  duration_minutes int,
  completed_maps text[],
  assigned_maps text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_of_week, activity_id)
);

ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own entries" ON public.schedule_entries
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Schedule metadata (name)
CREATE TABLE public.user_schedules (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  name text NOT NULL DEFAULT 'Můj R6S Tréninkový Plán',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own schedule" ON public.user_schedules
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
