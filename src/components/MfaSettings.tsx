import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, Trash2 } from "lucide-react";

export function MfaSettings() {
  const [factors, setFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);

  const loadFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error && data) {
      setFactors(data.totp || []);
    }
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const startEnroll = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator",
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setEnrolling(true);
    setLoading(false);
  };

  const verifyEnroll = async () => {
    if (verifyCode.length !== 6) return;
    setLoading(true);
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError) {
      toast.error(challengeError.message);
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: verifyCode,
    });
    if (verifyError) {
      toast.error("Neplatný kód. Zkus to znovu.");
      setLoading(false);
      return;
    }

    toast.success("2FA bylo úspěšně aktivováno! 🛡️");
    setEnrolling(false);
    setVerifyCode("");
    setQrCode("");
    setSecret("");
    setFactorId("");
    loadFactors();
    setLoading(false);
  };

  const unenroll = async (id: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("2FA bylo deaktivováno.");
    loadFactors();
  };

  const verifiedFactors = factors.filter((f) => f.status === "verified");

  return (
    <div className="space-y-4">
      <h3 className="font-mono font-bold text-sm flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        DVOUFÁZOVÉ OVĚŘENÍ (2FA)
      </h3>

      {verifiedFactors.length > 0 && !enrolling && (
        <div className="space-y-2">
          <p className="text-xs text-success font-mono">✓ 2FA je aktivní</p>
          {verifiedFactors.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-2 rounded bg-secondary/50 text-sm">
              <span className="font-mono">{f.friendly_name || "Authenticator"}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => unenroll(f.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {!enrolling && verifiedFactors.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Zabezpeč svůj účet pomocí autentizační aplikace (Google Authenticator, Authy apod.)
          </p>
          <Button onClick={startEnroll} disabled={loading} size="sm" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            Aktivovat 2FA
          </Button>
        </div>
      )}

      {enrolling && (
        <div className="space-y-4 p-4 rounded border border-border bg-card">
          <p className="text-sm text-muted-foreground">
            1. Naskenuj QR kód v autentizační aplikaci
          </p>
          <div className="flex justify-center">
            <img src={qrCode} alt="QR kód pro 2FA" className="rounded" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Nebo zadej kód ručně:</p>
            <code className="text-xs bg-secondary p-2 rounded block break-all font-mono">{secret}</code>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              2. Zadej 6místný kód z aplikace
            </p>
            <div className="flex gap-2">
              <Input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="bg-secondary border-border font-mono text-center tracking-widest"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && verifyEnroll()}
              />
              <Button onClick={verifyEnroll} disabled={loading || verifyCode.length !== 6}>
                Ověřit
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setEnrolling(false); setVerifyCode(""); }}>
            Zrušit
          </Button>
        </div>
      )}
    </div>
  );
}
