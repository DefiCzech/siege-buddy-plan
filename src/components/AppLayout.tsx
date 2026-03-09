import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { useSchedule } from "@/hooks/use-schedule";

export function AppLayout() {
  const { schedule, completions } = useSchedule();
  const todayIdx = (new Date().getDay() + 6) % 7;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayEntries = schedule.entries.filter((e) => e.dayOfWeek === todayIdx);
  const todayCompletions = completions.filter((c) => c.completedDate === todayStr);
  const completedToday = todayEntries.filter((e) =>
    todayCompletions.some((c) => c.activityId === e.activityId)
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        schedule={schedule}
        completedToday={completedToday}
        totalToday={todayEntries.length}
      />
      <Outlet />
    </div>
  );
}
