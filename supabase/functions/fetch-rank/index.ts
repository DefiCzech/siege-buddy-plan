import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AUTO_RANK_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

interface RankResult {
  rankName: string | null;
  rankImageUrl: string | null;
  mmr: number | null;
}

interface FetchRankRequestBody {
  force?: boolean;
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

function getRankTier(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized.includes("champion")) return "champion";
  if (normalized.includes("diamond")) return "diamond";
  if (normalized.includes("emerald")) return "emerald";
  if (normalized.includes("platinum")) return "platinum";
  if (normalized.includes("gold")) return "gold";
  if (normalized.includes("silver")) return "silver";
  if (normalized.includes("bronze")) return "bronze";
  if (normalized.includes("copper")) return "copper";
  if (normalized.includes("unranked")) return "unranked";
  return null;
}

function extractRelevantSection(content: string): string {
  const overviewMatch = content.match(/Y\d{1,2}S\d{1,2}\s+Overview([\s\S]{0,5000})/i);
  if (overviewMatch) return overviewMatch[1];

  const currentSeasonMatch = content.match(/Current Season([\s\S]{0,5000})/i);
  if (currentSeasonMatch) return currentSeasonMatch[1];

  return content.slice(0, 12000);
}

function extractRankNameFromText(content: string): string | null {
  const rankMatch = content.match(
    /(CHAMPIONS?|DIAMOND(?:\s+[IVX]+)?|EMERALD(?:\s+[IVX]+)?|PLATINUM(?:\s+[IVX]+)?|GOLD(?:\s+[IVX]+)?|SILVER(?:\s+[IVX]+)?|BRONZE(?:\s+[IVX]+)?|COPPER(?:\s+[IVX]+)?|UNRANKED)/i,
  );

  if (!rankMatch?.[1]) return null;
  return formatRankName(rankMatch[1]);
}

function extractTrackerImageUrl(rawUrl: string): string {
  const sanitized = rawUrl.replace(/&amp;/g, "&");

  const encodedTrackerUrl = sanitized.match(
    /https%3A%2F%2Ftrackercdn\.com%2Fcdn%2Fr6\.tracker\.network%2Franks%2F[^"'\s)]+/i,
  );

  if (encodedTrackerUrl?.[0]) {
    return decodeURIComponent(encodedTrackerUrl[0]);
  }

  const directTrackerUrl = sanitized.match(
    /https?:\/\/[^"'\s)]*trackercdn\.com\/cdn\/r6\.tracker\.network\/ranks\/[^"'\s)]+\.(?:png|webp|svg|jpg)/i,
  );

  if (directTrackerUrl?.[0]) {
    return directTrackerUrl[0];
  }

  return sanitized;
}

function extractRankFromImages(content: string): { rankName: string | null; rankImageUrl: string | null } {
  const markdownImageRegex = /!\[([^\]]+)\]\((https?:\/\/[^)\s]*ranks[^)\s]*\.(?:png|webp|svg|jpg)[^)\s]*)\)/gi;
  let markdownMatch: RegExpExecArray | null;

  while ((markdownMatch = markdownImageRegex.exec(content)) !== null) {
    const rankName = extractRankNameFromText(markdownMatch[1] ?? "");
    if (rankName && markdownMatch[2]) {
      return {
        rankName,
        rankImageUrl: extractTrackerImageUrl(markdownMatch[2]),
      };
    }
  }

  const htmlAltBeforeSrcRegex = /alt=["']([^"']+)["'][^>]*src=["']([^"']*ranks[^"']*\.(?:png|webp|svg|jpg)[^"']*)["']/gi;
  let htmlAltBeforeSrcMatch: RegExpExecArray | null;

  while ((htmlAltBeforeSrcMatch = htmlAltBeforeSrcRegex.exec(content)) !== null) {
    const rankName = extractRankNameFromText(htmlAltBeforeSrcMatch[1] ?? "");
    if (rankName && htmlAltBeforeSrcMatch[2]) {
      return {
        rankName,
        rankImageUrl: extractTrackerImageUrl(htmlAltBeforeSrcMatch[2]),
      };
    }
  }

  const htmlSrcBeforeAltRegex = /src=["']([^"']*ranks[^"']*\.(?:png|webp|svg|jpg)[^"']*)["'][^>]*alt=["']([^"']+)["']/gi;
  let htmlSrcBeforeAltMatch: RegExpExecArray | null;

  while ((htmlSrcBeforeAltMatch = htmlSrcBeforeAltRegex.exec(content)) !== null) {
    const rankName = extractRankNameFromText(htmlSrcBeforeAltMatch[2] ?? "");
    if (rankName && htmlSrcBeforeAltMatch[1]) {
      return {
        rankName,
        rankImageUrl: extractTrackerImageUrl(htmlSrcBeforeAltMatch[1]),
      };
    }
  }

  return { rankName: null, rankImageUrl: null };
}

function extractAvatarUrl(content: string): string | null {
  // Look for Ubisoft avatar CDN URLs
  const ubiAvatarMatch = content.match(
    /https?:\/\/ubisoft-avatars\.akamaized\.net\/[a-f0-9\-]+\/default_\d+_\d+\.\w+/i,
  );
  if (ubiAvatarMatch?.[0]) return ubiAvatarMatch[0];

  // Tracker CDN avatar pattern
  const trackerAvatarMatch = content.match(
    /https?:\/\/[^"'\s)]*trackercdn\.com\/cdn\/r6\.tracker\.network\/avatars\/[^"'\s)]+/i,
  );
  if (trackerAvatarMatch?.[0]) return trackerAvatarMatch[0].replace(/&amp;/g, "&");

  return null;
}

function extractMmr(content: string): number | null {
  const mmrMatch = content.match(/([0-9][0-9,.]{2,8})\s*(RP|MMR)/i);
  if (!mmrMatch?.[1]) return null;

  const parsed = Number(mmrMatch[1].replace(/[,\.\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

const DIVISION_TO_ROMAN: Record<string, string> = {
  "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V",
};

function extractRankNameFromImageUrl(url: string | null): string | null {
  if (!url) return null;
  // Match patterns like: ranks/s28/copper_2.png, ranks/copper_2.png, copper_2.png
  const match = url.match(/(champion|diamond|emerald|platinum|gold|silver|bronze|copper|unranked)(?:[_\- ](1|2|3|4|5|i|ii|iii|iv|v))?\.(?:png|webp|svg|jpg|jpeg)/i);
  if (!match?.[1]) return null;

  const tier = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  if (tier.toLowerCase() === "champion" || tier.toLowerCase() === "unranked") return tier === "Champion" ? "Champions" : tier;

  const divisionToken = match[2]?.toUpperCase();
  const division = divisionToken ? (DIVISION_TO_ROMAN[divisionToken] ?? divisionToken) : null;
  return division ? `${tier} ${division}` : tier;
}

function parseTrackerProfile(content: string): RankResult | null {
  if (/Player Not Found|missing in action|has not played R6 Siege|#\s*404/i.test(content)) {
    throw new Error("Hráč nebyl na trackeru nalezen");
  }

  const section = extractRelevantSection(content);
  const imageRank = extractRankFromImages(section);

  let rankImageUrl = imageRank.rankImageUrl;
  // Derive rank name from the image URL first for consistency
  const rankFromUrl = extractRankNameFromImageUrl(rankImageUrl);
  const rankName = rankFromUrl ?? imageRank.rankName ?? extractRankNameFromText(section) ?? extractRankNameFromText(content);

  const rankTier = getRankTier(rankName);
  const imageTier = getRankTier(rankImageUrl);
  if (rankTier && imageTier && rankTier !== imageTier) {
    rankImageUrl = null;
  }

  const mmr = extractMmr(section) ?? extractMmr(content);

  if (!rankName && !rankImageUrl && !mmr) {
    return null;
  }

  return { rankName, rankImageUrl, mmr };
}

async function fetchTrackerProfilePage(username: string): Promise<string> {
  const encodedUsername = encodeURIComponent(username.trim());
  const url = `https://r6.tracker.network/r6siege/profile/ubi/${encodedUsername}/overview`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Referer": "https://r6.tracker.network/",
    },
  });

  if (res.status === 404) {
    throw new Error(`Hráč \"${username}\" nebyl nalezen`);
  }

  if (res.status === 429) {
    throw new Error("Tracker je dočasně limitovaný (429)");
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tracker request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const content = await res.text();

  if (!content || content.length < 200) {
    throw new Error("Tracker vrátil prázdnou odpověď");
  }

  return content;
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
    const content = await fetchTrackerProfilePage(profile.ubisoft_username);
    const parsedRank = parseTrackerProfile(content);

    if (!parsedRank) {
      throw new Error("Nepodařilo se z odpovědi trackeru rozpoznat rank");
    }

    const rankUpdatedAt = new Date().toISOString();
    const rankImageUrl = parsedRank.rankImageUrl ?? profile.rank_image_url;
    const rankNameFromImage = extractRankNameFromImageUrl(rankImageUrl);
    const rankName = rankNameFromImage ?? parsedRank.rankName ?? profile.rank_name;

    // Extract avatar from the same tracker page (no API key needed)
    const avatarUrl = extractAvatarUrl(content) ?? profile.avatar_url;

    const { error: updateErr } = await adminClient
      .from("profiles")
      .update({
        rank_name: rankName,
        rank_image_url: rankImageUrl,
        rank_updated_at: rankUpdatedAt,
        avatar_url: avatarUrl,
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
        mmr: parsedRank.mmr,
        cached: false,
        source: "tracker-public",
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
