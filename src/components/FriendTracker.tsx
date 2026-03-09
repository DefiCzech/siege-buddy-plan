import { useState } from "react";
import { FriendData } from "@/hooks/use-friends";
import { DAY_NAMES } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus, X, CheckCircle2, Circle, Users } from "lucide-react";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

interface Props {
  friends: FriendData[];
  loading: boolean;
  onAddFriend: (code: string) => void;
  onRemoveFriend: (userId: string) => void;
}

export function FriendTracker({ friends, loading, onAddFriend, onRemoveFriend }: Props) {
  const [friendCode, setFriendCode] = useState("");
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayIdx = (new Date().getDay() + 6) % 7;

  const handleAdd = () => {
    if (!friendCode.trim()) return;
    onAddFriend(friendCode);
    setFriendCode("");
  };

  const handleRemove = async (friend: FriendData) => {
    const ok = await confirm({ message: `Opravdu chceš přestat sledovat ${friend.displayName}?` });
    if (ok) onRemoveFriend(friend.userId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-mono text-primary">
        <Users className="h-4 w-4" />
        SLEDOVÁNÍ KAMARÁDŮ
      </div>

      {/* Add friend input */}
      <div className="flex gap-2">
        <Input
          placeholder="Vlož kód kamaráda..."
          value={friendCode}
          onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="bg-secondary border-border font-mono text-sm uppercase tracking-wider"
          maxLength={8}
        />
        <Button onClick={handleAdd} size="sm" className="gap-1.5 shrink-0">
          <UserPlus className="h-4 w-4" />
          Přidat
        </Button>
      </div>

      {/* Friend cards */}
      {loading && <p className="text-xs text-muted-foreground">Načítání...</p>}

      {friends.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground">
          Zatím nikoho nesleduješ. Požádej kamaráda o jeho kód!
        </p>
      )}

      {friends.map((friend) => {
        const todayEntries = friend.schedule.entries.filter((e) => e.dayOfWeek === todayIdx);
        const todayCompletions = friend.completions.filter((c) => c.completedDate === todayStr);
        const isCompleted = (activityId: string) =>
          todayCompletions.some((c) => c.activityId === activityId);
        const completedCount = todayEntries.filter((e) => isCompleted(e.activityId)).length;
        const allDone = todayEntries.length > 0 && completedCount === todayEntries.length;

        const getActivity = (id: string) => friend.schedule.activities.find((a) => a.id === id);
        const getCategory = (id: string) => friend.schedule.categories.find((c) => c.id === id);

        return (
          <div
            key={friend.userId}
            className="rounded-lg border border-border bg-card p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold">{friend.displayName}</span>
                {allDone && <span className="text-xs text-success font-mono">✓ HOTOVO</span>}
                {todayEntries.length > 0 && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {completedCount}/{todayEntries.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleRemove(friend)}
                className="text-muted-foreground hover:text-destructive transition-colors"
                title="Přestat sledovat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {todayEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">Dnes nemá nic naplánováno</p>
            ) : (
              <div className="space-y-1">
                {todayEntries.map((entry) => {
                  const act = getActivity(entry.activityId);
                  if (!act) return null;
                  const cat = getCategory(act.categoryId);
                  const done = isCompleted(entry.activityId);
                  const completion = todayCompletions.find((c) => c.activityId === entry.activityId);
                  const colorClass = cat?.color || "bg-muted text-muted-foreground border-border";

                  return (
                    <div
                      key={entry.activityId}
                      className={`text-xs p-2 rounded border flex items-center gap-2 ${colorClass} ${
                        done ? "opacity-60" : ""
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 opacity-40" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="inline-flex items-center gap-1">
                          {cat && <span>{cat.icon}</span>}
                          <span className={done ? "line-through" : ""}>{act.name}</span>
                        </span>
                        {done && completion?.durationMinutes && (
                          <span className="ml-2 opacity-70">{completion.durationMinutes} min</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Weekly overview - compact */}
            <div className="flex gap-1 pt-1">
              {DAY_NAMES.map((name, idx) => {
                const dayEntries = friend.schedule.entries.filter((e) => e.dayOfWeek === idx);
                const isToday = idx === todayIdx;
                return (
                  <div
                    key={idx}
                    className={`flex-1 text-center text-[10px] font-mono py-0.5 rounded ${
                      isToday
                        ? "bg-primary/20 text-primary font-bold"
                        : dayEntries.length > 0
                        ? "bg-secondary text-muted-foreground"
                        : "text-muted-foreground/30"
                    }`}
                    title={`${name}: ${dayEntries.length} aktivit`}
                  >
                    {name.slice(0, 2)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {ConfirmDialog}
    </div>
  );
}
