import { useState, useEffect } from "react";
import { FriendData } from "@/hooks/use-friends";
import { ScheduleEntry } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, X, CheckCircle2, Circle, Users, ExternalLink, BarChart3 } from "lucide-react";
import { TrainingStats } from "@/components/TrainingStats";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

interface Props {
  friends: FriendData[];
  loading: boolean;
  onAddFriend: (code: string) => void;
  onRemoveFriend: (userId: string) => void;
}

export function FriendTracker({ friends, loading, onAddFriend, onRemoveFriend }: Props) {
  const [friendCode, setFriendCode] = useState("");
  const [expandedFriend, setExpandedFriend] = useState<string | null>(null);
  const [showAddInput, setShowAddInput] = useState(false);
  const [detailEntry, setDetailEntry] = useState<{ friendId: string; activityId: string } | null>(null);
  const [statsFriend, setStatsFriend] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayIdx = (new Date().getDay() + 6) % 7;

  useEffect(() => {
    if (!expandedFriend) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedFriend(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [expandedFriend]);

  const handleAdd = () => {
    if (!friendCode.trim()) return;
    onAddFriend(friendCode);
    setFriendCode("");
    setShowAddInput(false);
  };

  const handleRemove = async (e: React.MouseEvent, friend: FriendData) => {
    e.stopPropagation();
    const ok = await confirm({ message: `Opravdu chceš přestat sledovat ${friend.displayName}?` });
    if (ok) onRemoveFriend(friend.userId);
  };

  const getVideoEmbedUrl = (url: string) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return url;
  };

  // Resolve detail dialog data
  const detailFriend = detailEntry ? friends.find((f) => f.userId === detailEntry.friendId) : null;
  const detailActivity = detailFriend?.schedule.activities.find((a) => a.id === detailEntry?.activityId);
  const detailCategory = detailActivity ? detailFriend?.schedule.categories.find((c) => c.id === detailActivity.categoryId) : null;
  const detailEntryData = detailFriend?.schedule.entries.find(
    (e) => e.dayOfWeek === todayIdx && e.activityId === detailEntry?.activityId
  );
  const detailCompletion = detailFriend?.completions.find(
    (c) => c.activityId === detailEntry?.activityId && c.completedDate === todayStr
  );

  return (
    <div className="space-y-2">
      {expandedFriend && (
        <div className="fixed inset-0 z-10" onClick={() => setExpandedFriend(null)} />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
          <Users className="h-3 w-3" />
          KAMARÁDI
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowAddInput(!showAddInput)}
        >
          <UserPlus className="h-3 w-3 mr-1" />
          Přidat
        </Button>
      </div>

      {showAddInput && (
        <div className="flex gap-1.5">
          <Input
            placeholder="Kód kamaráda..."
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="bg-secondary border-border font-mono text-xs uppercase tracking-wider h-7"
            maxLength={8}
            autoFocus
          />
          <Button onClick={handleAdd} size="sm" className="h-7 px-2 text-xs">
            OK
          </Button>
        </div>
      )}

      {loading && <p className="text-xs text-muted-foreground">Načítání...</p>}

      {friends.length === 0 && !loading && !showAddInput && (
        <p className="text-[11px] text-muted-foreground/60">
          Žádní kamarádi. Klikni „Přidat" a vlož kód.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {friends.map((friend) => {
          const todayEntries = friend.schedule.entries.filter((e) => e.dayOfWeek === todayIdx);
          const todayCompletions = friend.completions.filter((c) => c.completedDate === todayStr);
          const isCompleted = (activityId: string) =>
            todayCompletions.some((c) => c.activityId === activityId);
          const completedCount = todayEntries.filter((e) => isCompleted(e.activityId)).length;
          const totalCount = todayEntries.length;
          const allDone = totalCount > 0 && completedCount === totalCount;
          const isExpanded = expandedFriend === friend.userId;

          return (
            <div key={friend.userId} className="relative z-20">
              <button
                onClick={() => setExpandedFriend(isExpanded ? null : friend.userId)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  isExpanded
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {friend.rankImageUrl && (
                  <img src={friend.rankImageUrl} alt="" className="h-3.5 w-3.5" />
                )}
                <span className="font-mono font-medium text-[11px]">{friend.displayName}</span>
                {totalCount === 0 ? (
                  <span className="text-[10px] opacity-50">—</span>
                ) : allDone ? (
                  <CheckCircle2 className="h-3 w-3 text-success" />
                ) : (
                  <span className="text-[10px] font-mono opacity-60">{completedCount}/{totalCount}</span>
                )}
              </button>

              {isExpanded && (
                <FriendDetail
                  friend={friend}
                  todayIdx={todayIdx}
                  todayStr={todayStr}
                  onRemove={(e) => handleRemove(e, friend)}
                  onActivityClick={(activityId) => {
                    setDetailEntry({ friendId: friend.userId, activityId });
                  }}
                  onShowStats={() => {
                    setStatsFriend(friend.userId);
                    setExpandedFriend(null);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Activity detail dialog */}
      <Dialog open={!!detailEntry} onOpenChange={(open) => !open && setDetailEntry(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              {detailCategory && <span>{detailCategory.icon}</span>}
              {detailActivity?.name}
              {detailFriend && (
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  ({detailFriend.displayName})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {detailActivity?.description && (
              <p className="text-sm text-muted-foreground">{detailActivity.description}</p>
            )}

            {/* Assigned maps */}
            {detailEntryData?.assignedMaps && detailEntryData.assignedMaps.length > 0 && (
              <div>
                <p className="text-xs font-mono font-bold text-primary mb-1">📋 Přiřazené mapy na dnes</p>
                <div className="flex flex-wrap gap-1">
                  {detailEntryData.assignedMaps.map((map) => (
                    <span key={map} className="text-xs bg-secondary border border-border rounded px-2 py-0.5 font-mono">
                      {map}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned operators */}
            {detailEntryData?.assignedOperators && detailEntryData.assignedOperators.length > 0 && (
              <div>
                <p className="text-xs font-mono font-bold text-primary mb-1">🛡️ Přiřazení operátoři na dnes</p>
                <div className="flex flex-wrap gap-1">
                  {detailEntryData.assignedOperators.map((op) => (
                    <span key={op} className="text-xs bg-secondary border border-border rounded px-2 py-0.5 font-mono">
                      {op}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Completion info */}
            {detailCompletion && (
              <div className="rounded border border-success/30 bg-success/10 p-3 space-y-1">
                <p className="text-xs font-mono text-success flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Splněno dnes
                </p>
                {detailCompletion.durationMinutes && (
                  <p className="text-xs text-muted-foreground">Doba tréninku: {detailCompletion.durationMinutes} min</p>
                )}
                {detailCompletion.completedMaps && detailCompletion.completedMaps.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Naučené mapy:</p>
                    <div className="flex flex-wrap gap-1">
                      {detailCompletion.completedMaps.map((map) => (
                        <span key={map} className="text-xs bg-success/20 border border-success/30 rounded px-2 py-0.5 font-mono">
                          {map}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Video */}
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

      {/* Friend stats dialog */}
      {(() => {
        const sf = statsFriend ? friends.find((f) => f.userId === statsFriend) : null;
        return (
          <Dialog open={!!statsFriend} onOpenChange={(open) => !open && setStatsFriend(null)}>
            <DialogContent className="bg-card border-border max-w-4xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-mono flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {sf?.displayName} — STATISTIKY
                  {sf?.rankImageUrl && <img src={sf.rankImageUrl} alt="" className="h-5 w-5" />}
                </DialogTitle>
              </DialogHeader>
              {sf && (
                <TrainingStats
                  completions={sf.completions}
                  activities={sf.schedule.activities}
                  categories={sf.schedule.categories}
                />
              )}
            </DialogContent>
          </Dialog>
        );
      })()}

      {ConfirmDialog}
    </div>
  );
}

function FriendDetail({
  friend,
  todayIdx,
  todayStr,
  onRemove,
  onActivityClick,
}: {
  friend: FriendData;
  todayIdx: number;
  todayStr: string;
  onRemove: (e: React.MouseEvent) => void;
  onActivityClick: (activityId: string) => void;
}) {
  const todayEntries = friend.schedule.entries.filter((e) => e.dayOfWeek === todayIdx);
  const todayCompletions = friend.completions.filter((c) => c.completedDate === todayStr);
  const isCompleted = (activityId: string) =>
    todayCompletions.some((c) => c.activityId === activityId);

  const getActivity = (id: string) => friend.schedule.activities.find((a) => a.id === id);
  const getCategory = (id: string) => friend.schedule.categories.find((c) => c.id === id);

  return (
    <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-border bg-card shadow-lg p-2.5 space-y-2">
      {friend.rankName && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {friend.rankImageUrl && <img src={friend.rankImageUrl} alt="" className="h-4 w-4" />}
          <span className="font-mono">{friend.rankName}</span>
        </div>
      )}

      {todayEntries.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Dnes nemá nic naplánováno</p>
      ) : (
        <div className="space-y-0.5">
          {todayEntries.map((entry) => {
            const act = getActivity(entry.activityId);
            if (!act) return null;
            const cat = getCategory(act.categoryId);
            const done = isCompleted(entry.activityId);
            const completion = todayCompletions.find((c) => c.activityId === entry.activityId);

            return (
              <button
                key={entry.activityId}
                onClick={(e) => {
                  e.stopPropagation();
                  onActivityClick(entry.activityId);
                }}
                className={`w-full text-left text-[11px] flex items-center gap-1.5 py-1 px-1 rounded hover:bg-secondary/60 transition-colors cursor-pointer ${done ? "opacity-50" : ""}`}
              >
                {done ? (
                  <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                ) : (
                  <Circle className="h-3 w-3 shrink-0 opacity-30" />
                )}
                {cat && <span className="text-[10px]">{cat.icon}</span>}
                <span className={done ? "line-through" : ""}>{act.name}</span>
                {done && completion?.durationMinutes && (
                  <span className="ml-auto text-[10px] opacity-50">{completion.durationMinutes}m</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={onRemove}
        className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-0.5"
      >
        <X className="h-2.5 w-2.5" />
        Přestat sledovat
      </button>
    </div>
  );
}
