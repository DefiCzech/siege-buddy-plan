import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useSchedule } from "@/hooks/use-schedule";
import { encodeScheduleForShare } from "@/lib/schedule-store";
import { Copy, Check, User, Lock, Mail, Share2 } from "lucide-react";
import { MfaSettings } from "@/components/MfaSettings";

const Account = () => {
  const { user } = useAuth();
  const { schedule } = useSchedule();

  const [displayName, setDisplayName] = useState("");
  const [loadingName, setLoadingName] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPassword, setLoadingPassword] = useState(false);

  const [copied, setCopied] = useState(false);

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
    if (error) {
      toast.error("Nepodařilo se uložit přezdívku");
    } else {
      toast.success("Přezdívka uložena");
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingEmail(true);
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: window.location.origin }
    );
    setLoadingEmail(false);
    if (error) {
      toast.error(error.message);
    } else {
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
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Heslo bylo změněno");
      setCurrentPassword("");
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
    </div>
  );
};

export default Account;
