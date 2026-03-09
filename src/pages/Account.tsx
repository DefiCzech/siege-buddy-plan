import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useSchedule } from "@/hooks/use-schedule";
import { encodeScheduleForShare } from "@/lib/schedule-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Check, User, Lock, Mail, Share2, Download, Upload, Trash2 } from "lucide-react";
import { MfaSettings } from "@/components/MfaSettings";

const Account = () => {
  const { user, signOut } = useAuth();
  const { schedule, completions, updateSchedule, addCompletion } = useSchedule();

  const [displayName, setDisplayName] = useState("");
  const [loadingName, setLoadingName] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

  const [copied, setCopied] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [includeStats, setIncludeStats] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
      });
  }, [user]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoadingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("user_id", user.id);
    setLoadingName(false);
    if (error) toast.error("Nepodařilo se uložit přezdívku");
    else toast.success("Přezdívka uložena");
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingEmail(true);
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: window.location.origin }
    );
    setLoadingEmail(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Ověřovací email odeslán na novou adresu");
      setNewEmail("");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Hesla se neshodují");
      return;
    }
    setLoadingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoadingPassword(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Heslo bylo změněno");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleShare = () => {
    const encoded = encodeScheduleForShare(schedule);
    const url = `${window.location.origin}?plan=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Odkaz zkopírován do schránky!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Export all data as JSON
  const handleExport = () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      schedule: {
        name: schedule.name,
        categories: schedule.categories,
        activities: schedule.activities,
        entries: schedule.entries,
      },
      completions,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `r6s-trainer-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exportována!");
  };

  // Import data from JSON file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.schedule || !data.version) {
          toast.error("Neplatný formát souboru");
          return;
        }

        // Import schedule
        updateSchedule({
          name: data.schedule.name,
          categories: data.schedule.categories || [],
          activities: data.schedule.activities || [],
          entries: data.schedule.entries || [],
        });

        // Import completions
        if (data.completions?.length) {
          data.completions.forEach((c: any) => {
            addCompletion({
              activityId: c.activityId,
              completedDate: c.completedDate,
              durationMinutes: c.durationMinutes,
              completedMaps: c.completedMaps,
            });
          });
        }

        toast.success(`Importováno: ${data.schedule.activities?.length || 0} aktivit, ${data.completions?.length || 0} splnění`);
      } catch {
        toast.error("Chyba při čtení souboru");
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteText !== "SMAZAT") return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Chyba při mazání účtu");
      }

      toast.success("Účet byl smazán");
      await signOut();
    } catch (err: any) {
      toast.error(err.message || "Nepodařilo se smazat účet");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8 space-y-8">
      <h2 className="text-xl font-mono font-bold text-foreground">Nastavení účtu</h2>

      {/* Display Name */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-mono text-primary">
          <User className="h-4 w-4" />
          Přezdívka
        </div>
        <form onSubmit={handleUpdateName} className="flex gap-2">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tvoje přezdívka"
            className="bg-secondary border-border"
          />
          <Button type="submit" disabled={loadingName} size="sm">
            {loadingName ? "..." : "Uložit"}
          </Button>
        </form>
      </section>

      <Separator />

      {/* Email */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-mono text-primary">
          <Mail className="h-4 w-4" />
          Email
        </div>
        <p className="text-xs text-muted-foreground">
          Aktuální: <span className="text-foreground">{user?.email}</span>
        </p>
        <form onSubmit={handleUpdateEmail} className="flex gap-2">
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Nový email"
            className="bg-secondary border-border"
            required
            autoComplete="email"
          />
          <Button type="submit" disabled={loadingEmail} size="sm">
            {loadingEmail ? "..." : "Změnit"}
          </Button>
        </form>
      </section>

      <Separator />

      {/* Password */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-mono text-primary">
          <Lock className="h-4 w-4" />
          Změna hesla
        </div>
        <form onSubmit={handleUpdatePassword} className="space-y-2 max-w-sm">
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nové heslo"
            className="bg-secondary border-border"
            required
            minLength={6}
            autoComplete="new-password"
          />
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Potvrdit nové heslo"
            className="bg-secondary border-border"
            required
            minLength={6}
            autoComplete="new-password"
          />
          <Button type="submit" disabled={loadingPassword} size="sm">
            {loadingPassword ? "..." : "Změnit heslo"}
          </Button>
        </form>
      </section>

      <Separator />

      {/* 2FA */}
      <MfaSettings />

      <Separator />

      {/* Share plan */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-mono text-primary">
          <Share2 className="h-4 w-4" />
          Sdílení plánu
        </div>
        <p className="text-xs text-muted-foreground">
          Vygeneruj odkaz s hash kódem tvého tréninkového plánu a sdílej ho s kýmkoliv.
        </p>
        <Button onClick={handleShare} variant="outline" className="gap-2 border-primary/30 hover:border-primary">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Zkopírováno!" : "Zkopírovat odkaz na plán"}
        </Button>
      </section>

      <Separator />

      {/* Export / Import */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-mono text-primary">
          <Download className="h-4 w-4" />
          Export & Import dat
        </div>
        <p className="text-xs text-muted-foreground">
          Exportuj všechna svá data (plán, aktivity, kategorie, splněné tréninky) jako JSON soubor.
          Tento soubor můžeš později importovat pod novým účtem.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExport} variant="outline" className="gap-2 border-primary/30 hover:border-primary">
            <Download className="h-4 w-4" />
            Exportovat data
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-primary/30 hover:border-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Importovat data
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </section>

      <Separator />

      {/* Delete account */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-mono text-destructive">
          <Trash2 className="h-4 w-4" />
          Smazat účet
        </div>
        <p className="text-xs text-muted-foreground">
          Trvale smaže tvůj účet a všechna data. Tuto akci nelze vrátit zpět.
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="gap-2"
          onClick={() => setDeleteConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Smazat účet
        </Button>
      </section>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-mono text-destructive">SMAZAT ÚČET</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tato akce je nevratná. Všechna tvoje data budou trvale smazána.
              <br /><br />
              Pro potvrzení napiš <span className="font-mono font-bold text-foreground">SMAZAT</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder='Napiš "SMAZAT"'
              className="bg-secondary border-border"
              autoComplete="off"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteText("");
                }}
              >
                Zrušit
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteText !== "SMAZAT" || deleting}
                onClick={handleDeleteAccount}
              >
                {deleting ? "Mažu..." : "Smazat účet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Account;
