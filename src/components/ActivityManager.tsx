import { useState } from "react";
import { TrainingActivity, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/types";
import { generateId } from "@/lib/schedule-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";

interface Props {
  activities: TrainingActivity[];
  onChange: (activities: TrainingActivity[]) => void;
}

export function ActivityManager({ activities, onChange }: Props) {
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<TrainingActivity["category"]>("aim");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const addActivity = () => {
    if (!newName.trim()) return;
    onChange([
      ...activities,
      { id: generateId(), name: newName.trim(), category: newCategory, description: newDesc.trim() || undefined },
    ]);
    setNewName("");
    setNewDesc("");
  };

  const removeActivity = (id: string) => {
    onChange(activities.filter((a) => a.id !== id));
  };

  const startEdit = (a: TrainingActivity) => {
    setEditingId(a.id);
    setEditName(a.name);
  };

  const saveEdit = (id: string) => {
    if (!editName.trim()) return;
    onChange(activities.map((a) => (a.id === id ? { ...a, name: editName.trim() } : a)));
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-mono font-bold tracking-wider">// TRÉNINKY</h2>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Název aktivity..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addActivity()}
          className="flex-1 bg-secondary border-border"
        />
        <Select value={newCategory} onValueChange={(v) => setNewCategory(v as TrainingActivity["category"])}>
          <SelectTrigger className="w-full sm:w-[140px] bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={addActivity} size="icon" className="shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1">
        {activities.map((a) => (
          <div key={a.id} className="flex items-center gap-2 p-2 rounded bg-secondary/50 hover:bg-secondary transition-colors group">
            <span className={`text-xs px-2 py-0.5 rounded border font-mono ${CATEGORY_COLORS[a.category]}`}>
              {CATEGORY_LABELS[a.category]}
            </span>
            {editingId === a.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(a.id)}
                  className="flex-1 h-7 bg-muted border-border text-sm"
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={() => saveEdit(a.id)} className="h-7 w-7">
                  <Check className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-7 w-7">
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{a.name}</span>
                {a.description && <span className="text-xs text-muted-foreground hidden sm:inline">{a.description}</span>}
                <Button size="icon" variant="ghost" onClick={() => startEdit(a)} className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => removeActivity(a.id)} className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
