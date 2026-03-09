import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Mail } from "lucide-react";

const SignupSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-primary" />
        <div className="space-y-2">
          <h1 className="text-2xl font-mono font-bold text-foreground">Registrace úspěšná!</h1>
          <p className="text-muted-foreground text-sm">
            Na tvůj email jsme odeslali ověřovací odkaz.
          </p>
        </div>

        <div className="bg-secondary rounded-lg p-4 space-y-2 text-left text-sm">
          <div className="flex items-start gap-2">
            <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Jak pokračovat:</p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                <li>Otevři svůj email</li>
                <li>Klikni na ověřovací odkaz</li>
                <li>Po ověření se můžeš přihlásit</li>
              </ol>
            </div>
          </div>
        </div>

        <Button className="w-full" onClick={() => navigate("/auth", { replace: true })}>
          Přejít na přihlášení
        </Button>
      </div>
    </div>
  );
};

export default SignupSuccess;
