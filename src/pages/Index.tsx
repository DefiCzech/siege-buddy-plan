import { useState, useEffect } from "react";
import { Schedule } from "@/lib/types";
import { loadSchedule, saveSchedule, decodeScheduleFromShare } from "@/lib/schedule-store";
import { ActivityManager } from "@/components/ActivityManager";
import { WeeklySchedule } from "@/components/WeeklySchedule";
import { CategoryManager } from "@/components/CategoryManager";
import { ShareButton } from "@/components/ShareButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Crosshair, Calendar, Settings, Tags, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
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

  const completedToday = schedule.entries.filter((e) => e.completed).length;
  const totalEntries = schedule.entries.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crosshair className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-sm font-mono font-bold tracking-widest text-primary">R6S TRAINER</h1>
              <p className="text-xs text-muted-foreground">Tréninkový plán</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {totalEntries > 0 && (
              <div className="text-xs font-mono text-muted-foreground">
                <span className="text-success">{completedToday}</span>/{totalEntries} hotovo
              </div>
            )}
            <ShareButton schedule={schedule} />
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger value="schedule" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Rozvrh
            </TabsTrigger>
            <TabsTrigger value="activities" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-3.5 w-3.5" />
              Aktivity
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Tags className="h-3.5 w-3.5" />
              Kategorie
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Input
                  value={schedule.name}
                  onChange={(e) => updateSchedule({ name: e.target.value })}
                  className="text-lg font-mono font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              {schedule.activities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <AlertTriangle className="h-8 w-8 mx-auto opacity-50" />
                  <p>Nejdříve si přidej tréninky v záložce "Aktivity"</p>
                </div>
              ) : (
                <WeeklySchedule
                  activities={schedule.activities}
                  categories={schedule.categories}
                  entries={schedule.entries}
                  onChange={(entries) => updateSchedule({ entries })}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="activities">
            <ActivityManager
              activities={schedule.activities}
              categories={schedule.categories}
              onChange={(activities) => updateSchedule({ activities })}
            />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManager
              categories={schedule.categories}
              onChange={(categories) => updateSchedule({ categories })}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
