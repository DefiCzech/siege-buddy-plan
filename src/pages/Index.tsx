import { useState, useEffect } from "react";
import { Schedule, DAY_NAMES, ScheduleEntry } from "@/lib/types";
import { loadSchedule, saveSchedule, decodeScheduleFromShare } from "@/lib/schedule-store";
import { ActivityManager } from "@/components/ActivityManager";
import { WeeklySchedule } from "@/components/WeeklySchedule";
import { CategoryManager } from "@/components/CategoryManager";
import { ShareButton } from "@/components/ShareButton";
import { TrainingStats } from "@/components/TrainingStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crosshair, Calendar, Settings, Tags, AlertTriangle, CheckCircle2, Clock, Info, ExternalLink, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [completingEntry, setCompletingEntry] = useState<string | null>(null);
  const [duration, setDuration] = useState("");
  const [detailActivityId, setDetailActivityId] = useState<string | null>(null);

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

  const todayIdx = (new Date().getDay() + 6) % 7; // JS Sunday=0 → our Monday=0
  const todayName = DAY_NAMES[todayIdx];
  const todayEntries = schedule.entries.filter((e) => e.dayOfWeek === todayIdx);
  const completedToday = todayEntries.filter((e) => e.completed).length;
  const remainingToday = todayEntries.filter((e) => !e.completed);

  const getActivity = (id: string) => schedule.activities.find((a) => a.id === id);
  const getCategory = (id: string) => schedule.categories.find((c) => c.id === id);
  const getVideoEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return url;
  };

  const completeToday = () => {
    if (!completingEntry) return;
    const mins = parseInt(duration) || 0;
    updateSchedule({
      entries: schedule.entries.map((e) =>
        e.dayOfWeek === todayIdx && e.activityId === completingEntry
          ? { ...e, completed: true, durationMinutes: mins > 0 ? mins : undefined }
          : e
      ),
    });
    setCompletingEntry(null);
    setDuration("");
  };

  const detailActivity = detailActivityId ? getActivity(detailActivityId) : null;
  const detailCategory = detailActivity ? getCategory(detailActivity.categoryId) : null;

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
            {todayEntries.length > 0 && (
              <div className="text-xs font-mono text-muted-foreground">
                <span className="text-success">{completedToday}</span>/{todayEntries.length} hotovo
              </div>
            )}
            <ShareButton schedule={schedule} />
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6">
        {/* Today's overview */}
        <div className="mb-6 rounded border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-mono font-bold tracking-wider text-sm">
              // DNES — {todayName.toUpperCase()}
            </h2>
            {todayEntries.length > 0 && completedToday === todayEntries.length && (
              <span className="text-xs font-mono text-success">✓ VŠE HOTOVO</span>
            )}
          </div>
          {remainingToday.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {todayEntries.length === 0
                ? "Na dnes nemáš naplánovaný žádný trénink."
                : "Všechny dnešní tréninky jsou splněné! 💪"}
            </p>
          ) : (
            <div className="space-y-2">
              {remainingToday.map((entry) => {
                const act = getActivity(entry.activityId);
                if (!act) return null;
                const cat = getCategory(act.categoryId);
                const colorClass = cat?.color || "bg-muted text-muted-foreground border-border";
                return (
                  <div key={entry.activityId} className={`rounded border p-3 ${colorClass}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {cat && <span>{cat.icon}</span>}
                        {act.name}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(act.description || act.videoUrl) && (
                          <button
                            onClick={() => setDetailActivityId(act.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Zobrazit detail"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => { setCompletingEntry(entry.activityId); setDuration(""); }}
                          className="text-muted-foreground hover:text-success transition-colors"
                          title="Označit jako hotové"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {act.description && (
                      <p className="text-xs mt-1 opacity-70">{act.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Complete dialog */}
        <Dialog open={!!completingEntry} onOpenChange={(open) => !open && setCompletingEntry(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-mono">DOKONČIT TRÉNINK</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Jak dlouho jsi trénoval/a? (volitelné)</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Minuty"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && completeToday()}
                  className="bg-secondary border-border"
                  autoFocus
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
              <Button onClick={completeToday} className="w-full">Dokončit</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Detail dialog */}
        <Dialog open={!!detailActivityId} onOpenChange={(open) => !open && setDetailActivityId(null)}>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-mono flex items-center gap-2">
                {detailCategory && <span>{detailCategory.icon}</span>}
                {detailActivity?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {detailActivity?.description && (
                <p className="text-sm text-muted-foreground">{detailActivity.description}</p>
              )}
              {detailActivity?.videoUrl && (
                <div className="space-y-2">
                  <div className="aspect-video rounded overflow-hidden border border-border">
                    <iframe
                      src={getVideoEmbedUrl(detailActivity.videoUrl)}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                  <a
                    href={detailActivity.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> Otevřít video
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
            <TabsTrigger value="stats" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              Statistiky
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
