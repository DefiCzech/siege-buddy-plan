import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { Schedule, ScheduleEntry, TrainingActivity, Category, DEFAULT_ACTIVITIES, DEFAULT_CATEGORIES } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { decodeScheduleFromShare, encodeScheduleForShare } from "@/lib/schedule-store";
import { toast } from "sonner";

interface ScheduleContextType {
  schedule: Schedule;
  updateSchedule: (partial: Partial<Schedule>) => void;
  loading: boolean;
}

const ScheduleContext = createContext<ScheduleContextType | null>(null);

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<Schedule>({
    id: "default",
    name: "Můj R6S Tréninkový Plán",
    categories: [],
    activities: [],
    entries: [],
  });
  const [loading, setLoading] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScheduleRef = useRef<Schedule | null>(null);

  // Load from DB
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);

      // Check for shared plan in URL
      const params = new URLSearchParams(window.location.search);
      const planData = params.get("plan");
      if (planData) {
        const decoded = decodeScheduleFromShare(planData);
        if (decoded) {
          toast.info("Načten sdílený plán!", { description: "Ukládám do tvého účtu..." });
          window.history.replaceState({}, "", window.location.pathname);
          await saveAllToDb(user.id, decoded);
          setSchedule(decoded);
          prevScheduleRef.current = decoded;
          setLoading(false);
          return;
        }
      }

      const [scheduleRes, catsRes, actsRes, entriesRes] = await Promise.all([
        supabase.from("user_schedules").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_categories").select("*").eq("user_id", user.id).order("sort_order"),
        supabase.from("user_activities").select("*").eq("user_id", user.id).order("sort_order"),
        supabase.from("schedule_entries").select("*").eq("user_id", user.id),
      ]);

      const isNew = !scheduleRes.data && (catsRes.data?.length ?? 0) === 0;

      if (isNew) {
        // First time — seed with defaults and migrate localStorage if present
        const localData = localStorage.getItem("r6s-schedule");
        let seed: Schedule;
        if (localData) {
          try {
            seed = JSON.parse(localData);
            if (!seed.categories) seed.categories = [...DEFAULT_CATEGORIES];
          } catch {
            seed = createDefault();
          }
        } else {
          seed = createDefault();
        }
        await saveAllToDb(user.id, seed);
        setSchedule(seed);
        prevScheduleRef.current = seed;
        // Clean up localStorage after migration
        localStorage.removeItem("r6s-schedule");
      } else {
        const loaded: Schedule = {
          id: user.id,
          name: scheduleRes.data?.name ?? "Můj R6S Tréninkový Plán",
          categories: (catsRes.data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
          })),
          activities: (actsRes.data || []).map((a: any) => ({
            id: a.id,
            name: a.name,
            categoryId: a.category_id,
            description: a.description ?? undefined,
            videoUrl: a.video_url ?? undefined,
            activityType: a.activity_type === "map-learning" ? "map-learning" : "default",
          })),
          entries: (entriesRes.data || []).map((e: any) => ({
            dayOfWeek: e.day_of_week,
            activityId: e.activity_id,
            completed: e.completed,
            durationMinutes: e.duration_minutes ?? undefined,
            completedMaps: e.completed_maps ?? undefined,
            assignedMaps: e.assigned_maps ?? undefined,
          })),
        };
        setSchedule(loaded);
        prevScheduleRef.current = loaded;
      }

      setLoading(false);
    };

    load();
  }, [user]);

  // Save changes to DB with debounce
  const saveToDb = useCallback(
    (newSchedule: Schedule) => {
      if (!user) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        saveAllToDb(user.id, newSchedule);
      }, 500);
    },
    [user]
  );

  const updateSchedule = useCallback(
    (partial: Partial<Schedule>) => {
      setSchedule((prev) => {
        const next = { ...prev, ...partial };
        saveToDb(next);
        return next;
      });
    },
    [saveToDb]
  );

  return (
    <ScheduleContext.Provider value={{ schedule, updateSchedule, loading }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error("useSchedule must be used within ScheduleProvider");
  return ctx;
}

function createDefault(): Schedule {
  return {
    id: generateId(),
    name: "Můj R6S Tréninkový Plán",
    categories: [...DEFAULT_CATEGORIES],
    activities: [...DEFAULT_ACTIVITIES],
    entries: [],
  };
}

async function saveAllToDb(userId: string, schedule: Schedule) {
  // Upsert schedule name
  await supabase.from("user_schedules").upsert(
    { user_id: userId, name: schedule.name, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  // Delete and re-insert categories
  await supabase.from("user_categories").delete().eq("user_id", userId);
  if (schedule.categories.length > 0) {
    await supabase.from("user_categories").insert(
      schedule.categories.map((c, i) => ({
        id: c.id,
        user_id: userId,
        name: c.name,
        icon: c.icon,
        color: c.color,
        sort_order: i,
      }))
    );
  }

  // Delete and re-insert activities
  await supabase.from("user_activities").delete().eq("user_id", userId);
  if (schedule.activities.length > 0) {
    await supabase.from("user_activities").insert(
      schedule.activities.map((a, i) => ({
        id: a.id,
        user_id: userId,
        name: a.name,
        category_id: a.categoryId,
        description: a.description ?? null,
        video_url: a.videoUrl ?? null,
        activity_type: a.activityType ?? "default",
        sort_order: i,
      }))
    );
  }

  // Delete and re-insert entries
  await supabase.from("schedule_entries").delete().eq("user_id", userId);
  if (schedule.entries.length > 0) {
    await supabase.from("schedule_entries").insert(
      schedule.entries.map((e) => ({
        user_id: userId,
        day_of_week: e.dayOfWeek,
        activity_id: e.activityId,
        completed: e.completed,
        duration_minutes: e.durationMinutes ?? null,
        completed_maps: e.completedMaps ?? null,
        assigned_maps: e.assignedMaps ?? null,
      }))
    );
  }
}

export { encodeScheduleForShare } from "@/lib/schedule-store";
