import { useState } from "react";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { Category, DEFAULT_CATEGORY_COLORS } from "@/lib/types";
import { generateId } from "@/lib/schedule-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Video, X } from "lucide-react";

interface Props {
  categories: Category[];
  onChange: (categories: Category[]) => void;
}

const COLOR_OPTIONS = DEFAULT_CATEGORY_COLORS;

export function CategoryManager({ categories, onChange }: Props) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", icon: "", color: COLOR_OPTIONS[0], videoUrls: [] as string[] });
  const [newVideoUrl, setNewVideoUrl] = useState("");

  const resetForm = () => {
    setForm({ name: "", icon: "", color: COLOR_OPTIONS[0], videoUrls: [] });
    setNewVideoUrl("");
    setEditingCategory(null);
    setShowForm(false);
  };

  const openAdd = () => {
    const nextColor = COLOR_OPTIONS[categories.length % COLOR_OPTIONS.length];
    setForm({ name: "", icon: "", color: nextColor, videoUrls: [] });
    setNewVideoUrl("");
    setEditingCategory(null);
    setShowForm(true);
  };

  const openEdit = (c: Category) => {
    setForm({ name: c.name, icon: c.icon, color: c.color, videoUrls: c.videoUrls || [] });
    setNewVideoUrl("");
    setEditingCategory(c);
    setShowForm(true);
  };

  const addVideoUrl = () => {
    const url = newVideoUrl.trim();
    if (!url) return;
    setForm({ ...form, videoUrls: [...form.videoUrls, url] });
    setNewVideoUrl("");
  };

  const removeVideoUrl = (index: number) => {
    setForm({ ...form, videoUrls: form.videoUrls.filter((_, i) => i !== index) });
  };

  const saveCategory = () => {
    if (!form.name.trim()) return;
    const data: Category = {
      id: editingCategory?.id || generateId(),
      name: form.name.trim(),
      icon: form.icon.trim() || "📌",
      color: form.color,
      videoUrls: form.videoUrls.length > 0 ? form.videoUrls : undefined,
    };
    if (editingCategory) {
      onChange(categories.map((c) => (c.id === data.id ? data : c)));
    } else {
      onChange([...categories, data]);
    }
    resetForm();
  };

  const removeCategory = async (id: string) => {
    const ok = await confirm({ message: "Opravdu chceš smazat tuto kategorii?" });
    if (!ok) return;
    onChange(categories.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-mono font-bold tracking-wider">// KATEGORIE</h2>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Přidat
        </Button>
      </div>

      <div className="space-y-1">
        {categories.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 p-2.5 rounded bg-secondary/50 hover:bg-secondary transition-colors group"
          >
            <span className="text-xl">{c.icon}</span>
            <span className={`text-xs px-2 py-0.5 rounded border font-mono ${c.color}`}>
              {c.name}
            </span>
            <span className="flex-1" />
            <Button size="icon" variant="ghost" onClick={() => openEdit(c)} className="h-7 w-7">
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => removeCategory(c.id)} className="h-7 w-7 text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Žádné kategorie. Přidej první!</p>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">{editingCategory ? "UPRAVIT KATEGORII" : "NOVÁ KATEGORIE"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1 block">Ikona / Emoji</label>
              <Input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="🎯 nebo ⚡ ..."
                className="bg-secondary border-border text-xl"
                maxLength={4}
              />
              <p className="text-xs text-muted-foreground mt-1">Vlož emoji nebo krátký text (max 4 znaky)</p>
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1 block">Název</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Název kategorie..."
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1 block">Barva</label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    className={`h-10 rounded border-2 transition-all ${color} ${
                      form.color === color ? "ring-2 ring-primary ring-offset-2 ring-offset-card border-foreground/50" : "border-transparent"
                    }`}
                  >
                    <span className="text-xs font-mono">Aa</span>
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={saveCategory} className="w-full">
              {editingCategory ? "Uložit" : "Přidat"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}
