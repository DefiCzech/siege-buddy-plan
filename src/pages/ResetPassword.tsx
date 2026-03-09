import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Heslo bylo změněno!");
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Chyba při změně hesla");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Neplatný odkaz pro reset hesla.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-mono font-bold text-primary">NOVÉ HESLO</h1>
          <p className="text-sm text-muted-foreground">Zadej nové heslo</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <Input
            type="password"
            placeholder="Nové heslo"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-secondary border-border"
            required
            minLength={6}
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Ukládání..." : "Nastavit nové heslo"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
