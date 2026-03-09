import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Schedule } from "@/lib/types";
import { loadSchedule, saveSchedule, decodeScheduleFromShare } from "@/lib/schedule-store";
import { toast } from "sonner";

interface ScheduleContextType {
  schedule: Schedule;
  updateSchedule: (partial: Partial<Schedule>) => void;
}

const ScheduleContext = createContext<ScheduleContextType | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [schedule, setSchedule] = useState<Schedule>(() => {
    const params = new URLSearchParams(window.location.search);
    const planData = params.get("plan");
    if (planData) {
      const decoded = decodeScheduleFromShare(planData);
      if (decoded) {
        toast.info("Načten sdílený plán!", { description: "Můžeš si ho uložit nebo upravit." });
        window.history.replaceState({}, "", window.location.pathname);
        return decoded;
      }
    }
    return loadSchedule();
  });

  useEffect(() => {
    saveSchedule(schedule);
  }, [schedule]);

  const updateSchedule = (partial: Partial<Schedule>) => {
    setSchedule((prev) => ({ ...prev, ...partial }));
  };

  return (
    <ScheduleContext.Provider value={{ schedule, updateSchedule }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error("useSchedule must be used within ScheduleProvider");
  return ctx;
}
