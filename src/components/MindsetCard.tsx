import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Brain, Pencil, Plus, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MindsetItem {
  id: string;
  text: string;
  sort_order: number;
}

export function MindsetCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<MindsetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editItems, setEditItems] = useState<MindsetItem[]>([]);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadItems();
  }, [user]);

  const loadItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_mindset_items")
      .select("id, text, sort_order")
      .eq("user_id", user.id)
      .order("sort_order");
    setItems(data || []);
    setLoading(false);
  };

  const openEdit = () => {
    setEditItems([...items]);
    setNewText("");
    setEditOpen(true);
  };

  const addItem = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    setEditItems((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, text: trimmed, sort_order: prev.length },
    ]);
    setNewText("");
  };

  const removeItem = (id: string) => {
    setEditItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItemText = (id: string, text: string) => {
    setEditItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= editItems.length) return;
    const updated = [...editItems];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setEditItems(updated);
  };

  const saveItems = async () => {
    if (!user) return;
    setSaving(true);

    // Delete all existing items and re-insert
    await supabase.from("user_mindset_items").delete().eq("user_id", user.id);

    const toInsert = editItems
      .filter((i) => i.text.trim())
      .map((i, idx) => ({
        user_id: user.id,
        text: i.text.trim(),
        sort_order: idx,
      }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from("user_mindset_items").insert(toInsert);
      if (error) {
        toast({ title: "Chyba při ukládání", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    await loadItems();
    setSaving(false);
    setEditOpen(false);
  };

  if (loading) return null;

  return (
    <>
      <div className="rounded-lg border border-border bg-card/50 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-mono font-bold tracking-wider text-sm text-muted-foreground flex items-center gap-2">
            <Brain className="h-4 w-4" />
            🧠 MINDSET
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={openEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Klikni na tužku a přidej si věci, na které myslet během hry.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              <Brain className="h-4 w-4" />
              UPRAVIT MINDSET
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Věci, na které je potřeba během hry pořád myslet.
            </p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {editItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-1.5">
                  <div className="flex flex-col">
                    <button
                      className="text-muted-foreground hover:text-foreground p-0.5 disabled:opacity-30"
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0}
                    >
                      <GripVertical className="h-3 w-3 rotate-180" />
                    </button>
                    <button
                      className="text-muted-foreground hover:text-foreground p-0.5 disabled:opacity-30"
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === editItems.length - 1}
                    >
                      <GripVertical className="h-3 w-3" />
                    </button>
                  </div>
                  <Input
                    value={item.text}
                    onChange={(e) => updateItemText(item.id, e.target.value)}
                    className="bg-secondary border-border text-sm h-8"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nová položka..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                className="bg-secondary border-border text-sm h-8"
              />
              <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={addItem}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button onClick={saveItems} disabled={saving} className="w-full">
              {saving ? "Ukládám..." : "Uložit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
