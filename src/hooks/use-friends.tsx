import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { TrainingActivity, Category, ScheduleEntry, TrainingCompletion } from "@/lib/types";

export interface FriendMindsetItem {
  id: string;
  text: string;
  sort_order: number;
}

export interface FriendData {
  userId: string;
  displayName: string;
  shareCode: string;
  rankName: string | null;
  rankImageUrl: string | null;
  avatarUrl: string | null;
  mindsetDescription: string | null;
  mindsetItems: FriendMindsetItem[];
  schedule: {
    name: string;
    categories: Category[];
    activities: TrainingActivity[];
    entries: ScheduleEntry[];
  };
  completions: TrainingCompletion[];
}

export function useFriends() {
  const { user } = useAuth();
  const [myShareCode, setMyShareCode] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  // Load my share code
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_share_codes")
      .select("share_code")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setMyShareCode(data.share_code);
      });
  }, [user]);

  // Load friend follows and their data
  const loadFriends = useCallback(async () => {
    if (!user) return;
    setLoadingFriends(true);

    const { data: follows } = await supabase
      .from("friend_follows")
      .select("friend_user_id")
      .eq("user_id", user.id);

    if (!follows || follows.length === 0) {
      setFriends([]);
      setLoadingFriends(false);
      return;
    }

    const friendIds = follows.map((f) => f.friend_user_id);
    const friendsData: FriendData[] = [];

    for (const friendId of friendIds) {
      const [profileRes, codeRes, schedRes, catsRes, actsRes, entriesRes, completionsRes, mindsetRes] =
        await Promise.all([
          supabase.from("profiles").select("display_name, rank_name, rank_image_url, avatar_url, ubisoft_username, mindset_description").eq("user_id", friendId).single(),
          supabase.from("user_share_codes").select("share_code").eq("user_id", friendId).single(),
          supabase.from("user_schedules").select("name").eq("user_id", friendId).single(),
          supabase.from("user_categories").select("*").eq("user_id", friendId).order("sort_order"),
          supabase.from("user_activities").select("*").eq("user_id", friendId).order("sort_order"),
          supabase.from("schedule_entries").select("*").eq("user_id", friendId),
          supabase.from("training_completions").select("*").eq("user_id", friendId),
          supabase.from("user_mindset_items").select("id, text, sort_order").eq("user_id", friendId).order("sort_order"),
        ]);

      friendsData.push({
        userId: friendId,
        displayName: (profileRes.data as any)?.ubisoft_username || profileRes.data?.display_name || "Kamarád",
        rankName: (profileRes.data as any)?.rank_name || null,
        rankImageUrl: (profileRes.data as any)?.rank_image_url || null,
        avatarUrl: (profileRes.data as any)?.avatar_url || null,
        shareCode: codeRes.data?.share_code || "",
        schedule: {
          name: schedRes.data?.name || "Plán",
          categories: (catsRes.data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
            color: c.color,
          })),
          activities: (actsRes.data || []).map((a: any) => ({
            id: a.id,
            name: a.name,
            categoryId: a.category_id,
            description: a.description ?? undefined,
            videoUrl: a.video_url ?? undefined,
            activityType: a.activity_type === "map-learning" ? "map-learning" as const : "default" as const,
          })),
          entries: (entriesRes.data || []).map((e: any) => ({
            dayOfWeek: e.day_of_week,
            activityId: e.activity_id,
            assignedMaps: e.assigned_maps ?? undefined,
          })),
        },
        completions: (completionsRes.data || []).map((c: any) => ({
          id: c.id,
          activityId: c.activity_id,
          completedDate: c.completed_date,
          durationMinutes: c.duration_minutes ?? undefined,
          completedMaps: c.completed_maps ?? undefined,
        })),
      });
    }

    setFriends(friendsData);
    setLoadingFriends(false);
  }, [user]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // Realtime: listen for friend completion changes
  useEffect(() => {
    if (!user || friends.length === 0) return;

    const friendIds = friends.map((f) => f.userId);
    const channel = supabase
      .channel("friend-completions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_completions",
        },
        (payload) => {
          const record = payload.new as any;
          if (record && friendIds.includes(record.user_id)) {
            // Reload friends data on change
            loadFriends();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, friends.length, loadFriends]);

  const addFriend = useCallback(
    async (shareCode: string) => {
      if (!user) return;
      const code = shareCode.trim().toUpperCase();

      if (code === myShareCode) {
        toast.error("Nemůžeš přidat sám sebe!");
        return;
      }

      // Look up user by share code
      const { data: codeData } = await supabase
        .from("user_share_codes")
        .select("user_id")
        .eq("share_code", code)
        .single();

      if (!codeData) {
        toast.error("Kód nenalezen. Zkontroluj ho a zkus znovu.");
        return;
      }

      // Check if already following
      const { data: existing } = await supabase
        .from("friend_follows")
        .select("id")
        .eq("user_id", user.id)
        .eq("friend_user_id", codeData.user_id)
        .maybeSingle();

      if (existing) {
        toast.info("Tohoto kamaráda už sleduješ!");
        return;
      }

      const { error } = await supabase.from("friend_follows").insert({
        user_id: user.id,
        friend_user_id: codeData.user_id,
      });

      if (error) {
        toast.error("Nepodařilo se přidat kamaráda");
        return;
      }

      toast.success("Kamarád přidán!");
      await loadFriends();
    },
    [user, myShareCode, loadFriends]
  );

  const removeFriend = useCallback(
    async (friendUserId: string) => {
      if (!user) return;
      await supabase
        .from("friend_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("friend_user_id", friendUserId);

      setFriends((prev) => prev.filter((f) => f.userId !== friendUserId));
      toast.success("Kamarád odebrán");
    },
    [user]
  );

  return { myShareCode, friends, loadingFriends, addFriend, removeFriend };
}
