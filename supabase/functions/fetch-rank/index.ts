import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UBI_APP_ID = "e3d5ea9e-50bd-43b7-88bf-39794f4e3d40";
const UBI_SPACES_ID = "5172a557-50b5-4665-b7db-e3f2e8c5041d"; // R6S PC space

interface UbiSession {
  ticket: string;
  sessionId: string;
  expiration: string;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      const wait = Math.min(2000 * Math.pow(2, i), 10000);
      console.log(`Rate limited, waiting ${wait}ms before retry ${i + 1}/${retries}`);
      await res.text(); // consume body
      await sleep(wait);
      continue;
    }
    return res;
  }
  throw new Error("Rate limited by Ubisoft API after multiple retries");
}

async function ubiLogin(): Promise<UbiSession> {
  const email = Deno.env.get("UBISOFT_EMAIL");
  const password = Deno.env.get("UBISOFT_PASSWORD");
  if (!email || !password) throw new Error("Ubisoft credentials not configured");

  const res = await fetchWithRetry("https://public-ubiservices.ubi.com/v3/profiles/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Ubi-AppId": UBI_APP_ID,
      "Authorization": "Basic " + btoa(`${email}:${password}`),
    },
    body: JSON.stringify({ rememberMe: false }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Ubi login failed:", res.status, body);
    throw new Error(`Ubisoft login failed (${res.status})`);
  }

  const data = await res.json();
  return {
    ticket: data.ticket,
    sessionId: data.sessionId,
    expiration: data.expiration,
  };
}

async function findProfileId(ticket: string, username: string): Promise<string> {
  const res = await fetch(
    `https://public-ubiservices.ubi.com/v3/profiles?platformType=uplay&nameOnPlatform=${encodeURIComponent(username)}`,
    {
      headers: {
        "Ubi-AppId": UBI_APP_ID,
        "Authorization": `Ubi_v1 t=${ticket}`,
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Profile lookup failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const profiles = data.profiles;
  if (!profiles || profiles.length === 0) {
    throw new Error(`Player "${username}" not found`);
  }

  return profiles[0].profileId;
}

interface RankResult {
  rankName: string | null;
  rankImageUrl: string | null;
  mmr: number | null;
}

// Rank name mapping for R6S ranks
const RANK_NAMES: Record<number, string> = {
  0: "Unranked",
  1: "Copper V", 2: "Copper IV", 3: "Copper III", 4: "Copper II", 5: "Copper I",
  6: "Bronze V", 7: "Bronze IV", 8: "Bronze III", 9: "Bronze II", 10: "Bronze I",
  11: "Silver V", 12: "Silver IV", 13: "Silver III", 14: "Silver II", 15: "Silver I",
  16: "Gold V", 17: "Gold IV", 18: "Gold III", 19: "Gold II", 20: "Gold I",
  21: "Platinum V", 22: "Platinum IV", 23: "Platinum III", 24: "Platinum II", 25: "Platinum I",
  26: "Emerald V", 27: "Emerald IV", 28: "Emerald III", 29: "Emerald II", 30: "Emerald I",
  31: "Diamond V", 32: "Diamond IV", 33: "Diamond III", 34: "Diamond II", 35: "Diamond I",
  36: "Champions",
};

function getRankImageUrl(rankId: number): string {
  // Use r6 tracker CDN rank icons
  return `https://trackercdn.com/cdn/r6.tracker.network/ranks/s27/large/${rankId}.png`;
}

async function fetchRank(ticket: string, profileId: string): Promise<RankResult> {
  // Try the v2 skill endpoint for current season ranked
  const url = `https://public-ubiservices.ubi.com/v1/spaces/${UBI_SPACES_ID}/sandboxes/OSBOR_PC_LNCH_A/r6karma/players?board_id=pvp_ranked&profile_ids=${profileId}&region_id=emea&season_id=-1`;

  const res = await fetch(url, {
    headers: {
      "Ubi-AppId": UBI_APP_ID,
      "Authorization": `Ubi_v1 t=${ticket}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Rank fetch failed:", res.status, body);
    // Try alternative endpoint
    return await fetchRankV2(ticket, profileId);
  }

  const data = await res.json();
  console.log("Rank API response:", JSON.stringify(data).slice(0, 1000));

  const playerData = data?.players?.[profileId];
  if (!playerData) {
    return { rankName: null, rankImageUrl: null, mmr: null };
  }

  const rankId = playerData.rank ?? 0;
  const mmr = playerData.mmr ?? playerData.skill_mean * 100 ?? null;
  const rankName = RANK_NAMES[rankId] || `Rank ${rankId}`;
  const rankImageUrl = getRankImageUrl(rankId);

  return { rankName, rankImageUrl, mmr };
}

async function fetchRankV2(ticket: string, profileId: string): Promise<RankResult> {
  // Alternative: full_profiles endpoint (newer seasons)
  const url = `https://public-ubiservices.ubi.com/v2/spaces/${UBI_SPACES_ID}/title/r6s/skill/full_profiles?profile_ids=${profileId}&platform_families=pc`;

  const res = await fetch(url, {
    headers: {
      "Ubi-AppId": UBI_APP_ID,
      "Authorization": `Ubi_v1 t=${ticket}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Rank v2 fetch failed:", res.status, body);
    return { rankName: null, rankImageUrl: null, mmr: null };
  }

  const data = await res.json();
  console.log("Rank v2 API response:", JSON.stringify(data).slice(0, 1000));

  // Navigate the nested structure
  const platforms = data?.platform_families_full_profiles;
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return { rankName: null, rankImageUrl: null, mmr: null };
  }

  const pcData = platforms.find((p: any) => p.platform_family === "pc");
  const boards = pcData?.board_ids_full_profiles;
  if (!Array.isArray(boards) || boards.length === 0) {
    return { rankName: null, rankImageUrl: null, mmr: null };
  }

  // Look for ranked board
  const rankedBoard = boards.find((b: any) => b.board_id === "ranked") || boards[0];
  const seasons = rankedBoard?.full_profiles;
  if (!Array.isArray(seasons) || seasons.length === 0) {
    return { rankName: null, rankImageUrl: null, mmr: null };
  }

  // Get latest season
  const latest = seasons[seasons.length - 1];
  const profile = latest?.profile;
  const rankId = profile?.rank ?? 0;
  const mmr = profile?.max_rank_points ?? profile?.rank_points ?? null;
  const rankName = RANK_NAMES[rankId] || `Rank ${rankId}`;
  const rankImageUrl = getRankImageUrl(rankId);

  return { rankName, rankImageUrl, mmr };
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: profile, error: profileErr } = await adminClient
    .from("profiles")
    .select("ubisoft_username")
    .eq("user_id", userId)
    .single();

  if (profileErr || !profile?.ubisoft_username) {
    return new Response(
      JSON.stringify({ error: "Ubisoft username not set" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const username = profile.ubisoft_username;

  try {
    // 1. Login to Ubisoft
    const session = await ubiLogin();
    console.log("Ubisoft login successful");

    // 2. Find profile ID
    const profileId = await findProfileId(session.ticket, username);
    console.log("Found profile ID:", profileId);

    // 3. Fetch rank
    const rankResult = await fetchRank(session.ticket, profileId);
    console.log("Rank result:", rankResult);

    // 4. Update profile
    const { error: updateErr } = await adminClient
      .from("profiles")
      .update({
        rank_name: rankResult.rankName,
        rank_image_url: rankResult.rankImageUrl,
        rank_updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateErr) {
      throw new Error(`Profile update failed: ${updateErr.message}`);
    }

    return new Response(
      JSON.stringify({ rankName: rankResult.rankName, rankImageUrl: rankResult.rankImageUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error fetching rank:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
