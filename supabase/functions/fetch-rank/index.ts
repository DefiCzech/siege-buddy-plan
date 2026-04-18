import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AUTO_RANK_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

interface FetchRankRequestBody {
  force?: boolean;
}

interface SeasonalEntry {
  displayName: string;
  metadata: {
    rank: string;
    imageUrl: string;
    color: string;
  };
  value: number;
  displayValue: string;
}

function formatRankName(raw: string): string {
  const normalized = raw.trim().replace(/\s+/g, " ").toUpperCase();

  if (normalized === "CHAMPION" || normalized === "CHAMPIONS") {
    return "Champions";
  }

  return normalized
    .split(" ")
    .map((part) => {
      if (/^[IVX]+$/.test(part)) return part;
      return part.charAt(0) + part.slice(1).toLowerCase();
    })
    .join(" ");
}

async function fetchRankFromApi(username: string): Promise<{
  rankName: string | null;
  rankImageUrl: string | null;
  mmr: number | null;
}> {
  const apiKey = Deno.env.get("R6DATA_API_KEY");
  if (!apiKey) {
    throw new Error("R6DATA_API_KEY is not configured");
  }

  const encodedUsername = encodeURIComponent(username.trim());

  // Try seasonalStats first for detailed rank history
  const seasonalUrl = `https://api.r6data.eu/api/stats?type=seasonalStats&nameOnPlatform=${encodedUsername}&platformType=uplay`;
  const seasonalRes = await fetch(seasonalUrl, {
    headers: { "api-key": apiKey },
  });

  if (seasonalRes.status === 404) {
    throw new Error(`Hráč "${username}" nebyl nalezen`);
  }
  if (seasonalRes.status === 429) {
    throw new Error("API je dočasně limitované (429)");
  }

  let rankName: string | null = null;
  let rankImageUrl: string | null = null;
  let mmr: number | null = null;

  if (seasonalRes.ok) {
    const json = await seasonalRes.json();
    console.log("seasonalStats response:", JSON.stringify(json).slice(0, 2000));

    if (json?.error) {
      throw new Error(`r6data API: ${json.error}`);
    }

    const history: Array<[string, SeasonalEntry]> = json?.data?.history?.data;
    if (history && history.length > 0) {
      // First entry is the most recent (sorted newest-first)
      const latest = history[0];
      const entry = latest?.[1];
      if (entry?.metadata) {
        rankName = entry.metadata.rank ? formatRankName(entry.metadata.rank) : null;
        rankImageUrl = entry.metadata.imageUrl || null;
        mmr = typeof entry.value === "number" ? entry.value : null;
      }
    }
  } else {
    await seasonalRes.text(); // consume body
  }

  // Remove debug logging
  return { rankName, rankImageUrl, mmr };
}


async function fetchAvatarUrl(username: string): Promise<string | null> {
  const apiKey = Deno.env.get("R6DATA_API_KEY");
  if (!apiKey) return null;

  try {
    const encodedUsername = encodeURIComponent(username.trim());
    const url = `https://api.r6data.eu/api/stats?type=accountInfo&nameOnPlatform=${encodedUsername}&platformType=uplay`;

    const res = await fetch(url, {
      headers: { "api-key": apiKey },
    });

    if (!res.ok) {
      await res.text();
      return null;
    }

    const json = await res.json();
    // Try to extract avatar/profile image from account info
    return json?.avatarUrl || json?.avatar || json?.profileImageUrl || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let force = false;
  if (req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as FetchRankRequestBody;
    force = body?.force === true;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profile, error: profileErr } = await adminClient
    .from("profiles")
    .select("ubisoft_username, rank_updated_at, rank_name, rank_image_url, avatar_url")
    .eq("user_id", userId)
    .single();

  if (profileErr || !profile?.ubisoft_username) {
    return new Response(JSON.stringify({ error: "Ubisoft username not set" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!force && profile.rank_updated_at) {
    const lastUpdate = new Date(profile.rank_updated_at).getTime();
    if (Date.now() - lastUpdate < AUTO_RANK_COOLDOWN_MS) {
      return new Response(
        JSON.stringify({
          rankName: profile.rank_name,
          rankImageUrl: profile.rank_image_url,
          avatarUrl: profile.avatar_url,
          rankUpdatedAt: profile.rank_updated_at,
          cached: true,
          source: "cache",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  try {
    const rankResult = await fetchRankFromApi(profile.ubisoft_username);

    const rankUpdatedAt = new Date().toISOString();
    const rankName = rankResult.rankName ?? profile.rank_name;
    const rankImageUrl = rankResult.rankImageUrl ?? profile.rank_image_url;

    // Only fetch avatar from API if user doesn't have a custom one set
    let avatarUrl = profile.avatar_url;
    if (!avatarUrl) {
      avatarUrl = await fetchAvatarUrl(profile.ubisoft_username);
    }

    const { error: updateErr } = await adminClient
      .from("profiles")
      .update({
        rank_name: rankName,
        rank_image_url: rankImageUrl,
        rank_updated_at: rankUpdatedAt,
        ...(avatarUrl && !profile.avatar_url ? { avatar_url: avatarUrl } : {}),
      })
      .eq("user_id", userId);

    if (updateErr) {
      throw new Error(`Profile update failed: ${updateErr.message}`);
    }

    return new Response(
      JSON.stringify({
        rankName,
        rankImageUrl,
        avatarUrl,
        rankUpdatedAt,
        mmr: rankResult.mmr,
        cached: false,
        source: "r6data-api",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching rank:", message);

    if (profile.rank_name || profile.rank_image_url) {
      return new Response(
        JSON.stringify({
          rankName: profile.rank_name,
          rankImageUrl: profile.rank_image_url,
          avatarUrl: profile.avatar_url,
          rankUpdatedAt: profile.rank_updated_at,
          cached: true,
          stale: true,
          source: "cache",
          warning: message,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
