import { useMemo } from "react";
import { ScheduleEntry, TrainingActivity, Category, DAY_NAMES } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { Plus, CheckCircle2, Clock, X } from "lucide-react";

interface Props {
  activities: TrainingActivity[];
  categories: Category[];
  entries: ScheduleEntry[];
  onChange: (entries: ScheduleEntry[]) => void;
}

// Compute Easter Sunday using Anonymous Gregorian algorithm
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

export function WeeklySchedule({ activities, categories, entries, onChange }: Props) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const getCategory = (id: string) => categories.find((c) => c.id === id);


  const addEntry = (dayOfWeek: number, activityId: string) => {
    if (entries.some((e) => e.dayOfWeek === dayOfWeek && e.activityId === activityId)) return;
    onChange([...entries, { dayOfWeek, activityId, completed: false }]);
  };

  const removeEntry = async (dayOfWeek: number, activityId: string) => {
    const ok = await confirm({ message: "Opravdu chceš odebrat tuto aktivitu z rozvrhu?" });
    if (!ok) return;
    onChange(entries.filter((e) => !(e.dayOfWeek === dayOfWeek && e.activityId === activityId)));
  };


  const getActivity = (id: string) => activities.find((a) => a.id === id);
  const dayEntries = (day: number) => entries.filter((e) => e.dayOfWeek === day);

  // Czech public holidays for current year
  const holidays = useMemo(() => {
    const year = new Date().getFullYear();
    const easterDate = getEasterDate(year);
    const easterFriday = new Date(easterDate);
    easterFriday.setDate(easterFriday.getDate() - 2);
    const easterMonday = new Date(easterDate);
    easterMonday.setDate(easterMonday.getDate() + 1);

    const fixed = [
      new Date(year, 0, 1), // Nový rok
      new Date(year, 4, 1), // Svátek práce
      new Date(year, 4, 8), // Den vítězství
      new Date(year, 6, 5), // Cyril a Metoděj
      new Date(year, 6, 6), // Jan Hus
      new Date(year, 8, 28), // Den české státnosti
      new Date(year, 9, 28), // Den vzniku ČSR
      new Date(year, 10, 17), // Den boje za svobodu
      new Date(year, 11, 24), // Štědrý den
      new Date(year, 11, 25), // 1. svátek vánoční
      new Date(year, 11, 26), // 2. svátek vánoční
    ];
    return [...fixed, easterFriday, easterMonday];
  }, []);

  // Get dates for the current week (Mon-Sun)
  const weekDates = useMemo(() => {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    return DAY_NAMES.map((_, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      return d;
    });
  }, []);

  const isHoliday = (dayIdx: number) =>
    holidays.some((h) => h.toDateString() === weekDates[dayIdx]?.toDateString());

  const isWeekend = (dayIdx: number) => dayIdx >= 5; // Saturday=5, Sunday=6

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-mono font-bold tracking-wider">// TÝDENNÍ ROZVRH</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
        {DAY_NAMES.map((dayName, dayIdx) => {
          const de = dayEntries(dayIdx);
          const allDone = de.length > 0 && de.every((e) => e.completed);
          const weekend = isWeekend(dayIdx);
          const holiday = isHoliday(dayIdx);
          const dateStr = weekDates[dayIdx]
            ? `${weekDates[dayIdx].getDate()}.${weekDates[dayIdx].getMonth() + 1}.`
            : "";

          let borderClass = "border-border bg-card";
          if (allDone) borderClass = "border-success/50 bg-success/5";
          else if (holiday) borderClass = "border-primary/50 bg-primary/5";
          else if (weekend) borderClass = "border-accent/50 bg-accent/10";

          return (
            <div
              key={dayIdx}
              className={`rounded border p-3 space-y-2 transition-colors ${borderClass}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-sm font-bold tracking-wide">
                  {dayName}
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">{dateStr}</span>
                  {holiday && <span className="ml-1 text-[10px]">🎌</span>}
                </h3>
                <div className="flex items-center gap-1">
                  {allDone && <CheckCircle2 className="h-4 w-4 text-success" />}
                  <Select onValueChange={(v) => addEntry(dayIdx, v)}>
                    <SelectTrigger className="h-6 w-6 p-0 border-none bg-transparent text-muted-foreground hover:text-foreground">
                      <Plus className="h-3.5 w-3.5" />
                    </SelectTrigger>
                    <SelectContent>
                      {activities
                        .filter((a) => !de.some((e) => e.activityId === a.id))
                        .map((a) => {
                          const cat = getCategory(a.categoryId);
                          return (
                            <SelectItem key={a.id} value={a.id}>
                              <span className="inline-flex items-center gap-1">
                                {cat && <span>{cat.icon}</span>}
                                {a.name}
                              </span>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                {de.map((entry) => {
                  const act = getActivity(entry.activityId);
                  if (!act) return null;
                  const cat = getCategory(act.categoryId);
                  const colorClass = cat?.color || "bg-muted text-muted-foreground border-border";
                  return (
                    <div
                      key={entry.activityId}
                      className={`text-xs p-1.5 rounded border flex items-start gap-1 ${colorClass}`}
                    >
                      <div className="flex-1">
                        <div className="inline-flex items-center gap-1">
                          {cat && <span>{cat.icon}</span>}
                          {act.name}
                        </div>
                        {entry.completed && entry.durationMinutes && (
                          <div className="flex items-center gap-0.5 mt-0.5 opacity-70">
                            <Clock className="h-2.5 w-2.5" />
                            {entry.durationMinutes} min
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeEntry(dayIdx, entry.activityId)}
                        className="hover:text-destructive shrink-0"
                        title="Odebrat"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <ConfirmDialog />
    </div>
  );
}
