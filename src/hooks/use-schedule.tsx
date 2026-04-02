import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
import { Schedule, ScheduleEntry, TrainingActivity, Category, TrainingCompletion, DEFAULT_ACTIVITIES, DEFAULT_CATEGORIES } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { decodeScheduleFromShare, encodeScheduleForShare } from "@/lib/schedule-store";
import { toast } from "sonner";

interface ScheduleContextType {
  schedule: Schedule;
  updateSchedule: (partial: Partial<Schedule>) => void;
  completions: TrainingCompletion[];
  addCompletion: (completion: TrainingCompletion) => void;
  loading: boolean;
}

const ScheduleContext = createContext<ScheduleContextType | null>(null);

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
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
  const [completions, setCompletions] = useState<TrainingCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          await saveScheduleToDb(user.id, decoded);
          setSchedule(decoded);
          setLoading(false);
          return;
        }
      }

      const [scheduleRes, catsRes, actsRes, entriesRes, completionsRes] = await Promise.all([
        supabase.from("user_schedules").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_categories").select("*").eq("user_id", user.id).order("sort_order"),
        supabase.from("user_activities").select("*").eq("user_id", user.id).order("sort_order"),
        supabase.from("schedule_entries").select("*").eq("user_id", user.id),
        supabase.from("training_completions").select("*").eq("user_id", user.id),
      ]);

      const isNew = !scheduleRes.data && (catsRes.data?.length ?? 0) === 0;

      if (isNew) {
        const localData = localStorage.getItem("r6s-schedule");
        let seed: Schedule;
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (!parsed.categories) parsed.categories = [...DEFAULT_CATEGORIES];
            // Strip completion fields from entries during migration
            seed = {
              ...parsed,
              entries: (parsed.entries || []).map((e: any) => ({
                dayOfWeek: e.dayOfWeek,
                activityId: e.activityId,
                assignedMaps: e.assignedMaps,
              })),
            };
          } catch {
            seed = createDefault();
          }
        } else {
          seed = createDefault();
        }
        await saveScheduleToDb(user.id, seed);
        setSchedule(seed);
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
            perex: a.perex ?? undefined,
            description: a.description ?? undefined,
            videoUrl: a.video_url ?? undefined,
            activityType: (a.activity_type === "map-learning" || a.activity_type === "operator-training") ? a.activity_type : "default",
          })),
          entries: (entriesRes.data || []).map((e: any) => ({
            dayOfWeek: e.day_of_week,
            activityId: e.activity_id,
            assignedMaps: e.assigned_maps ?? undefined,
            assignedOperators: e.assigned_operators ?? undefined,
            durationMinutes: e.duration_minutes ?? undefined,
          })),
        };
        setSchedule(loaded);

        setCompletions(
          (completionsRes.data || []).map((c: any) => ({
            id: c.id,
            activityId: c.activity_id,
            completedDate: c.completed_date,
            durationMinutes: c.duration_minutes ?? undefined,
            completedMaps: c.completed_maps ?? undefined,
          }))
        );
      }

      setLoading(false);
    };

    load();
  }, [user]);

  // Save schedule changes to DB with debounce
  const saveToDb = useCallback(
    (newSchedule: Schedule) => {
      if (!user) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        saveScheduleToDb(user.id, newSchedule);
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

  const addCompletion = useCallback(
    async (completion: TrainingCompletion) => {
      if (!user) return;
      setCompletions((prev) => [...prev, completion]);

      const { error } = await supabase.from("training_completions").upsert(
        {
          user_id: user.id,
          activity_id: completion.activityId,
          completed_date: completion.completedDate,
          duration_minutes: completion.durationMinutes ?? null,
          completed_maps: completion.completedMaps ?? null,
        },
        { onConflict: "user_id,activity_id,completed_date" }
      );
      if (error) {
        console.error("Failed to save completion:", error);
        toast.error("Nepodařilo se uložit splnění tréninku");
        // Revert optimistic update
        setCompletions((prev) => prev.filter((c) => c.activityId !== completion.activityId || c.completedDate !== completion.completedDate));
      }
    },
    [user]
  );

  return (
    <ScheduleContext.Provider value={{ schedule, updateSchedule, completions, addCompletion, loading }}>
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

async function saveScheduleToDb(userId: string, schedule: Schedule) {
  await supabase.from("user_schedules").upsert(
    { user_id: userId, name: schedule.name, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

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

  await supabase.from("user_activities").delete().eq("user_id", userId);
  if (schedule.activities.length > 0) {
    await supabase.from("user_activities").insert(
      schedule.activities.map((a, i) => ({
        id: a.id,
        user_id: userId,
        name: a.name,
        category_id: a.categoryId,
        perex: a.perex ?? null,
        description: a.description ?? null,
        video_url: a.videoUrl ?? null,
        activity_type: a.activityType ?? "default",
        sort_order: i,
      }))
    );
  }

  await supabase.from("schedule_entries").delete().eq("user_id", userId);
  if (schedule.entries.length > 0) {
    await supabase.from("schedule_entries").insert(
      schedule.entries.map((e) => ({
        user_id: userId,
        day_of_week: e.dayOfWeek,
        activity_id: e.activityId,
        assigned_maps: e.assignedMaps ?? null,
        assigned_operators: e.assignedOperators ?? null,
        duration_minutes: e.durationMinutes ?? null,
      }))
    );
  }
}

export { encodeScheduleForShare } from "@/lib/schedule-store";
