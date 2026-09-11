import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  })
}

function plainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500)
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase konfiguracija nedostaje." }, 500)

    const authorization = req.headers.get("Authorization")
    if (!authorization) return json({ error: "Korisnik nije prijavljen." }, 401)
    const token = authorization.replace(/^Bearer\s+/i, "")

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: { user }, error: userError } = await admin.auth.getUser(token)
    if (userError || !user) return json({ error: "Korisnička sesija nije valjana." }, 401)

    const { data: platformAdmin } = await admin
      .from("platform_admins")
      .select("user_id,is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle()

    if (!platformAdmin) return json({ error: "Nemate pristup FERSYS administraciji." }, 403)

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const campaignId = String(body.campaignId ?? "").trim()
    const title = String(body.title ?? "").trim()
    const htmlBody = String(body.htmlBody ?? "")
    const routeRaw = String(body.route ?? "/dashboard").trim()
    const route = routeRaw.startsWith("/") ? routeRaw : "/dashboard"

    if (!campaignId || !title) return json({ error: "campaignId i title su obavezni." }, 400)

    const { data: deliveries, error: deliveryError } = await admin
      .from("email_deliveries")
      .select("company_id")
      .eq("campaign_id", campaignId)
      .eq("status", "sent")
      .not("company_id", "is", null)

    if (deliveryError) throw deliveryError

    const companyIds = [...new Set((deliveries ?? []).map((row) => String(row.company_id)).filter(Boolean))]
    let created = 0

    for (const companyId of companyIds) {
      const { data: existing } = await admin
        .from("notification_events_v2")
        .select("id")
        .eq("company_id", companyId)
        .eq("entity_type", "email_campaign")
        .eq("entity_id", campaignId)
        .maybeSingle()

      if (existing) continue

      const { error: insertError } = await admin
        .from("notification_events_v2")
        .insert({
          company_id: companyId,
          category: "system",
          title,
          description: plainText(htmlBody) || "Nova FERSYS obavijest",
          route,
          actor_user_id: user.id,
          actor_name: "FERSYS administracija",
          entity_type: "email_campaign",
          entity_id: campaignId,
        })

      if (insertError) throw insertError
      created += 1
    }

    let push: Record<string, unknown> | null = null
    const cronSecret = Deno.env.get("PUSH_CRON_SECRET") ?? ""
    if (created > 0 && cronSecret) {
      const response = await fetch(`${supabaseUrl}/functions/v1/push-notifications`, {
        method: "POST",
        headers: { "x-fersys-cron-secret": cronSecret, "Content-Type": "application/json" },
        body: "{}",
      })
      push = await response.json().catch(() => ({ ok: false, status: response.status }))
    }

    return json({ success: true, companies: companyIds.length, notificationsCreated: created, push })
  } catch (error) {
    console.error("campaign-notifications:", error)
    return json({ error: error instanceof Error ? error.message : "Nepoznata greška" }, 500)
  }
})
