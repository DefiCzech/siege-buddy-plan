import { useState } from "react";
import { useSchedule } from "@/hooks/use-schedule";
import { useFriends } from "@/hooks/use-friends";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Info, ExternalLink, Loader2, BarChart3 } from "lucide-react";
import { R6S_MAPS, R6S_OPERATORS } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FriendTracker } from "@/components/FriendTracker";
import { TrainingStats } from "@/components/TrainingStats";

const Index = () => {
  const { schedule, completions, addCompletion, loading } = useSchedule();
  const { friends, loadingFriends, addFriend, removeFriend } = useFriends();
  const [completingEntry, setCompletingEntry] = useState<string | null>(null);
  const [duration, setDuration] = useState("");
  const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [detailActivityId, setDetailActivityId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [mapFilter, setMapFilter] = useState<"all" | "ranked" | "unranked">("ranked");
  const [opFilter, setOpFilter] = useState<"all" | "attack" | "defense">("all");

  if (loading) {
    return (
      <main className="container max-w-6xl mx-auto px-4 py-24 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const todayEntries = schedule.entries.filter((e) => e.dayOfWeek === todayIdx);
  const todayCompletions = completions.filter((c) => c.completedDate === todayStr);
  const isCompletedToday = (activityId: string) =>
    todayCompletions.some((c) => c.activityId === activityId);
  const completedToday = todayEntries.filter((e) => isCompletedToday(e.activityId)).length;
  const remainingToday = todayEntries.filter((e) => !isCompletedToday(e.activityId));

  const getActivity = (id: string) => schedule.activities.find((a) => a.id === id);
  const getCategory = (id: string) => schedule.categories.find((c) => c.id === id);

  const getVideoEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return url;
  };

  const completingActivity = completingEntry ? getActivity(completingEntry) : null;
  const completingEntryData = completingEntry
    ? schedule.entries.find((e) => e.dayOfWeek === todayIdx && e.activityId === completingEntry)
    : null;
  const isMapLearning = completingActivity?.activityType === "map-learning";
  const isOperatorTraining = completingActivity?.activityType === "operator-training";
  const hasAssignedMaps = (completingEntryData?.assignedMaps?.length ?? 0) > 0;
  const hasAssignedOperators = (completingEntryData?.assignedOperators?.length ?? 0) > 0;

  const completeToday = () => {
    if (!completingEntry) return;
    const mins = parseInt(duration) || 0;
    const mapsToSave = hasAssignedMaps
      ? completingEntryData!.assignedMaps!
      : selectedMaps.length > 0
      ? selectedMaps
      : undefined;

    addCompletion({
      activityId: completingEntry,
      completedDate: todayStr,
      durationMinutes: mins > 0 ? mins : undefined,
      completedMaps: isMapLearning ? mapsToSave : undefined,
    });

    setCompletingEntry(null);
    setDuration("");
    setSelectedMaps([]);
    setSelectedOperators([]);
  };

  const toggleMap = (map: string) => {
    setSelectedMaps((prev) =>
      prev.includes(map) ? prev.filter((m) => m !== map) : [...prev, map]
    );
  };

  const toggleOperator = (op: string) => {
    setSelectedOperators((prev) =>
      prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]
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
                <div
                  key={entry.activityId}
                  className={`rounded border p-3 ${colorClass} cursor-pointer hover:opacity-90 transition-opacity`}
                  onClick={() => (act.description || act.videoUrl) && setDetailActivityId(act.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {cat && <span>{cat.icon}</span>}
                        {act.name}
                      </div>
                      {entry.assignedMaps && entry.assignedMaps.length > 0 && (
                        <p className="text-xs font-mono font-bold text-primary mt-1">
                          📋 {entry.assignedMaps.join(", ")}
                        </p>
                      )}
                      {entry.assignedOperators && entry.assignedOperators.length > 0 && (
                        <p className="text-xs font-mono font-bold text-primary mt-1">
                          🛡️ {entry.assignedOperators.join(", ")}
                        </p>
                      )}
                      {act.description && (
                        <p className="text-xs mt-1 opacity-70">{act.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs shrink-0 w-full sm:w-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompletingEntry(entry.activityId);
                        setDuration("");
                        setSelectedMaps([]);
                        setSelectedOperators([]);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Splnit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats section */}
      <div className="mt-4 px-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground font-mono gap-1.5"
          onClick={() => setShowStats(true)}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          📊 Moje statistiky
        </Button>
      </div>

      {/* Friend tracker */}
      <div className="mt-2 px-1">
        <FriendTracker
          friends={friends}
          loading={loadingFriends}
          onAddFriend={addFriend}
          onRemoveFriend={removeFriend}
        />
      </div>

      {/* Complete dialog */}
      <Dialog open={!!completingEntry} onOpenChange={(open) => !open && setCompletingEntry(null)}>
        <DialogContent className="bg-card border-border max-w-md">
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
                onKeyDown={(e) => e.key === "Enter" && !isMapLearning && completeToday()}
                className="bg-secondary border-border"
                autoFocus
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
            {isMapLearning && !hasAssignedMaps && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Které mapy jsi se učil/a?</p>
                </div>
                <Tabs defaultValue="ranked" className="mb-2">
                  <TabsList className="h-7">
                    <TabsTrigger value="ranked" className="text-xs h-6" onClick={() => setMapFilter("ranked")}>Ranked</TabsTrigger>
                    <TabsTrigger value="all" className="text-xs h-6" onClick={() => setMapFilter("all")}>Všechny</TabsTrigger>
                    <TabsTrigger value="unranked" className="text-xs h-6" onClick={() => setMapFilter("unranked")}>Mimo ranked</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {R6S_MAPS
                    .filter((m) => mapFilter === "all" ? true : mapFilter === "ranked" ? m.ranked : !m.ranked)
                    .map((map) => (
                    <label
                      key={map.name}
                      className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-secondary/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedMaps.includes(map.name)}
                        onCheckedChange={() => toggleMap(map.name)}
                      />
                      {map.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {isOperatorTraining && !hasAssignedOperators && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Které operátory jsi trénoval/a?</p>
                </div>
                <Tabs defaultValue="all" className="mb-2">
                  <TabsList className="h-7">
                    <TabsTrigger value="all" className="text-xs h-6" onClick={() => setOpFilter("all")}>Všichni</TabsTrigger>
                    <TabsTrigger value="attack" className="text-xs h-6" onClick={() => setOpFilter("attack")}>Útok</TabsTrigger>
                    <TabsTrigger value="defense" className="text-xs h-6" onClick={() => setOpFilter("defense")}>Obrana</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {R6S_OPERATORS
                    .filter((o) => opFilter === "all" ? true : o.side === opFilter)
                    .map((op) => (
                    <label
                      key={op.name}
                      className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-secondary/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedOperators.includes(op.name)}
                        onCheckedChange={() => toggleOperator(op.name)}
                      />
                      {op.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
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

      {/* My stats dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="bg-card border-border max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              MOJE STATISTIKY
            </DialogTitle>
          </DialogHeader>
          <TrainingStats completions={completions} activities={schedule.activities} categories={schedule.categories} />
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Index;
