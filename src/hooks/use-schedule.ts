import { useState, useEffect } from "react";
import { Schedule } from "@/lib/types";
import { loadSchedule, saveSchedule, decodeScheduleFromShare } from "@/lib/schedule-store";
import { toast } from "sonner";

export function useSchedule() {
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

  return { schedule, updateSchedule };
}
