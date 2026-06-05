import {
  corsHeaders,
  jsonResponse,
  relevanceForUser,
  supabaseRest,
} from "../_shared/civic.ts";

type Profile = {
  user_id: string;
  notify_frequency: "immediate" | "daily" | "weekly" | "off";
};

type Region = {
  label: string;
  source_id: string | null;
  user_id: string;
};

type Topic = {
  label: string;
  query: string;
  user_id: string;
};

type Context = {
  goals: string[];
  user_id: string;
};

type EventRow = {
  actionability: "high" | "medium" | "low" | "unknown";
  event_date: string;
  event_kind: "federal" | "local";
  id: string;
  region_label: string;
  search_text: string;
  source_confidence: "high" | "partial" | "insufficient";
  source_id: string;
  source_url: string;
  summary: string;
  title: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const [profiles, regions, topics, contexts, events] = await Promise.all([
      supabaseRest<Profile[]>("/rest/v1/civic_profiles?select=user_id,notify_frequency"),
      supabaseRest<Region[]>("/rest/v1/civic_user_regions?select=user_id,label,source_id"),
      supabaseRest<Topic[]>("/rest/v1/civic_user_topics?select=user_id,label,query"),
      supabaseRest<Context[]>("/rest/v1/civic_private_context?select=user_id,goals"),
      supabaseRest<EventRow[]>(
        "/rest/v1/civic_events?select=id,event_kind,title,summary,source_url,event_date,region_label,source_id,search_text,actionability,source_confidence&order=last_seen_at.desc&limit=300",
      ),
    ]);

    const activeProfiles = profiles.filter((profile) => profile.notify_frequency !== "off");
    const scoreRows = [];
    const notificationRows = [];

    for (const profile of activeProfiles) {
      const userRegions = regions.filter((region) => region.user_id === profile.user_id);
      const userTopics = topics.filter((topic) => topic.user_id === profile.user_id);
      const goals =
        contexts.find((context) => context.user_id === profile.user_id)?.goals ?? [];

      for (const event of events) {
        const relevance = relevanceForUser(event, userRegions, userTopics, goals);
        if (relevance.score < 35) {
          continue;
        }

        scoreRows.push({
          confidence: relevance.confidence,
          event_id: event.id,
          event_kind: event.event_kind,
          matched_regions: relevance.matchedRegions,
          matched_terms: relevance.matchedTerms,
          reasons: relevance.reasons,
          score: relevance.score,
          user_id: profile.user_id,
        });
        notificationRows.push({
          delivery_state: "pending",
          event_id: event.id,
          event_kind: event.event_kind,
          notification_kind: "in_app",
          relevance_reasons: relevance.reasons,
          relevance_score: relevance.score,
          source_url: event.source_url,
          summary: event.summary,
          title: event.title,
          user_id: profile.user_id,
        });
      }
    }

    if (scoreRows.length > 0) {
      await supabaseRest("/rest/v1/civic_event_relevance_scores?on_conflict=user_id,event_id", {
        body: scoreRows,
        headers: { Prefer: "resolution=merge-duplicates" },
        method: "POST",
      });
    }

    if (notificationRows.length > 0) {
      await supabaseRest(
        "/rest/v1/civic_notifications?on_conflict=user_id,event_id,event_kind,notification_kind",
        {
          body: notificationRows,
          headers: { Prefer: "resolution=merge-duplicates" },
          method: "POST",
        },
      );
    }

    return jsonResponse({
      notifications: notificationRows.length,
      scores: scoreRows.length,
      status: "ok",
      users: activeProfiles.length,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to match civic alerts" },
      500,
    );
  }
});
