import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const RANK_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const inflightByUser = new Set<string>();

export function useAutoRank(onUpdate?: (rankName: string | null, rankImageUrl: string | null, avatarUrl: string | null) => void) {
  const { user } = useAuth();
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const checkAndFetch = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("ubisoft_username, rank_updated_at, rank_name, rank_image_url, avatar_url")
        .eq("user_id", user.id)
        .single();

      if (cancelled || !profile?.ubisoft_username) return;

      onUpdateRef.current?.(profile.rank_name, profile.rank_image_url, profile.avatar_url);

      if (profile.rank_updated_at) {
        const lastUpdate = new Date(profile.rank_updated_at).getTime();
        if (Date.now() - lastUpdate < RANK_COOLDOWN_MS) {
          return;
        }
      }

      if (inflightByUser.has(user.id)) return;
      inflightByUser.add(user.id);

      try {
        const { data, error } = await supabase.functions.invoke("fetch-rank");
        if (cancelled || error) return;

        onUpdateRef.current?.(
          data?.rankName ?? profile.rank_name ?? null,
          data?.rankImageUrl ?? profile.rank_image_url ?? null,
          data?.avatarUrl ?? profile.avatar_url ?? null,
        );
      } finally {
        inflightByUser.delete(user.id);
      }
    };

    checkAndFetch();

    return () => {
      cancelled = true;
    };
  }, [user]);
}
