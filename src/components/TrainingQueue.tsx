import { useState } from "react";
import { ScheduleEntry, TrainingActivity, Category, R6S_MAPS, R6S_OPERATORS } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, X, Map, Shield, GripVertical, ArrowUp, ArrowDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  activities: TrainingActivity[];
  categories: Category[];
  entries: ScheduleEntry[];
  onChange: (entries: ScheduleEntry[]) => void;
}

export function TrainingQueue({ activities, categories, entries, onChange }: Props) {
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const getCategory = (id: string) => categories.find((c) => c.id === id);
  const getActivity = (id: string) => activities.find((a) => a.id === id);

  // Sort entries by dayOfWeek (used as sortOrder)
  const sorted = [...entries].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  const addEntry = (activityId: string) => {
    if (entries.some((e) => e.activityId === activityId)) return;
    const maxOrder = entries.length > 0 ? Math.max(...entries.map((e) => e.dayOfWeek)) + 1 : 0;
    onChange([...entries, { dayOfWeek: maxOrder, activityId }]);
  };

  const confirmRemove = () => {
    if (!pendingRemove) return;
    const filtered = entries.filter((e) => e.activityId !== pendingRemove);
    onChange(filtered.map((e, i) => ({ ...e, dayOfWeek: i })));
    setPendingRemove(null);
  };

  const moveEntry = (activityId: string, direction: -1 | 1) => {
    const idx = sorted.findIndex((e) => e.activityId === activityId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const reordered = [...sorted];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    onChange(reordered.map((e, i) => ({ ...e, dayOfWeek: i })));
  };

  const toggleAssignedMap = (activityId: string, mapName: string) => {
    onChange(
      entries.map((e) => {
        if (e.activityId !== activityId) return e;
        const current = e.assignedMaps || [];
        const updated = current.includes(mapName)
          ? current.filter((m) => m !== mapName)
          : [...current, mapName];
        return { ...e, assignedMaps: updated.length > 0 ? updated : undefined };
      })
    );
  };

  const toggleAssignedOperator = (activityId: string, opName: string) => {
    onChange(
      entries.map((e) => {
        if (e.activityId !== activityId) return e;
        const current = e.assignedOperators || [];
        const updated = current.includes(opName)
          ? current.filter((o) => o !== opName)
          : [...current, opName];
        return { ...e, assignedOperators: updated.length > 0 ? updated : undefined };
      })
    );
  };

  const updateDuration = (activityId: string, minutes: number | undefined) => {
    onChange(
      entries.map((e) =>
        e.activityId === activityId ? { ...e, durationMinutes: minutes } : e
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-mono font-bold tracking-wider">// TRÉNINKOVÝ PLÁN</h2>
        <Select onValueChange={addEntry}>
          <SelectTrigger className="w-auto gap-1.5 h-8 text-xs font-mono border-primary/30 hover:border-primary">
            <Plus className="h-3.5 w-3.5" />
            <span>Přidat</span>
          </SelectTrigger>
          <SelectContent>
            {activities
              .filter((a) => !entries.some((e) => e.activityId === a.id))
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

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Zatím žádné položky. Přidej aktivity do plánu.
        </p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map((entry, idx) => {
            const act = getActivity(entry.activityId);
            if (!act) return null;
            const cat = getCategory(act.categoryId);
            const colorClass = cat?.color || "bg-muted text-muted-foreground border-border";
            const isMapActivity = act.activityType === "map-learning";
            const isOperatorActivity = act.activityType === "operator-training";

            return (
              <div
                key={entry.activityId}
                className={`rounded border p-3 flex items-start gap-2 ${colorClass}`}
              >
                <span className="text-xs font-mono font-bold opacity-50 mt-0.5 shrink-0 w-5 text-center">
                  {idx + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1 text-sm font-medium">
                    {cat && <span>{cat.icon}</span>}
                    {act.name}
                  </div>
                  {act.description && (
                    <p className="text-xs mt-0.5 opacity-70">{act.description}</p>
                  )}
                  {entry.assignedMaps && entry.assignedMaps.length > 0 && (
                    <p className="text-[10px] opacity-70 mt-0.5">
                      📋 {entry.assignedMaps.join(", ")}
                    </p>
                  )}
                  {entry.assignedOperators && entry.assignedOperators.length > 0 && (
                    <p className="text-[10px] opacity-70 mt-0.5">
                      🛡️ {entry.assignedOperators.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {isMapActivity && (
                    <MapAssignPopover
                      assignedMaps={entry.assignedMaps || []}
                      onToggle={(map) => toggleAssignedMap(entry.activityId, map)}
                    />
                  )}
                  {isOperatorActivity && (
                    <OperatorAssignPopover
                      assignedOperators={entry.assignedOperators || []}
                      onToggle={(op) => toggleAssignedOperator(entry.activityId, op)}
                    />
                  )}
                  <button
                    onClick={() => moveEntry(entry.activityId, -1)}
                    className="hover:text-foreground disabled:opacity-30 p-0.5"
                    disabled={idx === 0}
                    title="Posunout nahoru"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveEntry(entry.activityId, 1)}
                    className="hover:text-foreground disabled:opacity-30 p-0.5"
                    disabled={idx === sorted.length - 1}
                    title="Posunout dolů"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setPendingRemove(entry.activityId)}
                    className="hover:text-destructive p-0.5"
                    title="Odebrat"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!pendingRemove} onOpenChange={(open) => !open && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odebrat aktivitu</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chceš odebrat tuto aktivitu z plánu?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Odebrat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MapAssignPopover({
  assignedMaps,
  onToggle,
}: {
  assignedMaps: string[];
  onToggle: (map: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="hover:text-foreground transition-colors p-0.5" title="Přiřadit mapy">
          <Map className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 max-h-64 overflow-y-auto" align="end">
        <p className="text-xs font-mono font-bold mb-2">Mapy:</p>
        <p className="text-[10px] text-muted-foreground font-mono mb-1">RANKED</p>
        {R6S_MAPS.filter((m) => m.ranked).map((map) => (
          <label key={map.name} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-secondary/50 cursor-pointer">
            <Checkbox checked={assignedMaps.includes(map.name)} onCheckedChange={() => onToggle(map.name)} />
            <span>{map.name}</span>
          </label>
        ))}
        <div className="my-1.5 border-t border-border" />
        <p className="text-[10px] text-muted-foreground font-mono mb-1">OSTATNÍ</p>
        {R6S_MAPS.filter((m) => !m.ranked).map((map) => (
          <label key={map.name} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-secondary/50 cursor-pointer">
            <Checkbox checked={assignedMaps.includes(map.name)} onCheckedChange={() => onToggle(map.name)} />
            <span>{map.name}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function OperatorAssignPopover({
  assignedOperators,
  onToggle,
}: {
  assignedOperators: string[];
  onToggle: (op: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="hover:text-foreground transition-colors p-0.5" title="Přiřadit operátory">
          <Shield className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 max-h-72 overflow-y-auto" align="end">
        <p className="text-xs font-mono font-bold mb-2">Operátoři:</p>
        <p className="text-[10px] text-muted-foreground font-mono mb-1">⚔️ ÚTOK</p>
        {R6S_OPERATORS.filter((o) => o.side === "attack").map((op) => (
          <label key={op.name} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-secondary/50 cursor-pointer">
            <Checkbox checked={assignedOperators.includes(op.name)} onCheckedChange={() => onToggle(op.name)} />
            <span>{op.name}</span>
          </label>
        ))}
        <div className="my-1.5 border-t border-border" />
        <p className="text-[10px] text-muted-foreground font-mono mb-1">🛡️ OBRANA</p>
        {R6S_OPERATORS.filter((o) => o.side === "defense").map((op) => (
          <label key={op.name} className="flex items-center gap-2 text-xs p-1 rounded hover:bg-secondary/50 cursor-pointer">
            <Checkbox checked={assignedOperators.includes(op.name)} onCheckedChange={() => onToggle(op.name)} />
            <span>{op.name}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}
