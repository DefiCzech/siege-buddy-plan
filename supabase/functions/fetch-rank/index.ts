import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const R6DATA_API_KEY = Deno.env.get("R6DATA_API_KEY");
  if (!R6DATA_API_KEY) {
    return new Response(JSON.stringify({ error: "R6DATA_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );
  if (claimsErr || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub;

  // Get the user's ubisoft_username from profile
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
    // Fetch seasonal stats from r6data.eu
    const r6Res = await fetch(
      `https://api.r6data.eu/api/stats?type=seasonalStats&nameOnPlatform=${encodeURIComponent(username)}&platformType=uplay`,
      { headers: { "api-key": R6DATA_API_KEY } }
    );

    if (!r6Res.ok) {
      const body = await r6Res.text();
      throw new Error(`r6data API error [${r6Res.status}]: ${body}`);
    }

    const r6Data = await r6Res.json();

    // Extract latest rank from history
    let rankName: string | null = null;
    let rankImageUrl: string | null = null;

    const history = r6Data?.data?.history?.data;
    if (Array.isArray(history) && history.length > 0) {
      // Last entry is the most recent
      const latest = history[history.length - 1];
      if (Array.isArray(latest) && latest.length >= 2) {
        const meta = latest[1]?.metadata;
        if (meta) {
          rankName = meta.rank || null;
          rankImageUrl = meta.imageUrl || null;
        }
      }
    }

    // Update profile with rank info
    const { error: updateErr } = await adminClient
      .from("profiles")
      .update({ rank_name: rankName, rank_image_url: rankImageUrl })
      .eq("user_id", userId);

    if (updateErr) {
      throw new Error(`Profile update failed: ${updateErr.message}`);
    }

    return new Response(
      JSON.stringify({ rankName, rankImageUrl }),
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
