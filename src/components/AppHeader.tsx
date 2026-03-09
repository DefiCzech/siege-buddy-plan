import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, Settings, LogOut, UserCog } from "lucide-react";
import { Schedule } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  schedule: Schedule;
  completedToday: number;
  totalToday: number;
}

export function AppHeader({ schedule, completedToday, totalToday }: Props) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [rankImageUrl, setRankImageUrl] = useState<string | null>(null);
  const [rankName, setRankName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("rank_name, rank_image_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.rank_image_url) setRankImageUrl(data.rank_image_url);
        if (data?.rank_name) setRankName(data.rank_name);
      });
  }, [user]);

  const navItems = [
    { to: "/", icon: Calendar, label: "Přehled" },
    { to: "/manage", icon: Settings, label: "Plánování" },
    { to: "/account", icon: UserCog, label: "Účet" },
  ];

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          {rankImageUrl ? (
            <img src={rankImageUrl} alt={rankName || "Rank"} className="h-8 w-8" title={rankName || undefined} />
          ) : (
            <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center text-primary font-mono text-xs font-bold">R6</div>
          )}
          <div>
            <h1 className="text-sm font-mono font-bold tracking-widest text-primary">R6S TRAINER</h1>
            <p className="text-xs text-muted-foreground">{rankName || "Tréninkový plán"}</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          {totalToday > 0 && (
            <div className="text-xs font-mono text-muted-foreground">
              <span className="text-success">{completedToday}</span>/{totalToday}
            </div>
          )}
          
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={signOut} title="Odhlásit se">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
