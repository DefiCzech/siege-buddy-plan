import { useState } from "react";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { TrainingActivity, Category, ActivityType } from "@/lib/types";
import { generateId } from "@/lib/schedule-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Video, FileText, ExternalLink } from "lucide-react";

interface Props {
  activities: TrainingActivity[];
  categories: Category[];
  onChange: (activities: TrainingActivity[]) => void;
}

export function ActivityManager({ activities, categories, onChange }: Props) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<TrainingActivity | null>(null);
  const [form, setForm] = useState({ name: "", categoryId: categories[0]?.id || "", perex: "", description: "", videoUrl: "", activityType: "default" as ActivityType, durationMinutes: "" });
  const [detailActivity, setDetailActivity] = useState<TrainingActivity | null>(null);

  const getCategory = (id: string) => categories.find((c) => c.id === id);

  const resetForm = () => {
    setForm({ name: "", categoryId: categories[0]?.id || "", perex: "", description: "", videoUrl: "", activityType: "default", durationMinutes: "" });
    setEditingActivity(null);
    setShowForm(false);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (a: TrainingActivity) => {
    setForm({ name: a.name, categoryId: a.categoryId, perex: a.perex || "", description: a.description || "", videoUrl: a.videoUrl || "", activityType: a.activityType || "default", durationMinutes: a.durationMinutes?.toString() || "" });
    setEditingActivity(a);
    setShowForm(true);
  };

  const saveActivity = () => {
    if (!form.name.trim()) return;
    const parsedDuration = parseInt(form.durationMinutes);
    const data: TrainingActivity = {
      id: editingActivity?.id || generateId(),
      name: form.name.trim(),
      categoryId: form.categoryId,
      perex: form.perex.trim() || undefined,
      description: form.description.trim() || undefined,
      videoUrl: form.videoUrl.trim() || undefined,
      activityType: form.activityType !== "default" ? form.activityType : undefined,
      durationMinutes: !isNaN(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined,
    };
    if (editingActivity) {
      onChange(activities.map((a) => (a.id === data.id ? data : a)));
    } else {
      onChange([...activities, data]);
    }
    resetForm();
  };

  const removeActivity = async (id: string) => {
    const ok = await confirm({ message: "Opravdu chceš smazat tuto aktivitu?" });
    if (!ok) return;
    onChange(activities.filter((a) => a.id !== id));
  };

  const getVideoEmbedUrl = (url: string): string | null => {
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
      return null;
    } catch {
      return null;
    }
  };

  const renderCategoryBadge = (categoryId: string) => {
    const cat = getCategory(categoryId);
    if (!cat) return null;
    return (
      <span className={`text-xs px-2 py-0.5 rounded border font-mono shrink-0 inline-flex items-center gap-1 ${cat.color}`}>
        <span>{cat.icon}</span>
        {cat.name}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-mono font-bold tracking-wider">// TRÉNINKY</h2>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Přidat
        </Button>
      </div>

      <div className="space-y-1">
        {activities.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 p-2.5 rounded bg-secondary/50 hover:bg-secondary transition-colors group cursor-pointer"
            onClick={() => setDetailActivity(a)}
          >
            {renderCategoryBadge(a.categoryId)}
            <span className="flex-1 text-sm font-medium">{a.name}</span>
            <div className="flex items-center gap-1">
              {a.videoUrl && <Video className="h-3.5 w-3.5 text-primary opacity-60" />}
              {a.description && <FileText className="h-3.5 w-3.5 text-muted-foreground opacity-60" />}
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(a); }} className="h-7 w-7">
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); removeActivity(a.id); }} className="h-7 w-7 text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Zatím žádné aktivity. Přidej první!</p>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">{editingActivity ? "UPRAVIT AKTIVITU" : "NOVÁ AKTIVITA"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1 block">Název</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Název tréninku..."
                className="bg-secondary border-border"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1 block">Kategorie</label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="inline-flex items-center gap-1.5">
                        <span>{cat.icon}</span>
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1 block">Perex (krátký popis, viditelný v přehledu)</label>
              <Input
                value={form.perex}
                onChange={(e) => setForm({ ...form, perex: e.target.value })}
                placeholder="Krátký popis tréninku..."
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1 block">Detailní popis (viditelný po rozkliku)</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Podrobný popis tréninku, tipy, na co se zaměřit..."
                className="bg-secondary border-border min-h-[100px] resize-y"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1 block">Video URL (YouTube)</label>
              <Input
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground mb-1 block">Typ aktivity</label>
              <Select value={form.activityType} onValueChange={(v) => setForm({ ...form, activityType: v as ActivityType })}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Standardní</SelectItem>
                  <SelectItem value="map-learning">Učení map (výběr map při dokončení)</SelectItem>
                  <SelectItem value="operator-training">Trénink operátorů (výběr operátorů)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveActivity} className="w-full">
              {editingActivity ? "Uložit" : "Přidat"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailActivity} onOpenChange={(open) => !open && setDetailActivity(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          {detailActivity && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  {renderCategoryBadge(detailActivity.categoryId)}
                  <DialogTitle className="font-mono text-base">{detailActivity.name}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                {detailActivity.perex && (
                  <p className="text-sm text-muted-foreground">{detailActivity.perex}</p>
                )}
                {detailActivity.description && (
                  <div>
                    <p className="text-xs font-mono text-muted-foreground mb-1">Detailní popis</p>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{detailActivity.description}</p>
                  </div>
                )}
                {detailActivity.videoUrl && (
                  <div>
                    <p className="text-xs font-mono text-muted-foreground mb-2">Video</p>
                    {(() => {
                      const embedUrl = getVideoEmbedUrl(detailActivity.videoUrl);
                      if (embedUrl) {
                        return (
                          <div className="aspect-video rounded overflow-hidden border border-border">
                            <iframe
                              src={embedUrl}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        );
                      }
                      return (
                        <a
                          href={detailActivity.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Otevřít video
                        </a>
                      );
                    })()}
                  </div>
                )}
                {!detailActivity.perex && !detailActivity.description && !detailActivity.videoUrl && (
                  <p className="text-sm text-muted-foreground text-center py-4">Žádné detaily. Uprav aktivitu pro přidání popisu nebo videa.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
}
