import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  onVerified: () => void;
}

export function MfaVerify({ onVerified }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find((f: any) => f.status === "verified");
      if (!totpFactor) {
        onVerified();
        return;
      }

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;

      onVerified();
    } catch (err: any) {
      toast.error("Neplatný kód. Zkus to znovu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-mono font-bold text-primary">🔐 OVĚŘENÍ 2FA</h1>
          <p className="text-sm text-muted-foreground">
            Zadej 6místný kód z autentizační aplikace
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="bg-secondary border-border font-mono text-center text-lg tracking-widest"
            maxLength={6}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          />
        </div>
        <Button onClick={handleVerify} disabled={loading || code.length !== 6} className="w-full">
          {loading ? "Ověřování..." : "Ověřit"}
        </Button>
      </div>
    </div>
  );
}
