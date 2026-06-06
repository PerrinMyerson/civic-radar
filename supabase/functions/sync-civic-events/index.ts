import {
  corsHeaders,
  jsonResponse,
  normalizeCivicData,
  supabaseRest,
} from "../_shared/civic.ts";
import { civicBurdenForEvent } from "../../../shared/civic-burden.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const feedUrl =
      Deno.env.get("CIVIC_RADAR_FEED_URL") ||
      "https://perrinmyerson.github.io/civic-radar/civic-data.json";
    const response = await fetch(feedUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const events = normalizeCivicData(payload);
    const now = new Date().toISOString();

    if (events.length > 0) {
      await supabaseRest("/rest/v1/civic_events?on_conflict=id", {
        body: events.map((event) => ({
          ...event,
          last_seen_at: now,
        })),
        headers: { Prefer: "resolution=merge-duplicates" },
        method: "POST",
      });

      const sources = events
        .filter((event) => event.source_url)
        .map((event) => ({
          event_id: event.id,
          source_label: event.source_name,
          source_type: event.event_kind === "local" ? "api" : "rss",
          source_url: event.source_url,
        }));

      if (sources.length > 0) {
        await supabaseRest("/rest/v1/civic_event_sources?on_conflict=event_id,source_url", {
          body: sources,
          headers: { Prefer: "resolution=merge-duplicates" },
          method: "POST",
        });
      }

      await supabaseRest(
        "/rest/v1/civic_event_burden_scores?on_conflict=event_id,event_kind",
        {
          body: events.map((event) => {
            const burden = civicBurdenForEvent(event);

            return {
              action_ambiguity: burden.actionAmbiguity,
              actor_ambiguity: burden.actorAmbiguity,
              computed_at: now,
              decision_ambiguity: burden.decisionAmbiguity,
              event_id: event.id,
              event_kind: event.event_kind,
              label: burden.label,
              reasons: burden.reasons,
              score: burden.score,
              source_friction: burden.sourceFriction,
              time_ambiguity: burden.timeAmbiguity,
            };
          }),
          headers: { Prefer: "resolution=merge-duplicates" },
          method: "POST",
        },
      );
    }

    return jsonResponse({
      count: events.length,
      feedUrl,
      status: "ok",
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to sync civic events" },
      500,
    );
  }
});
