import { useState } from "react";
import { FriendData } from "@/hooks/use-friends";
import { DAY_NAMES } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus, X, CheckCircle2, Circle, Users, ChevronDown, ChevronUp } from "lucide-react";
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
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayIdx = (new Date().getDay() + 6) % 7;

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

  return (
    <div className="space-y-2">
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

      {/* Compact friend chips in a flex-wrap layout */}
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
            <div key={friend.userId} className="relative">
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

              {/* Expanded popover-like detail */}
              {isExpanded && (
                <FriendDetail
                  friend={friend}
                  todayIdx={todayIdx}
                  todayStr={todayStr}
                  onRemove={(e) => handleRemove(e, friend)}
                  onClose={() => setExpandedFriend(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {ConfirmDialog}
    </div>
  );
}

function FriendDetail({
  friend,
  todayIdx,
  todayStr,
  onRemove,
  onClose,
}: {
  friend: FriendData;
  todayIdx: number;
  todayStr: string;
  onRemove: (e: React.MouseEvent) => void;
  onClose: () => void;
}) {
  const todayEntries = friend.schedule.entries.filter((e) => e.dayOfWeek === todayIdx);
  const todayCompletions = friend.completions.filter((c) => c.completedDate === todayStr);
  const isCompleted = (activityId: string) =>
    todayCompletions.some((c) => c.activityId === activityId);

  const getActivity = (id: string) => friend.schedule.activities.find((a) => a.id === id);
  const getCategory = (id: string) => friend.schedule.categories.find((c) => c.id === id);

  return (
    <div className="absolute top-full left-0 mt-1 z-20 w-56 rounded-lg border border-border bg-card shadow-lg p-2.5 space-y-2">
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
              <div
                key={entry.activityId}
                className={`text-[11px] flex items-center gap-1.5 py-0.5 ${done ? "opacity-50" : ""}`}
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
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-0.5 pt-1">
        {DAY_NAMES.map((name, idx) => {
          const dayEntries = friend.schedule.entries.filter((e) => e.dayOfWeek === idx);
          const isToday = idx === todayIdx;
          return (
            <div
              key={idx}
              className={`flex-1 text-center text-[9px] font-mono py-0.5 rounded ${
                isToday
                  ? "bg-primary/20 text-primary font-bold"
                  : dayEntries.length > 0
                  ? "bg-secondary text-muted-foreground"
                  : "text-muted-foreground/20"
              }`}
            >
              {name.slice(0, 2)}
            </div>
          );
        })}
      </div>

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
