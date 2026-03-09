import { useState } from "react";
import { ScheduleEntry, TrainingActivity, Category, DAY_NAMES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, CheckCircle2, Clock, X } from "lucide-react";

interface Props {
  activities: TrainingActivity[];
  categories: Category[];
  entries: ScheduleEntry[];
  onChange: (entries: ScheduleEntry[]) => void;
}

export function WeeklySchedule({ activities, categories, entries, onChange }: Props) {
  const [completingEntry, setCompletingEntry] = useState<{ day: number; actId: string } | null>(null);
  const [duration, setDuration] = useState("");

  const getCategory = (id: string) => categories.find((c) => c.id === id);

  const addEntry = (dayOfWeek: number, activityId: string) => {
    if (entries.some((e) => e.dayOfWeek === dayOfWeek && e.activityId === activityId)) return;
    onChange([...entries, { dayOfWeek, activityId, completed: false }]);
  };

  const removeEntry = (dayOfWeek: number, activityId: string) => {
    onChange(entries.filter((e) => !(e.dayOfWeek === dayOfWeek && e.activityId === activityId)));
  };

  const completeEntry = () => {
    if (!completingEntry) return;
    const mins = parseInt(duration) || 0;
    onChange(
      entries.map((e) =>
        e.dayOfWeek === completingEntry.day && e.activityId === completingEntry.actId
          ? { ...e, completed: true, durationMinutes: mins > 0 ? mins : undefined }
          : e
      )
    );
    setCompletingEntry(null);
    setDuration("");
  };

  const uncompleteEntry = (dayOfWeek: number, activityId: string) => {
    onChange(
      entries.map((e) =>
        e.dayOfWeek === dayOfWeek && e.activityId === activityId
          ? { ...e, completed: false, durationMinutes: undefined }
          : e
      )
    );
  };

  const getActivity = (id: string) => activities.find((a) => a.id === id);
  const dayEntries = (day: number) => entries.filter((e) => e.dayOfWeek === day);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-mono font-bold tracking-wider">// TÝDENNÍ ROZVRH</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
        {DAY_NAMES.map((dayName, dayIdx) => {
          const de = dayEntries(dayIdx);
          const allDone = de.length > 0 && de.every((e) => e.completed);

          return (
            <div
              key={dayIdx}
              className={`rounded border p-3 space-y-2 transition-colors ${
                allDone ? "border-success/50 bg-success/5" : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-sm font-bold tracking-wide">{dayName}</h3>
                {allDone && <CheckCircle2 className="h-4 w-4 text-success" />}
              </div>

              <div className="space-y-1 min-h-[60px]">
                {de.map((entry) => {
                  const act = getActivity(entry.activityId);
                  if (!act) return null;
                  const cat = getCategory(act.categoryId);
                  const colorClass = cat?.color || "bg-muted text-muted-foreground border-border";
                  return (
                    <div
                      key={entry.activityId}
                      className={`text-xs p-1.5 rounded border flex items-start gap-1 group relative ${colorClass}`}
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
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!entry.completed ? (
                          <button
                            onClick={() => {
                              setCompletingEntry({ day: dayIdx, actId: entry.activityId });
                              setDuration("");
                            }}
                            className="hover:text-success"
                            title="Označit jako hotové"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() => uncompleteEntry(dayIdx, entry.activityId)}
                            className="hover:text-foreground"
                            title="Zrušit dokončení"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={() => removeEntry(dayIdx, entry.activityId)}
                          className="hover:text-destructive"
                          title="Odebrat"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Select onValueChange={(v) => addEntry(dayIdx, v)}>
                <SelectTrigger className="h-7 text-xs bg-secondary/50 border-border">
                  <Plus className="h-3 w-3 mr-1" />
                  <span className="text-muted-foreground">Přidat</span>
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
          );
        })}
      </div>

      <Dialog open={!!completingEntry} onOpenChange={(open) => !open && setCompletingEntry(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">DOKONČIT TRÉNINK</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Jak dlouho jsi trénoval/a? (volitelné)
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Minuty"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && completeEntry()}
                className="bg-secondary border-border"
                autoFocus
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
            <Button onClick={completeEntry} className="w-full">
              Dokončit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
