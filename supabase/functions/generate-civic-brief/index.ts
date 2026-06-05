import {
  buildEvidenceBrief,
  corsHeaders,
  jsonResponse,
  supabaseRest,
} from "../_shared/civic.ts";

function userIdFromAuthHeader(value: string | null) {
  const token = value?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    if (!body?.event?.title) {
      return jsonResponse({ error: "event.title is required" }, 400);
    }

    const brief = buildEvidenceBrief({
      context: body.context,
      event: body.event,
      match: body.match,
      profile: body.profile,
    });
    const userId = userIdFromAuthHeader(request.headers.get("Authorization"));

    await supabaseRest("/rest/v1/civic_explanation_audits", {
      body: {
        confidence: brief.confidence,
        event_id: body.event.id ?? body.event.event_id ?? "unknown",
        event_kind: body.event.eventKind ?? body.event.event_kind ?? "federal",
        explanation: brief,
        model_name: "deterministic-civic-brief-v1",
        relevance_reasons: brief.whySeeing,
        source_urls: brief.citations.map((citation: { url: string }) => citation.url),
        user_id: userId,
      },
      method: "POST",
    }).catch(() => null);

    return jsonResponse({ brief, status: "ok" });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to generate civic brief" },
      500,
    );
  }
});
