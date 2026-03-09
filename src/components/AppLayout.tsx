import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { useSchedule } from "@/hooks/use-schedule";


export function AppLayout() {
  const { schedule } = useSchedule();
  const todayIdx = (new Date().getDay() + 6) % 7;
  const todayEntries = schedule.entries.filter((e) => e.dayOfWeek === todayIdx);
  const completedToday = todayEntries.filter((e) => e.completed).length;

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
