import { useState } from "react";
import { useSchedule } from "@/hooks/use-schedule";
import { useFriends } from "@/hooks/use-friends";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Info, ExternalLink, Loader2, BarChart3, GripVertical } from "lucide-react";
import { R6S_MAPS, R6S_OPERATORS, ScheduleEntry } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FriendTracker } from "@/components/FriendTracker";
import { MindsetCard } from "@/components/MindsetCard";
import { TrainingStats } from "@/components/TrainingStats";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


interface SortableEntryItemProps {
  entry: ScheduleEntry;
  act: { id: string; name: string; categoryId: string; perex?: string; description?: string; videoUrl?: string };
  cat: { icon: string; color: string } | undefined;
  onComplete: (activityId: string) => void;
  onDetail: (activityId: string) => void;
}

function SortableEntryItem({ entry, act, cat, onComplete, onDetail }: SortableEntryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.activityId });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined, opacity: isDragging ? 0.8 : 1 };
  const colorClass = cat?.color || "bg-muted text-muted-foreground border-border";

  return (
    <div ref={setNodeRef} style={style} className={`rounded border p-3 ${colorClass} hover:opacity-90 transition-opacity ${isDragging ? "shadow-lg" : ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing p-0.5 -ml-1 opacity-50 hover:opacity-100">
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => (act.description || act.videoUrl || act.perex) && onDetail(act.id)}>
            <div className="flex items-center gap-2 text-sm font-medium">
              {cat && <span>{cat.icon}</span>}
              {act.name}
              {entry.durationMinutes && (
                <span className="text-[10px] font-mono opacity-60">⏱️ {entry.durationMinutes} min</span>
              )}
            </div>
            {entry.assignedMaps && entry.assignedMaps.length > 0 && (
              <p className="text-xs font-mono font-bold text-primary mt-1">📋 {entry.assignedMaps.join(", ")}</p>
            )}
            {entry.assignedOperators && entry.assignedOperators.length > 0 && (
              <p className="text-xs font-mono font-bold text-primary mt-1">🛡️ {entry.assignedOperators.join(", ")}</p>
            )}
            {act.perex && <p className="text-xs mt-1 opacity-70">{act.perex}</p>}
          </div>
        </div>
        <Button
          size="sm"
          variant="default"
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs shrink-0 w-full sm:w-auto"
          onClick={(e) => { e.stopPropagation(); onComplete(entry.activityId); }}
        >
          <CheckCircle2 className="h-4 w-4" />
          Splnit
        </Button>
      </div>
    </div>
  );
}

interface SortableEntryListProps {
  entries: ScheduleEntry[];
  getActivity: (id: string) => any;
  getCategory: (id: string) => any;
  onComplete: (activityId: string) => void;
  onDetail: (activityId: string) => void;
  onReorder: (entries: ScheduleEntry[]) => void;
}

function SortableEntryList({ entries, getActivity, getCategory, onComplete, onDetail, onReorder }: SortableEntryListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = entries.findIndex((e) => e.activityId === active.id);
    const newIndex = entries.findIndex((e) => e.activityId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...entries];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    onReorder(reordered);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={entries.map((e) => e.activityId)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {entries.map((entry) => {
            const act = getActivity(entry.activityId);
            if (!act) return null;
            const cat = getCategory(act.categoryId);
            return <SortableEntryItem key={entry.activityId} entry={entry} act={act} cat={cat} onComplete={onComplete} onDetail={onDetail} />;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

const Index = () => {
  const { schedule, completions, addCompletion, updateSchedule, loading } = useSchedule();
  const { friends, loadingFriends, addFriend, removeFriend } = useFriends();
  const [completingEntry, setCompletingEntry] = useState<string | null>(null);
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
  // All entries sorted by order, show uncompleted ones first
  const allEntries = [...schedule.entries].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const isCompleted = (activityId: string) =>
    completions.some((c) => c.activityId === activityId && c.completedDate === todayStr);
  const completedCount = allEntries.filter((e) => isCompleted(e.activityId)).length;
  const remainingEntries = allEntries.filter((e) => !isCompleted(e.activityId));
  const completedEntries = allEntries.filter((e) => isCompleted(e.activityId));
  const totalRemainingMinutes = remainingEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

  const getActivity = (id: string) => schedule.activities.find((a) => a.id === id);
  const getCategory = (id: string) => schedule.categories.find((c) => c.id === id);

  const getVideoEmbedUrl = (url: string) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
        let videoId: string | null = null;
        let startSeconds = 0;
        if (u.hostname.includes("youtu.be")) {
          videoId = u.pathname.slice(1);
        } else {
          videoId = u.searchParams.get("v");
        }
        const tParam = u.searchParams.get("t");
        if (tParam) {
          startSeconds = parseInt(tParam.replace("s", "")) || 0;
        }
        if (videoId) {
          return `https://www.youtube-nocookie.com/embed/${videoId}${startSeconds ? `?start=${startSeconds}` : ""}`;
        }
      }
      return url;
    } catch {
      return url;
    }
  };

  const completingActivity = completingEntry ? getActivity(completingEntry) : null;
  const completingEntryData = completingEntry
    ? schedule.entries.find((e) => e.activityId === completingEntry)
    : null;
  const isMapLearning = completingActivity?.activityType === "map-learning";
  const isOperatorTraining = completingActivity?.activityType === "operator-training";
  const hasAssignedMaps = (completingEntryData?.assignedMaps?.length ?? 0) > 0;
  const hasAssignedOperators = (completingEntryData?.assignedOperators?.length ?? 0) > 0;

  const completeToday = () => {
    if (!completingEntry) return;
    const entryDuration = completingEntryData?.durationMinutes;
    const mapsToSave = hasAssignedMaps
      ? completingEntryData!.assignedMaps!
      : selectedMaps.length > 0
      ? selectedMaps
      : undefined;

    addCompletion({
      activityId: completingEntry,
      completedDate: todayStr,
      durationMinutes: entryDuration ?? undefined,
      completedMaps: isMapLearning ? mapsToSave : undefined,
    });

    setCompletingEntry(null);
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
    <main className="container max-w-6xl mx-auto px-4 py-6 space-y-4">
      <MindsetCard />
      <div className="rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 space-y-4 shadow-lg shadow-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-mono font-bold tracking-wider text-base text-primary">
              🎯 CO TĚ ČEKÁ
            </h2>
            {totalRemainingMinutes > 0 && remainingEntries.length > 0 && (
              <span className="text-xs font-mono text-muted-foreground">⏱️ {totalRemainingMinutes} min</span>
            )}
          </div>
          {allEntries.length > 0 && completedCount === allEntries.length && (
            <span className="text-xs font-mono text-success">✓ VŠE HOTOVO! 🎮</span>
          )}
          {allEntries.length > 0 && completedCount < allEntries.length && (
            <span className="text-xs font-mono text-muted-foreground">{completedCount}/{allEntries.length}</span>
          )}
        </div>
        {remainingEntries.length === 0 && completedEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nemáš nic v plánu. Přidej aktivity v nastavení! 😏
          </p>
        ) : remainingEntries.length === 0 && completedEntries.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Vše odtrénováno — teď můžeš bez výčitek rankovat! 🏆
          </p>
        ) : (
          <SortableEntryList
            entries={remainingEntries}
            getActivity={getActivity}
            getCategory={getCategory}
            onComplete={(activityId) => {
              setCompletingEntry(activityId);
              setSelectedMaps([]);
              setSelectedOperators([]);
            }}
            onDetail={(activityId) => {
              const act = getActivity(activityId);
              if (act && (act.description || act.videoUrl || act.perex)) setDetailActivityId(act.id);
            }}
            onReorder={(reordered) => {
              const cEntries = allEntries.filter((e) => isCompleted(e.activityId));
              const newEntries = [...reordered, ...cEntries].map((e, i) => ({ ...e, dayOfWeek: i }));
              updateSchedule({ entries: newEntries });
            }}
          />
        )}

        {completedEntries.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border/50">
            <p className="text-xs font-mono text-muted-foreground opacity-60">✅ SPLNĚNO DNES</p>
            {completedEntries.map((entry) => {
              const act = getActivity(entry.activityId);
              if (!act) return null;
              const cat = getCategory(act.categoryId);
              const colorClass = cat?.color || "bg-muted text-muted-foreground border-border";
              return (
                <div key={entry.activityId} className={`rounded border p-3 ${colorClass} opacity-40 hover:opacity-60 transition-opacity`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => (act.description || act.videoUrl || act.perex) && setDetailActivityId(act.id)}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium line-through">
                        {cat && <span>{cat.icon}</span>}
                        {act.name}
                        {entry.durationMinutes && (
                          <span className="text-[10px] font-mono opacity-60">⏱️ {entry.durationMinutes} min</span>
                        )}
                      </div>
                      {act.perex && <p className="text-xs mt-1 opacity-70">{act.perex}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 font-mono text-xs shrink-0 w-full sm:w-auto opacity-70"
                      onClick={() => {
                        setCompletingEntry(entry.activityId);
                        setSelectedMaps([]);
                        setSelectedOperators([]);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Znovu
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
             {completingEntryData?.durationMinutes && (
               <p className="text-sm text-muted-foreground">⏱️ Přiřazený čas: <strong>{completingEntryData.durationMinutes} min</strong></p>
             )}
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
            {detailActivity?.perex && (
              <p className="text-sm text-muted-foreground">{detailActivity.perex}</p>
            )}
            {detailActivity?.description && (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{detailActivity.description}</p>
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
