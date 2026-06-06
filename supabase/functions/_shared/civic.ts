import { civicBurdenForEvent } from "../../../shared/civic-burden.ts";

export const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

export type NormalizedCivicEvent = {
  id: string;
  event_kind: "federal" | "local";
  title: string;
  summary: string;
  source_name: string;
  source_url: string;
  event_date: string;
  region_label: string;
  source_id: string;
  actionability: "high" | "medium" | "low" | "unknown";
  source_confidence: "high" | "partial" | "insufficient";
  search_text: string;
  raw_payload: Record<string, unknown>;
};

type SupabaseOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  method?: string;
};

export function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    status,
  });
}

export function serviceConfig() {
  const url = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const key =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SERVICE_ROLE_KEY") ??
    "";

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return { key, url };
}

export async function supabaseRest<T>(path: string, options: SupabaseOptions = {}) {
  const config = serviceConfig();
  const response = await fetch(`${config.url}${path}`, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    method: options.method ?? "GET",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `${response.status} ${response.statusText}`);
  }

  return (text ? JSON.parse(text) : null) as T;
}

export function compactText(value: string, maxLength = 600) {
  const compacted = String(value ?? "").replace(/\s+/g, " ").trim();
  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, maxLength - 1).trim()}...`;
}

export function normalizeSearch(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceConfidence(sourceUrl: string, summary: string) {
  if (sourceUrl && summary.length > 40) {
    return "high" as const;
  }

  if (sourceUrl || summary.length > 40) {
    return "partial" as const;
  }

  return "insufficient" as const;
}

function actionability(title: string, summary: string, eventKind: "federal" | "local") {
  const text = normalizeSearch(`${title} ${summary}`);
  if (/\b(hearing|meeting|comment|agenda|vote|markup|rule|notice)\b/.test(text)) {
    return "high" as const;
  }

  if (eventKind === "local" || /\b(bill|resolution|proposed)\b/.test(text)) {
    return "medium" as const;
  }

  return "low" as const;
}

function eventId(parts: Array<string>) {
  return parts
    .map((part) => normalizeSearch(part).replace(/\s+/g, "-"))
    .filter(Boolean)
    .join(":")
    .slice(0, 240);
}

export function normalizeCivicData(payload: {
  federalFeeds?: Array<{
    id?: string;
    source?: string;
    chamber?: string;
    sourceUrl?: string;
    updated?: string;
    description?: string;
    items?: Array<{
      id?: string;
      title?: string;
      summary?: string;
      url?: string;
      published?: string;
      source?: string;
      chamber?: string;
    }>;
  }>;
  generatedAt?: string;
  municipalMeetings?: Array<{
    id?: string;
    title?: string;
    note?: string;
    status?: string;
    location?: string;
    sourceName?: string;
    sourceUrl?: string;
    agendaUrl?: string;
    minutesUrl?: string;
    videoUrl?: string;
    date?: string;
    place?: string;
    sourceId?: string;
  }>;
}) {
  const federal = (payload.federalFeeds ?? []).flatMap((feed) =>
    (feed.items ?? []).map((item) => {
      const title = compactText(item.title || feed.source || "Federal item", 220);
      const summary = compactText(item.summary || feed.description || "", 700);
      const sourceName = `${item.source || feed.source || "Federal source"} (${
        item.chamber || feed.chamber || "Federal"
      })`;
      const sourceUrl = item.url || feed.sourceUrl || "";
      const id = eventId(["federal", item.id || sourceUrl || title]);

      return {
        id,
        event_kind: "federal" as const,
        title,
        summary,
        source_name: sourceName,
        source_url: sourceUrl,
        event_date: item.published || feed.updated || payload.generatedAt || "",
        region_label: "Federal",
        source_id: feed.id || "",
        actionability: actionability(title, summary, "federal"),
        source_confidence: sourceConfidence(sourceUrl, summary),
        search_text: normalizeSearch([title, summary, sourceName, feed.chamber].join(" ")),
        raw_payload: item as Record<string, unknown>,
      };
    }),
  );

  const local = (payload.municipalMeetings ?? []).map((meeting) => {
    const title = compactText(meeting.title || "Local government meeting", 220);
    const summary = compactText(
      [meeting.note, meeting.status, meeting.location].filter(Boolean).join(" "),
      700,
    );
    const sourceName = meeting.sourceName || "Local source";
    const sourceUrl =
      meeting.agendaUrl || meeting.sourceUrl || meeting.minutesUrl || meeting.videoUrl || "";
    const id = eventId(["local", meeting.id || sourceUrl || title]);

    return {
      id,
      event_kind: "local" as const,
      title,
      summary,
      source_name: sourceName,
      source_url: sourceUrl,
      event_date: meeting.date || payload.generatedAt || "",
      region_label: meeting.place || "Local",
      source_id: meeting.sourceId || "",
      actionability: actionability(title, summary, "local"),
      source_confidence: sourceConfidence(sourceUrl, summary),
      search_text: normalizeSearch(
        [title, summary, sourceName, meeting.place, meeting.sourceId].join(" "),
      ),
      raw_payload: meeting as Record<string, unknown>,
    };
  });

  return [...local, ...federal] satisfies NormalizedCivicEvent[];
}

export function relevanceForUser(
  event: Pick<NormalizedCivicEvent, "actionability" | "event_date" | "region_label" | "search_text" | "source_confidence" | "source_id">,
  regions: Array<{ label: string; source_id?: string | null }>,
  topics: Array<{ label: string; query: string }>,
  goals: string[] = [],
) {
  const reasons: string[] = [];
  const matchedRegions = regions
    .filter((region) => {
      const label = normalizeSearch(region.label);
      const sourceId = normalizeSearch(region.source_id ?? "");
      return Boolean(
        label &&
          (event.search_text.includes(label) ||
            normalizeSearch(event.region_label).includes(label) ||
            Boolean(sourceId && event.search_text.includes(sourceId))),
      );
    })
    .map((region) => region.label);
  const matchedTerms = topics
    .filter((topic) => {
      const query = normalizeSearch(topic.query || topic.label);
      return query.length >= 2 && event.search_text.includes(query);
    })
    .map((topic) => topic.label || topic.query);
  const matchedGoals = goals.filter((goal) => {
    const normalized = normalizeSearch(goal);
    return normalized.length >= 3 && event.search_text.includes(normalized);
  });

  let score = 0;
  if (matchedRegions.length) {
    score += 30;
    reasons.push(`region match: ${matchedRegions.slice(0, 3).join(", ")}`);
  }

  if (matchedTerms.length) {
    score += 25;
    reasons.push(`topic match: ${matchedTerms.slice(0, 3).join(", ")}`);
  }

  if (matchedGoals.length) {
    score += 15;
    reasons.push(`goal match: ${matchedGoals.slice(0, 2).join(", ")}`);
  }

  if (event.actionability === "high") {
    score += 15;
    reasons.push("actionable public decision point");
  } else if (event.actionability === "medium") {
    score += 8;
    reasons.push("possible public decision point");
  }

  if (event.source_confidence === "high") {
    score += 10;
    reasons.push("official source and supporting text available");
  } else if (event.source_confidence === "partial") {
    score += 4;
    reasons.push("partial source evidence available");
  }

  const timestamp = Date.parse(event.event_date);
  if (!Number.isNaN(timestamp)) {
    const ageDays = Math.abs(Date.now() - timestamp) / 86400000;
    if (ageDays <= 14) {
      score += 5;
      reasons.push("recent item");
    }
  }

  return {
    confidence:
      event.source_confidence === "high" && reasons.length >= 2
        ? "high"
        : event.source_confidence === "insufficient"
          ? "insufficient"
          : "partial",
    matchedRegions,
    matchedTerms,
    reasons,
    score: Math.max(0, Math.min(100, score)),
  };
}

export function buildEvidenceBrief(input: {
  context?: { concerns?: string[]; goals?: string[]; life_context?: string };
  event: {
    eventKind?: "federal" | "local";
    event_date?: string;
    eventDate?: string;
    region_label?: string;
    regionLabel?: string;
    source_name?: string;
    sourceName?: string;
    source_url?: string;
    sourceUrl?: string;
    summary?: string;
    title: string;
  };
  match?: { confidence?: string; reasons?: string[]; score?: number };
  profile?: { home_region?: string };
}) {
  const event = input.event;
  const sourceName = event.source_name || event.sourceName || "official source";
  const sourceUrl = event.source_url || event.sourceUrl || "";
  const eventDate = event.event_date || event.eventDate || "";
  const region = event.region_label || event.regionLabel || input.profile?.home_region || "your area";
  const confidence =
    sourceUrl && input.match?.confidence === "high"
      ? "high"
      : sourceUrl
        ? "partial"
        : "insufficient";
  const burden = civicBurdenForEvent({
    eventDate,
    eventKind: event.eventKind,
    sourceConfidence: confidence,
    sourceName,
    sourceUrl,
    summary: event.summary ?? "",
    title: event.title,
  });
  const reasons = input.match?.reasons ?? [];
  const goals = input.context?.goals?.slice(0, 3) ?? [];
  const concerns = input.context?.concerns?.slice(0, 3) ?? [];

  return {
    citations: sourceUrl ? [{ label: sourceName, url: sourceUrl }] : [],
    confidence,
    decisionPending:
      event.eventKind === "local"
        ? "This appears to be tied to a local meeting, agenda, or public body action."
        : "This appears to be tied to federal legislative, agency, or public-record activity.",
    engagementSteps: [
      "Open the official source before acting.",
      "Check whether there is a meeting, comment deadline, vote, or responsible office.",
      "If you respond, make a narrow request tied to evidence, costs, benefits, and affected groups.",
    ],
    personalRead: goals.length
      ? `This may matter because it overlaps with your stated goals: ${goals.join(", ")}.`
      : `This may matter because it is active civic business connected to ${region}.`,
    relevanceScore: input.match?.score ?? null,
    sourceProof: sourceUrl
      ? `The source link for this item is ${sourceUrl}.`
      : "No official source URL is available, so this brief should be treated as insufficient evidence.",
    suggestedPosition:
      "No position is recommended. Treat this as a source-grounded checklist for deciding whether to learn more or respond.",
    tradeoffs: [
      concerns.length
        ? `User-stated concerns to check: ${concerns.join(", ")}.`
        : "Check who benefits, who bears costs, and who may be left out.",
      "Compare stated policy intent with implementation details, funding, enforcement, and oversight.",
      "Ask whether the action is urgent enough to justify acting before fuller public input.",
    ],
    whatHappened: `${sourceName} published or surfaced: ${event.title}${
      eventDate ? ` (${eventDate})` : ""
    }.`,
    whoCanAct:
      event.eventKind === "local"
        ? "The relevant local public body, staff, commenters, and affected residents can act."
        : "The relevant chamber, agency, committee, public commenters, and affected residents can act.",
    whyNow:
      reasons.length > 0
        ? `You are seeing this because ${reasons.join("; ")}.`
        : "You are seeing this because it is a current item in the civic feed.",
    whySeeing:
      reasons.length > 0
        ? reasons
        : ["current civic feed item", confidence === "insufficient" ? "source evidence incomplete" : "official source available"],
    burdenLabel: burden.label,
    burdenReasons: burden.reasons,
    burdenScore: burden.score,
  };
}
