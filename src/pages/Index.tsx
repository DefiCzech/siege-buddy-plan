import { useState } from "react";
import { useSchedule } from "@/hooks/use-schedule";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Info, ExternalLink } from "lucide-react";
import { R6S_MAPS } from "@/lib/types";

const Index = () => {
  const { schedule, updateSchedule } = useSchedule();
  const [completingEntry, setCompletingEntry] = useState<string | null>(null);
  const [duration, setDuration] = useState("");
  const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
  const [detailActivityId, setDetailActivityId] = useState<string | null>(null);

  const todayIdx = (new Date().getDay() + 6) % 7;
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

  const completingActivity = completingEntry ? getActivity(completingEntry) : null;
  const isMapLearning = completingActivity?.activityType === "map-learning";

  const completeToday = () => {
    if (!completingEntry) return;
    const mins = parseInt(duration) || 0;
    updateSchedule({
      entries: schedule.entries.map((e) =>
        e.dayOfWeek === todayIdx && e.activityId === completingEntry
          ? {
              ...e,
              completed: true,
              durationMinutes: mins > 0 ? mins : undefined,
              completedMaps: isMapLearning && selectedMaps.length > 0 ? selectedMaps : undefined,
            }
          : e
      ),
    });
    setCompletingEntry(null);
    setDuration("");
    setSelectedMaps([]);
  };

  const toggleMap = (map: string) => {
    setSelectedMaps((prev) =>
      prev.includes(map) ? prev.filter((m) => m !== map) : [...prev, map]
    );
  };

  const detailActivity = detailActivityId ? getActivity(detailActivityId) : null;
  const detailCategory = detailActivity ? getCategory(detailActivity.categoryId) : null;

  return (
    <main className="container max-w-6xl mx-auto px-4 py-6">
      <div className="rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 space-y-4 shadow-lg shadow-primary/5">
        <div className="flex items-center justify-between">
          <h2 className="font-mono font-bold tracking-wider text-base text-primary">
            🎯 CO TĚ DNES ČEKÁ
          </h2>
          {todayEntries.length > 0 && completedToday === todayEntries.length && (
            <span className="text-xs font-mono text-success">✓ MÁME HOTOVO, JDI HRÁT 🎮</span>
          )}
        </div>
        {remainingToday.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {todayEntries.length === 0
              ? "Dneska volno? Nebo ses bál si něco naplánovat? 😏"
              : "Vše odtrénováno — teď můžeš bez výčitek rankovat! 🏆"}
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
    </main>
  );
};

export default Index;
