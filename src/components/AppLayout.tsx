import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { useSchedule } from "@/hooks/use-schedule";

export function AppLayout() {
  const { schedule, completions } = useSchedule();
  const allEntries = schedule.entries;
  const completedCount = allEntries.filter((e) =>
    completions.some((c) => c.activityId === e.activityId)
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        schedule={schedule}
        completedToday={completedCount}
        totalToday={allEntries.length}
      />
      <Outlet />
    </div>
  );
}
