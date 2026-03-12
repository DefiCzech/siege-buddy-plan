import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const RANK_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export function useAutoRank(onUpdate?: (rankName: string | null, rankImageUrl: string | null) => void) {
  const { user } = useAuth();
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!user || fetchingRef.current) return;

    const checkAndFetch = async () => {
      // Get profile to check ubisoft_username and rank_updated_at
      const { data: profile } = await supabase
        .from("profiles")
        .select("ubisoft_username, rank_updated_at, rank_name, rank_image_url")
        .eq("user_id", user.id)
        .single();

      if (!profile?.ubisoft_username) return;

      // Check cooldown
      if (profile.rank_updated_at) {
        const lastUpdate = new Date(profile.rank_updated_at).getTime();
        if (Date.now() - lastUpdate < RANK_COOLDOWN_MS) {
          // Still within cooldown, use cached values
          onUpdate?.(profile.rank_name, profile.rank_image_url);
          return;
        }
      }

      // Fetch new rank
      fetchingRef.current = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/fetch-rank`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const data = await res.json();
        if (res.ok) {
          onUpdate?.(data.rankName, data.rankImageUrl);
        }
      } catch {
        // Silent fail - rank is non-critical
      } finally {
        fetchingRef.current = false;
      }
    };

    checkAndFetch();
  }, [user]);
}
