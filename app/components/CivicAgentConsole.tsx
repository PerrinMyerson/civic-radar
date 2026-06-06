"use client";

import {
  AlertCircle,
  Bell,
  Bot,
  CheckCircle2,
  LoaderCircle,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  Vote,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  civicBurdenForEvent,
  type CivicBurdenResult,
} from "../../shared/civic-burden";

declare global {
  interface Window {
    __SUPABASE_ANON_KEY__?: string;
    __SUPABASE_URL__?: string;
  }
}

type FeedItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  published: string;
  source: string;
  chamber: string;
};

type FederalFeed = {
  id: string;
  source: string;
  chamber: string;
  sourceUrl: string;
  updated: string;
  description: string;
  items: FeedItem[];
  status: "live" | "error";
  error?: string;
};

type Meeting = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  status: string;
  agendaUrl: string;
  minutesUrl: string;
  videoUrl: string;
  sourceUrl: string;
  note: string;
  dayDiff: number | null;
  sourceId?: string;
  sourceName?: string;
  place?: string;
  lat?: number;
  lng?: number;
};

type MunicipalSource = {
  id: string;
  name: string;
  place: string;
  slug: string;
  kind: string;
  lat: number;
  lng: number;
  sourceUrl: string;
  status: "live" | "quiet" | "stale" | "error";
  latestDate: string;
  eventCount: number;
  totalFetched: number;
  events: Meeting[];
  error?: string;
};

type CivicData = {
  generatedAt: string;
  federalFeeds: FederalFeed[];
  municipalSources: MunicipalSource[];
  municipalMeetings: Meeting[];
};

type CivicAgentConsoleProps = {
  data: CivicData | null;
  selectedSource?: MunicipalSource;
};

type SupabaseConfig = {
  anonKey: string;
  url: string;
};

type SupabaseUser = {
  id: string;
  email?: string;
};

type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user: SupabaseUser;
};

type NotifyFrequency = "immediate" | "daily" | "weekly" | "off";
type TopicType = "topic" | "bill_keyword" | "agency" | "committee" | "local_body";
type AgentView = "alerts" | "agent" | "signals" | "public";
type EventKind = "federal" | "local";
type OnboardingStep = "welcome" | "regions" | "topics" | "alerts" | "context";
type RelevanceFeedbackType =
  | "relevant"
  | "not_relevant"
  | "wrong_region"
  | "wrong_topic"
  | "too_late"
  | "important_unclear";

type CivicProfile = {
  user_id: string;
  email: string;
  display_name: string;
  home_region: string;
  notification_email: string;
  notify_frequency: NotifyFrequency;
  onboarding_completed_at: string | null;
  onboarding_version: string;
};

type CivicRegion = {
  id: string;
  user_id: string;
  label: string;
  source_id: string | null;
  jurisdiction_kind: string | null;
  lat: number | null;
  lng: number | null;
  radius_miles: number;
};

type CivicTopic = {
  id: string;
  user_id: string;
  topic_type: TopicType;
  label: string;
  query: string;
};

type CivicPrivateContext = {
  user_id: string;
  goals: string[];
  concerns: string[];
  life_context: string;
  policy_priorities: Record<string, string>;
  agent_consent: boolean;
  candidate_agent_consent: boolean;
};

type CivicEvent = {
  id: string;
  eventKind: EventKind;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  eventDate: string;
  regionLabel: string;
  sourceId: string;
  searchText: string;
  burden: CivicBurdenResult;
};

type MatchedEvent = CivicEvent & {
  confidence: "high" | "partial" | "insufficient";
  matchedRegions: string[];
  matchedTerms: string[];
  relevanceReasons: string[];
  relevanceScore: number;
  score: number;
};

type PolicyBrief = {
  citations: Array<{ label: string; url: string }>;
  confidence: "high" | "partial" | "insufficient";
  decisionPending: string;
  engagementSteps: string[];
  personalRead: string;
  burdenLabel: CivicBurdenResult["label"];
  burdenReasons: string[];
  burdenScore: number;
  relevanceScore: number | null;
  sourceProof: string;
  suggestedPosition: string;
  tradeoffs: string[];
  whatHappened: string;
  whoCanAct: string;
  whyNow: string;
  whySeeing: string[];
};

type EventSignalSummary = {
  event_id: string;
  event_kind: EventKind;
  total_count: number;
  support_count: number;
  oppose_count: number;
  unsure_count: number;
  average_urgency: number | null;
  average_affectedness?: number | null;
  threshold_met: boolean;
};

type CandidateTopicSummary = {
  region_label: string;
  topic_query: string;
  total_count: number;
  support_count: number;
  oppose_count: number;
  unsure_count: number;
  average_urgency: number | null;
  average_affectedness?: number | null;
  threshold_met: boolean;
};

const SESSION_STORAGE_KEY = "civic-radar:supabase-session";
const DEFAULT_SUPABASE_URL = "https://aknpdgbtbpmfrpeuivyq.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrbnBkZ2J0YnBtZnJwZXVpdnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTY4MjIsImV4cCI6MjA5NjE3MjgyMn0.rmFb_8APPEyAXxx0bJ3AOx8gXlKZVIbbQFkNF_ZISKQ";

const DEFAULT_CONTEXT: CivicPrivateContext = {
  user_id: "",
  goals: [],
  concerns: [],
  life_context: "",
  policy_priorities: {},
  agent_consent: false,
  candidate_agent_consent: false,
};

const DEFAULT_TOPIC_FORM: Pick<CivicTopic, "topic_type" | "label" | "query"> = {
  topic_type: "topic",
  label: "",
  query: "",
};

const ONBOARDING_VERSION = "resident-burden-v1";

const ONBOARDING_STEPS: Array<{ id: OnboardingStep; label: string }> = [
  { id: "welcome", label: "Privacy" },
  { id: "regions", label: "Regions" },
  { id: "topics", label: "Topics" },
  { id: "alerts", label: "Alerts" },
  { id: "context", label: "Context" },
];

const RELEVANCE_FEEDBACK_OPTIONS: Array<{
  label: string;
  type: RelevanceFeedbackType;
}> = [
  { label: "Relevant", type: "relevant" },
  { label: "Not relevant", type: "not_relevant" },
  { label: "Wrong region", type: "wrong_region" },
  { label: "Wrong topic", type: "wrong_topic" },
  { label: "Too late", type: "too_late" },
  { label: "Important but unclear", type: "important_unclear" },
];

const POLICY_DOMAINS = [
  {
    label: "housing",
    terms: ["housing", "rent", "tenant", "zoning", "homeless", "shelter"],
  },
  {
    label: "transportation",
    terms: ["transit", "transportation", "street", "traffic", "bike", "rail"],
  },
  {
    label: "climate",
    terms: ["climate", "energy", "emission", "water", "resilience"],
  },
  {
    label: "public safety",
    terms: ["police", "fire", "public safety", "emergency", "crime"],
  },
  {
    label: "health",
    terms: ["health", "hospital", "medicaid", "mental", "public health"],
  },
  {
    label: "taxes and budget",
    terms: ["tax", "budget", "appropriation", "fee", "revenue", "grant"],
  },
  {
    label: "education",
    terms: ["school", "education", "student", "college", "library"],
  },
];

const AGENT_VIEWS: Array<{
  id: AgentView;
  label: string;
  Icon: typeof Bell;
}> = [
  { id: "alerts", label: "Alerts", Icon: Bell },
  { id: "agent", label: "Brief", Icon: Bot },
  { id: "signals", label: "Feedback", Icon: Vote },
  { id: "public", label: "Public pulse", Icon: Users },
];

function envValue(key: string) {
  if (typeof process === "undefined") {
    return "";
  }

  return process.env[key] ?? "";
}

function readSupabaseConfig(): SupabaseConfig | null {
  if (typeof window === "undefined") {
    return null;
  }

  const url =
    window.__SUPABASE_URL__ ||
    envValue("NEXT_PUBLIC_SUPABASE_URL") ||
    envValue("SUPABASE_URL") ||
    DEFAULT_SUPABASE_URL;
  const anonKey =
    window.__SUPABASE_ANON_KEY__ ||
    envValue("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    envValue("SUPABASE_ANON_KEY") ||
    DEFAULT_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return {
    anonKey,
    url: url.replace(/\/$/, ""),
  };
}

function normalizeSession(payload: SupabaseSession): SupabaseSession {
  return {
    ...payload,
    expires_at:
      payload.expires_at ??
      (payload.expires_in
        ? Math.floor(Date.now() / 1000) + payload.expires_in
        : undefined),
  };
}

function saveSession(session: SupabaseSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function readStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as SupabaseSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function authHeaders(config: SupabaseConfig, token?: string) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${token ?? config.anonKey}`,
  };
}

async function supabaseRequest<T>(
  config: SupabaseConfig,
  path: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    method?: string;
    token?: string;
  } = {},
) {
  const response = await fetch(`${config.url}${path}`, {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: {
      ...authHeaders(config, options.token),
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    method: options.method ?? "GET",
  });

  const text = await response.text();
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;

    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string; msg?: string };
      message = parsed.message ?? parsed.error ?? parsed.msg ?? message;
    } catch {
      if (text) {
        message = text;
      }
    }

    throw new Error(message);
  }

  return (text ? JSON.parse(text) : null) as T;
}

function splitLines(value: string) {
  return value
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function joinLines(values: string[]) {
  return values.join("\n");
}

function priorityTextToJson(value: string) {
  return Object.fromEntries(
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [key, ...rest] = line.split(":");
        return [key.trim(), rest.join(":").trim() || "important"];
      }),
  );
}

function priorityJsonToText(value: Record<string, string>) {
  return Object.entries(value)
    .map(([key, description]) => `${key}: ${description}`)
    .join("\n");
}

function compactText(value: string, maxLength = 180) {
  const compacted = value.replace(/\s+/g, " ").trim();
  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, maxLength - 1).trim()}...`;
}

function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ");
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function flattenEvents(data: CivicData | null): CivicEvent[] {
  if (!data) {
    return [];
  }

  const federal = data.federalFeeds.flatMap((feed) =>
    feed.items.map((item) => {
      const title = item.title || feed.source;
      const summary = item.summary || feed.description || "";
      const sourceName = `${item.source || feed.source} (${item.chamber || feed.chamber})`;
      const searchText = normalizeSearch(
        [title, summary, sourceName, item.chamber, feed.source].join(" "),
      );

      const event = {
        id: item.id || `${feed.id}:${title}`,
        eventKind: "federal" as const,
        title,
        summary,
        sourceName,
        sourceUrl: item.url || feed.sourceUrl,
        eventDate: item.published || feed.updated || data.generatedAt,
        regionLabel: "Federal",
        sourceId: feed.id,
        searchText,
      };

      return {
        ...event,
        burden: civicBurdenForEvent(event),
      };
    }),
  );

  const local = data.municipalMeetings.map((meeting) => {
    const title = meeting.title || "Government meeting";
    const summary = [meeting.note, meeting.status, meeting.location].filter(Boolean).join(" ");
    const sourceName = meeting.sourceName ?? "Local meeting";
    const regionLabel = meeting.place ?? "Local";
    const searchText = normalizeSearch(
      [
        title,
        summary,
        sourceName,
        regionLabel,
        meeting.sourceId,
        meeting.location,
      ].join(" "),
    );

    const event = {
      id: meeting.id,
      eventKind: "local" as const,
      title,
      summary,
      sourceName,
      sourceUrl:
        meeting.agendaUrl ||
        meeting.sourceUrl ||
        meeting.videoUrl ||
        meeting.minutesUrl ||
        "",
      eventDate: meeting.date,
      regionLabel,
      sourceId: meeting.sourceId ?? "",
      searchText,
    };

    return {
      ...event,
      burden: civicBurdenForEvent(event),
    };
  });

  return [...local, ...federal].slice(0, 180);
}

function matchEvents(
  events: CivicEvent[],
  regions: CivicRegion[],
  topics: CivicTopic[],
  context: CivicPrivateContext,
) {
  return events
    .map((event) => {
      const matchedRegions = regions.filter((region) => {
        const label = normalizeSearch(region.label);
        const sourceId = normalizeSearch(region.source_id ?? "");

        return Boolean(
          label &&
            (event.searchText.includes(label) ||
              Boolean(sourceId && event.searchText.includes(sourceId)) ||
              normalizeSearch(event.regionLabel).includes(label)),
        );
      });

      const matchedTopics = topics.filter((topic) => {
        const query = normalizeSearch(topic.query || topic.label);
        return query.length >= 2 && event.searchText.includes(query);
      });
      const matchedGoals = context.goals.filter((goal) => {
        const normalized = normalizeSearch(goal);
        return normalized.length >= 3 && event.searchText.includes(normalized);
      });
      const { confidence, relevanceReasons, relevanceScore } = relevanceForEvent(
        event,
        matchedRegions.map((region) => region.label),
        matchedTopics.map((topic) => topic.label || topic.query),
        matchedGoals,
      );

      const score = matchedRegions.length * 2 + matchedTopics.length + matchedGoals.length;

      return {
        ...event,
        confidence,
        matchedRegions: matchedRegions.map((region) => region.label),
        matchedTerms: matchedTopics.map((topic) => topic.label || topic.query),
        relevanceReasons,
        relevanceScore,
        score,
      };
    })
    .filter((event) => event.score > 0)
    .sort((a, b) => b.score - a.score || b.eventDate.localeCompare(a.eventDate));
}

function sourceConfidence(event: CivicEvent) {
  if (event.sourceUrl && event.summary.length > 40) {
    return "high" as const;
  }

  if (event.sourceUrl || event.summary.length > 40) {
    return "partial" as const;
  }

  return "insufficient" as const;
}

function actionabilityReason(event: CivicEvent) {
  if (/\b(hearing|meeting|comment|agenda|vote|markup|rule|notice)\b/.test(event.searchText)) {
    return { label: "actionable public decision point", score: 15 };
  }

  if (event.eventKind === "local" || /\b(bill|resolution|proposed)\b/.test(event.searchText)) {
    return { label: "possible public decision point", score: 8 };
  }

  return { label: "", score: 0 };
}

function recencyReason(event: CivicEvent) {
  const timestamp = Date.parse(event.eventDate);
  if (Number.isNaN(timestamp)) {
    return { label: "", score: 0 };
  }

  const ageDays = Math.abs(Date.now() - timestamp) / 86400000;
  if (ageDays <= 14) {
    return { label: "recent item", score: 5 };
  }

  return { label: "", score: 0 };
}

function relevanceForEvent(
  event: CivicEvent,
  matchedRegions: string[],
  matchedTerms: string[],
  matchedGoals: string[],
) {
  const reasons: string[] = [];
  let relevanceScore = 0;

  if (matchedRegions.length > 0) {
    relevanceScore += 30;
    reasons.push(`region match: ${matchedRegions.slice(0, 3).join(", ")}`);
  }

  if (matchedTerms.length > 0) {
    relevanceScore += 25;
    reasons.push(`topic match: ${matchedTerms.slice(0, 3).join(", ")}`);
  }

  if (matchedGoals.length > 0) {
    relevanceScore += 15;
    reasons.push(`goal match: ${matchedGoals.slice(0, 2).join(", ")}`);
  }

  const actionability = actionabilityReason(event);
  if (actionability.score > 0) {
    relevanceScore += actionability.score;
    reasons.push(actionability.label);
  }

  const confidence = sourceConfidence(event);
  if (confidence === "high") {
    relevanceScore += 10;
    reasons.push("official source and supporting text available");
  } else if (confidence === "partial") {
    relevanceScore += 4;
    reasons.push("partial source evidence available");
  }

  const recency = recencyReason(event);
  if (recency.score > 0) {
    relevanceScore += recency.score;
    reasons.push(recency.label);
  }

  return {
    confidence: confidence === "high" && reasons.length >= 2 ? "high" : confidence,
    relevanceReasons: reasons,
    relevanceScore: Math.max(0, Math.min(100, relevanceScore)),
  };
}

function deriveTopicTags(event: CivicEvent, topics: CivicTopic[]) {
  const matchedDomains = POLICY_DOMAINS.filter((domain) =>
    domain.terms.some((term) => event.searchText.includes(term)),
  ).map((domain) => domain.label);
  const matchedWatchTopics = topics
    .filter((topic) => event.searchText.includes(normalizeSearch(topic.query || topic.label)))
    .map((topic) => topic.label || topic.query);

  return uniqueValues([...matchedDomains, ...matchedWatchTopics]).slice(0, 8);
}

function eventDateLabel(value: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return value || "Latest";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function buildPolicyBrief(
  event: CivicEvent,
  context: CivicPrivateContext,
  profile: CivicProfile | null,
  topics: CivicTopic[],
  matchedEvent?: MatchedEvent | null,
): PolicyBrief {
  const tags = deriveTopicTags(event, topics);
  const goals = context.goals.slice(0, 4);
  const concerns = context.concerns.slice(0, 4);
  const userRegion = profile?.home_region || event.regionLabel;
  const confidence = matchedEvent?.confidence ?? sourceConfidence(event);
  const relevanceReasons =
    matchedEvent?.relevanceReasons ??
    relevanceForEvent(event, [], [], []).relevanceReasons;
  const relevanceScore = matchedEvent?.relevanceScore ?? null;
  const burden = event.burden;
  const concernText = concerns.length
    ? `Watch for downside risk around ${concerns.join(", ")}.`
    : "Watch for implementation risk, budget impact, and who is left out.";
  const goalText = goals.length
    ? `This connects to your stated goals around ${goals.join(", ")}.`
    : `This is relevant to ${userRegion} because it is active civic business from ${event.sourceName}.`;
  const topicText = tags.length ? tags.join(", ") : "general civic operations";

  return {
    confidence,
    decisionPending:
      event.eventKind === "local"
        ? "This appears tied to a local meeting, agenda, or public body action."
        : "This appears tied to federal legislative, agency, or public-record activity.",
    whyNow: `${event.sourceName} has a current item dated ${eventDateLabel(
      event.eventDate,
    )}. The strongest detected policy area is ${topicText}.`,
    whySeeing:
      relevanceReasons.length > 0
        ? relevanceReasons
        : ["current civic feed item", "watchlist match not yet established"],
    burdenLabel: burden.label,
    burdenReasons: burden.reasons,
    burdenScore: burden.score,
    personalRead: `${goalText} ${concernText}`,
    relevanceScore,
    sourceProof: event.sourceUrl
      ? `Official source available: ${event.sourceUrl}`
      : "No official source URL is available. Treat this brief as insufficient evidence.",
    suggestedPosition:
      "No position is recommended. Use this as a source-grounded checklist for deciding whether to learn more or respond.",
    tradeoffs: [
      "Speed versus scrutiny: faster action can help urgent needs but may miss public input.",
      "Broad benefit versus concentrated cost: the public upside may not be evenly distributed.",
      "Policy intent versus implementation: the official record may not show staffing, enforcement, or equity details yet.",
    ],
    engagementSteps: [
      "Open the cited source and confirm the official agenda, bill, rule, or hearing text.",
      "Ask what concrete outcome would change for residents, workers, families, or businesses like yours.",
      "Submit a focused comment only after approving the final wording yourself.",
    ],
    citations: [
      {
        label: event.sourceName,
        url: event.sourceUrl,
      },
    ].filter((citation) => citation.url),
    whatHappened: `${event.sourceName} surfaced: ${event.title}.`,
    whoCanAct:
      event.eventKind === "local"
        ? "The public body, staff, commenters, and affected residents can act."
        : "The relevant chamber, agency, committee, commenters, and affected residents can act.",
  };
}

function buildAdvocacyDraft(
  event: CivicEvent,
  brief: PolicyBrief,
  context: CivicPrivateContext,
  draftType: "comment" | "email" | "testimony" | "call_script",
) {
  const goalLine = context.goals.length
    ? `My priorities include ${context.goals.slice(0, 3).join(", ")}.`
    : "I am trying to understand the practical impact of this item.";
  const concernLine = context.concerns.length
    ? `I am especially watching ${context.concerns.slice(0, 3).join(", ")}.`
    : "I want the record to address costs, benefits, implementation, and affected groups.";
  const sourceLine = event.sourceUrl ? `Source: ${event.sourceUrl}` : "";
  const core = [
    `Regarding: ${event.title}`,
    "",
    goalLine,
    concernLine,
    "",
    `My current civic reading is: ${brief.suggestedPosition}`,
    "",
    "Please add a clear public explanation of expected outcomes, tradeoffs, funding, and accountability measures before final action.",
    sourceLine,
  ]
    .filter((line) => line !== "")
    .join("\n");

  if (draftType === "call_script") {
    return [
      `Hello, I am calling about ${event.title}.`,
      goalLine,
      concernLine,
      "I would like the office to explain the expected public impact and accountability plan before final action.",
      "Thank you.",
      sourceLine,
    ]
      .filter((line) => line !== "")
      .join("\n");
  }

  if (draftType === "testimony") {
    return `Chair and members,\n\n${core}\n\nThank you for including this in the public record.`;
  }

  if (draftType === "email") {
    return `Subject: Public comment on ${event.title}\n\n${core}\n\nRespectfully,`;
  }

  return core;
}

function statusMessage(error: string, success: string) {
  if (error) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-rose-700">
        <AlertCircle className="h-3.5 w-3.5" />
        {error}
      </p>
    );
  }

  if (success) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {success}
      </p>
    );
  }

  return null;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">{children}</label>;
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200">
      {children}
    </span>
  );
}

function BurdenPill({ burden }: { burden: CivicBurdenResult }) {
  const tone =
    burden.label === "High burden"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : burden.label === "Moderate burden"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-emerald-50 text-emerald-700 ring-emerald-200";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${tone}`}>
      {burden.score}/100 {burden.label}
    </span>
  );
}

export default function CivicAgentConsole({
  data,
  selectedSource,
}: CivicAgentConsoleProps) {
  const [supabase, setSupabase] = useState<SupabaseConfig | null>(null);
  const [configResolved, setConfigResolved] = useState(false);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [agentView, setAgentView] = useState<AgentView>("alerts");

  const [profile, setProfile] = useState<CivicProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    display_name: "",
    home_region: "",
    notification_email: "",
    notify_frequency: "daily" as NotifyFrequency,
  });
  const [regions, setRegions] = useState<CivicRegion[]>([]);
  const [topics, setTopics] = useState<CivicTopic[]>([]);
  const [context, setContext] = useState<CivicPrivateContext>(DEFAULT_CONTEXT);
  const [contextForm, setContextForm] = useState({
    goals: "",
    concerns: "",
    life_context: "",
    policy_priorities: "",
    agent_consent: false,
    candidate_agent_consent: false,
  });
  const [regionForm, setRegionForm] = useState({
    label: "",
    radius_miles: 75,
  });
  const [topicForm, setTopicForm] = useState(DEFAULT_TOPIC_FORM);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [dataSuccess, setDataSuccess] = useState("");

  const [activeEventId, setActiveEventId] = useState("");
  const [brief, setBrief] = useState<PolicyBrief | null>(null);
  const [draftType, setDraftType] = useState<"comment" | "email" | "testimony" | "call_script">("comment");
  const [advocacyDraft, setAdvocacyDraft] = useState("");
  const [position, setPosition] = useState<"support" | "oppose" | "unsure">("unsure");
  const [urgency, setUrgency] = useState(3);
  const [affectedness, setAffectedness] = useState(3);
  const [reason, setReason] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [eventSummary, setEventSummary] = useState<EventSignalSummary | null>(null);
  const [candidateForm, setCandidateForm] = useState({
    requester_role: "candidate",
    region_label: "",
    topic_query: "",
    question: "",
    min_threshold: 5,
  });
  const [candidateSummary, setCandidateSummary] = useState<CandidateTopicSummary | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("welcome");
  const [feedbackSaving, setFeedbackSaving] = useState("");
  const syncedMatchesRef = useRef("");

  const civicEvents = useMemo(() => flattenEvents(data), [data]);
  const matchedEvents = useMemo(
    () => matchEvents(civicEvents, regions, topics, context),
    [civicEvents, context, regions, topics],
  );
  const activeEvent = useMemo(() => {
    return (
      civicEvents.find((event) => event.id === activeEventId) ??
      matchedEvents[0] ??
      civicEvents[0] ??
      null
    );
  }, [activeEventId, civicEvents, matchedEvents]);
  const activeMatchedEvent = useMemo(() => {
    if (!activeEvent) {
      return null;
    }

    return matchedEvents.find((event) => event.id === activeEvent.id) ?? null;
  }, [activeEvent, matchedEvents]);
  const activeTopicTags = useMemo(
    () => (activeEvent ? deriveTopicTags(activeEvent, topics) : []),
    [activeEvent, topics],
  );

  const isConfigured = Boolean(supabase);
  const isSignedIn = Boolean(session?.access_token);
  const showOnboarding = Boolean(
    isSignedIn && profile && !profile.onboarding_completed_at && !onboardingDismissed,
  );
  const methodologyHref =
    typeof window !== "undefined" && window.__CIVIC_DATA_URL__
      ? "./methodology.html"
      : "/methodology";

  useEffect(() => {
    const configTimer = window.setTimeout(() => {
      setSupabase(readSupabaseConfig());
      setConfigResolved(true);
    }, 0);

    return () => window.clearTimeout(configTimer);
  }, []);

  const setAndSaveSession = useCallback((nextSession: SupabaseSession | null) => {
    setSession(nextSession);
    saveSession(nextSession);
  }, []);

  const loadUserData = useCallback(async () => {
    if (!supabase || !session?.access_token || !session.user.id) {
      return;
    }

    setDataLoading(true);
    setDataError("");
    setDataSuccess("");

    try {
      const userId = session.user.id;
      const filter = `user_id=eq.${encodeURIComponent(userId)}`;
      const [
        profileRows,
        regionRows,
        topicRows,
        contextRows,
      ] = await Promise.all([
        supabaseRequest<CivicProfile[]>(
          supabase,
          `/rest/v1/civic_profiles?${filter}&select=*`,
          { token: session.access_token },
        ),
        supabaseRequest<CivicRegion[]>(
          supabase,
          `/rest/v1/civic_user_regions?${filter}&select=*&order=created_at.desc`,
          { token: session.access_token },
        ),
        supabaseRequest<CivicTopic[]>(
          supabase,
          `/rest/v1/civic_user_topics?${filter}&select=*&order=created_at.desc`,
          { token: session.access_token },
        ),
        supabaseRequest<CivicPrivateContext[]>(
          supabase,
          `/rest/v1/civic_private_context?${filter}&select=*`,
          { token: session.access_token },
        ),
      ]);

      const loadedProfile =
        profileRows[0] ??
        ({
          user_id: userId,
          email: session.user.email ?? "",
          display_name: "",
          home_region: "",
          notification_email: session.user.email ?? "",
          notify_frequency: "daily",
          onboarding_completed_at: null,
          onboarding_version: ONBOARDING_VERSION,
        } satisfies CivicProfile);
      const loadedContext =
        contextRows[0] ??
        ({
          ...DEFAULT_CONTEXT,
          user_id: userId,
        } satisfies CivicPrivateContext);

      setProfile(loadedProfile);
      setProfileForm({
        display_name: loadedProfile.display_name,
        home_region: loadedProfile.home_region,
        notification_email: loadedProfile.notification_email || session.user.email || "",
        notify_frequency: loadedProfile.notify_frequency,
      });
      setRegions(regionRows);
      setTopics(topicRows);
      setContext(loadedContext);
      setContextForm({
        goals: joinLines(loadedContext.goals ?? []),
        concerns: joinLines(loadedContext.concerns ?? []),
        life_context: loadedContext.life_context ?? "",
        policy_priorities: priorityJsonToText(loadedContext.policy_priorities ?? {}),
        agent_consent: loadedContext.agent_consent,
        candidate_agent_consent: loadedContext.candidate_agent_consent,
      });
    } catch (error) {
      setDataError(
        error instanceof Error ? error.message : "Unable to load civic agent data",
      );
    } finally {
      setDataLoading(false);
    }
  }, [session?.access_token, session?.user.email, session?.user.id, supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const stored = readStoredSession();
    if (!stored?.access_token) {
      return;
    }

    let mounted = true;

    async function restoreSession() {
      try {
        const user = await supabaseRequest<SupabaseUser>(supabase, "/auth/v1/user", {
          token: stored.access_token,
        });
        const restored = normalizeSession({ ...stored, user });
        if (mounted) {
          setAndSaveSession(restored);
        }
      } catch {
        if (!stored.refresh_token) {
          saveSession(null);
          return;
        }

        try {
          const refreshed = await supabaseRequest<SupabaseSession>(
            supabase,
            "/auth/v1/token?grant_type=refresh_token",
            {
              body: { refresh_token: stored.refresh_token },
              method: "POST",
            },
          );
          if (mounted) {
            setAndSaveSession(normalizeSession(refreshed));
          }
        } catch {
          saveSession(null);
        }
      }
    }

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, [setAndSaveSession, supabase]);

  useEffect(() => {
    if (session?.access_token) {
      const loadTimer = window.setTimeout(() => {
        void loadUserData();
      }, 0);

      return () => window.clearTimeout(loadTimer);
    }
  }, [loadUserData, session?.access_token]);

  const syncAlertMatches = useCallback(
    async (silent = false) => {
      if (!supabase || !session?.access_token || !session.user.id || matchedEvents.length === 0) {
        return;
      }

      if (!silent) {
        setDataLoading(true);
        setDataError("");
        setDataSuccess("");
      }

      try {
        await supabaseRequest<unknown>(
          supabase,
          "/rest/v1/civic_event_matches?on_conflict=user_id,event_id,event_kind",
          {
            body: matchedEvents.slice(0, 40).map((event) => ({
              user_id: session.user.id,
              event_id: event.id,
              event_kind: event.eventKind,
              title: event.title,
              summary: compactText(event.summary, 600),
              source_name: event.sourceName,
              source_url: event.sourceUrl,
              event_date: event.eventDate,
              matched_terms: event.matchedTerms,
              matched_regions: event.matchedRegions,
              status: "new",
            })),
            headers: {
              Prefer: "resolution=merge-duplicates",
            },
            method: "POST",
            token: session.access_token,
          },
        );
        await Promise.all([
          supabaseRequest<unknown>(
            supabase,
            "/rest/v1/civic_event_relevance_scores?on_conflict=user_id,event_id",
            {
              body: matchedEvents.slice(0, 40).map((event) => ({
                confidence: event.confidence,
                event_id: event.id,
                event_kind: event.eventKind,
                matched_regions: event.matchedRegions,
                matched_terms: event.matchedTerms,
                reasons: event.relevanceReasons,
                score: event.relevanceScore,
                user_id: session.user.id,
              })),
              headers: {
                Prefer: "resolution=merge-duplicates",
              },
              method: "POST",
              token: session.access_token,
            },
          ),
          supabaseRequest<unknown>(
            supabase,
            "/rest/v1/civic_notifications?on_conflict=user_id,event_id,event_kind,notification_kind",
            {
              body: matchedEvents.slice(0, 40).map((event) => ({
                delivery_state: "pending",
                event_id: event.id,
                event_kind: event.eventKind,
                notification_kind: "in_app",
                relevance_reasons: event.relevanceReasons,
                relevance_score: event.relevanceScore,
                source_url: event.sourceUrl,
                summary: compactText(event.summary, 600),
                title: event.title,
                user_id: session.user.id,
              })),
              headers: {
                Prefer: "resolution=merge-duplicates",
              },
              method: "POST",
              token: session.access_token,
            },
          ),
        ]);

        if (!silent) {
          setDataSuccess("Alert matches and in-app notifications synced");
        }
      } catch (error) {
        if (!silent) {
          setDataError(error instanceof Error ? error.message : "Unable to sync alerts");
        }
      } finally {
        if (!silent) {
          setDataLoading(false);
        }
      }
    },
    [matchedEvents, session?.access_token, session?.user.id, supabase],
  );

  useEffect(() => {
    if (!session?.user.id || matchedEvents.length === 0) {
      return;
    }

    const syncKey = `${session.user.id}:${matchedEvents
      .slice(0, 12)
      .map((event) => event.id)
      .join("|")}`;

    if (syncedMatchesRef.current === syncKey) {
      return;
    }

    syncedMatchesRef.current = syncKey;
    void syncAlertMatches(true);
  }, [matchedEvents, session?.user.id, syncAlertMatches]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      const path =
        authMode === "signup" ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
      const payload = await supabaseRequest<Partial<SupabaseSession> & { user?: SupabaseUser }>(
        supabase,
        path,
        {
          body: {
            email: authEmail.trim(),
            password: authPassword,
          },
          method: "POST",
        },
      );

      if (payload.access_token && payload.user) {
        setAndSaveSession(normalizeSession(payload as SupabaseSession));
        setOnboardingDismissed(false);
        setOnboardingStep("welcome");
        setAuthSuccess("Signed in");
        return;
      }

      setAuthSuccess("Account created. Check email confirmation if sign-in is not active yet.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    if (supabase && session?.access_token) {
      await supabaseRequest<unknown>(supabase, "/auth/v1/logout", {
        method: "POST",
        token: session.access_token,
      }).catch(() => null);
    }

    setAndSaveSession(null);
    setProfile(null);
    setRegions([]);
    setTopics([]);
    setContext(DEFAULT_CONTEXT);
    setOnboardingDismissed(false);
    setOnboardingStep("welcome");
  }

  async function saveProfile() {
    if (!supabase || !session?.access_token || !session.user.id) {
      return;
    }

    setDataLoading(true);
    setDataError("");
    setDataSuccess("");

    try {
      const rows = await supabaseRequest<CivicProfile[]>(
        supabase,
        "/rest/v1/civic_profiles?on_conflict=user_id&select=*",
        {
          body: {
            user_id: session.user.id,
            email: session.user.email ?? authEmail.trim(),
            ...profileForm,
          },
          headers: {
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          method: "POST",
          token: session.access_token,
        },
      );

      setProfile(rows[0] ?? null);
      setDataSuccess("Profile saved");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to save profile");
    } finally {
      setDataLoading(false);
    }
  }

  async function saveContext() {
    if (!supabase || !session?.access_token || !session.user.id) {
      return false;
    }

    setDataLoading(true);
    setDataError("");
    setDataSuccess("");

    try {
      const rows = await supabaseRequest<CivicPrivateContext[]>(
        supabase,
        "/rest/v1/civic_private_context?on_conflict=user_id&select=*",
        {
          body: {
            user_id: session.user.id,
            goals: splitLines(contextForm.goals),
            concerns: splitLines(contextForm.concerns),
            life_context: contextForm.life_context.trim(),
            policy_priorities: priorityTextToJson(contextForm.policy_priorities),
            agent_consent: contextForm.agent_consent,
            candidate_agent_consent: contextForm.candidate_agent_consent,
          },
          headers: {
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          method: "POST",
          token: session.access_token,
        },
      );

      setContext(rows[0] ?? DEFAULT_CONTEXT);
      setDataSuccess("Civic context saved");
      return true;
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to save context");
      return false;
    } finally {
      setDataLoading(false);
    }
  }

  async function addRegion(region?: {
    label: string;
    source_id?: string;
    jurisdiction_kind?: string;
    lat?: number;
    lng?: number;
  }) {
    if (!supabase || !session?.access_token || !session.user.id) {
      return;
    }

    const label = region?.label ?? regionForm.label.trim();
    if (!label) {
      setDataError("Region label is required");
      return;
    }

    setDataLoading(true);
    setDataError("");
    setDataSuccess("");

    try {
      const rows = await supabaseRequest<CivicRegion[]>(
        supabase,
        "/rest/v1/civic_user_regions?select=*",
        {
          body: {
            user_id: session.user.id,
            label,
            source_id: region?.source_id ?? null,
            jurisdiction_kind: region?.jurisdiction_kind ?? null,
            lat: region?.lat ?? null,
            lng: region?.lng ?? null,
            radius_miles: regionForm.radius_miles,
          },
          headers: {
            Prefer: "return=representation",
          },
          method: "POST",
          token: session.access_token,
        },
      );

      setRegions((current) => [...rows, ...current]);
      setProfileForm((current) =>
        current.home_region
          ? current
          : {
              ...current,
              home_region: label,
            },
      );
      setRegionForm({ label: "", radius_miles: 75 });
      setDataSuccess("Region added");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to add region");
    } finally {
      setDataLoading(false);
    }
  }

  async function addTopic(topic?: Partial<Pick<CivicTopic, "label" | "query" | "topic_type">>) {
    if (!supabase || !session?.access_token || !session.user.id) {
      return;
    }

    const label = (topic?.label ?? topicForm.label).trim();
    const query = (topic?.query ?? topicForm.query).trim() || label;
    if (!label || !query) {
      setDataError("Topic label and query are required");
      return;
    }

    setDataLoading(true);
    setDataError("");
    setDataSuccess("");

    try {
      const rows = await supabaseRequest<CivicTopic[]>(
        supabase,
        "/rest/v1/civic_user_topics?select=*",
        {
          body: {
            user_id: session.user.id,
            topic_type: topic?.topic_type ?? topicForm.topic_type,
            label,
            query,
          },
          headers: {
            Prefer: "return=representation",
          },
          method: "POST",
          token: session.access_token,
        },
      );

      setTopics((current) => [...rows, ...current]);
      if (!topic) {
        setTopicForm(DEFAULT_TOPIC_FORM);
      }
      setDataSuccess("Topic added");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to add topic");
    } finally {
      setDataLoading(false);
    }
  }

  async function deleteRow(table: "civic_user_regions" | "civic_user_topics", id: string) {
    if (!supabase || !session?.access_token) {
      return;
    }

    setDataLoading(true);
    setDataError("");
    setDataSuccess("");

    try {
      await supabaseRequest<unknown>(supabase, `/rest/v1/${table}?id=eq.${id}`, {
        method: "DELETE",
        token: session.access_token,
      });

      if (table === "civic_user_regions") {
        setRegions((current) => current.filter((row) => row.id !== id));
      } else {
        setTopics((current) => current.filter((row) => row.id !== id));
      }

      setDataSuccess("Deleted");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to delete row");
    } finally {
      setDataLoading(false);
    }
  }

  async function completeOnboarding() {
    if (!supabase || !session?.access_token || !session.user.id) {
      return;
    }

    setDataLoading(true);
    setDataError("");
    setDataSuccess("");

    try {
      const completedAt = new Date().toISOString();
      const rows = await supabaseRequest<CivicProfile[]>(
        supabase,
        "/rest/v1/civic_profiles?on_conflict=user_id&select=*",
        {
          body: {
            user_id: session.user.id,
            email: session.user.email ?? authEmail.trim(),
            ...profileForm,
            onboarding_completed_at: completedAt,
            onboarding_version: ONBOARDING_VERSION,
          },
          headers: {
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          method: "POST",
          token: session.access_token,
        },
      );

      setProfile(rows[0] ?? {
        user_id: session.user.id,
        email: session.user.email ?? authEmail.trim(),
        ...profileForm,
        onboarding_completed_at: completedAt,
        onboarding_version: ONBOARDING_VERSION,
      });
      setOnboardingDismissed(false);
      setDataSuccess("Onboarding complete");
      await syncAlertMatches(true);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to complete onboarding");
    } finally {
      setDataLoading(false);
    }
  }

  async function saveRelevanceFeedback(event: CivicEvent, feedbackType: RelevanceFeedbackType) {
    if (!supabase || !session?.access_token || !session.user.id) {
      return;
    }

    setFeedbackSaving(`${event.id}:${feedbackType}`);
    setDataError("");
    setDataSuccess("");

    try {
      await supabaseRequest<unknown>(
        supabase,
        "/rest/v1/civic_relevance_feedback?on_conflict=user_id,event_id,event_kind,feedback_type",
        {
          body: {
            comment: "",
            event_id: event.id,
            event_kind: event.eventKind,
            feedback_type: feedbackType,
            user_id: session.user.id,
          },
          headers: {
            Prefer: "resolution=merge-duplicates",
          },
          method: "POST",
          token: session.access_token,
        },
      );
      setDataSuccess("Relevance feedback saved");
    } catch (error) {
      setDataError(
        error instanceof Error ? error.message : "Unable to save relevance feedback",
      );
    } finally {
      setFeedbackSaving("");
    }
  }

  async function generateBrief() {
    if (!activeEvent) {
      return;
    }

    let nextBrief = buildPolicyBrief(
      activeEvent,
      context,
      profile,
      topics,
      activeMatchedEvent,
    );
    if (supabase) {
      try {
        const edgeResponse = await fetch(`${supabase.url}/functions/v1/generate-civic-brief`, {
          body: JSON.stringify({
            context,
            event: activeEvent,
            match: activeMatchedEvent
              ? {
                  confidence: activeMatchedEvent.confidence,
                  reasons: activeMatchedEvent.relevanceReasons,
                  score: activeMatchedEvent.relevanceScore,
                }
              : null,
            profile,
          }),
          headers: {
            ...authHeaders(supabase, session?.access_token),
            "Content-Type": "application/json",
          },
          method: "POST",
        });

        if (edgeResponse.ok) {
          const payload = (await edgeResponse.json()) as { brief?: Partial<PolicyBrief> };
          nextBrief = {
            ...nextBrief,
            ...(payload.brief ?? {}),
          };
        }
      } catch {
        // Static and local builds keep the deterministic fallback when functions are absent.
      }
    }

    setBrief(nextBrief);
    setAdvocacyDraft("");

    if (!supabase || !session?.access_token || !session.user.id) {
      return;
    }

    setDataLoading(true);
    setDataError("");
    setDataSuccess("");

    try {
      await supabaseRequest<unknown>(supabase, "/rest/v1/civic_agent_briefs", {
        body: {
          user_id: session.user.id,
          event_id: activeEvent.id,
          event_kind: activeEvent.eventKind,
          title: activeEvent.title,
          source_url: activeEvent.sourceUrl,
          brief: nextBrief,
        },
        method: "POST",
        token: session.access_token,
      });
      setDataSuccess("Brief saved");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to save brief");
    } finally {
      setDataLoading(false);
    }
  }

  async function saveAdvocacyDraft(approved: boolean) {
    if (!activeEvent || !brief || !advocacyDraft || !supabase || !session?.access_token || !session.user.id) {
      return;
    }

    setDataLoading(true);
    setDataError("");
    setDataSuccess("");

    try {
      await supabaseRequest<unknown>(supabase, "/rest/v1/civic_advocacy_drafts", {
        body: {
          user_id: session.user.id,
          event_id: activeEvent.id,
          event_kind: activeEvent.eventKind,
          draft_type: draftType,
          recipient: activeEvent.sourceName,
          body: advocacyDraft,
          status: approved ? "approved" : "draft",
          explicit_approval_at: approved ? new Date().toISOString() : null,
        },
        method: "POST",
        token: session.access_token,
      });
      setDataSuccess(approved ? "Draft approved and saved" : "Draft saved");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to save draft");
    } finally {
      setDataLoading(false);
    }
  }

  async function saveSignal() {
    if (!activeEvent || !supabase || !session?.access_token || !session.user.id) {
      return;
    }

    setDataLoading(true);
    setDataError("");
    setDataSuccess("");

    try {
      await Promise.all([
        supabaseRequest<unknown>(
          supabase,
          "/rest/v1/civic_user_feedback?on_conflict=user_id,event_id,event_kind",
          {
            body: {
              affectedness,
              desired_outcome: desiredOutcome.trim(),
              event_id: activeEvent.id,
              event_kind: activeEvent.eventKind,
              intensity: urgency,
              position,
              public_anonymous: true,
              reason: reason.trim(),
              region_label: activeEvent.regionLabel,
              topic_tags: activeTopicTags,
              user_id: session.user.id,
            },
            headers: {
              Prefer: "resolution=merge-duplicates",
            },
            method: "POST",
            token: session.access_token,
          },
        ),
        supabaseRequest<unknown>(
          supabase,
          "/rest/v1/civic_user_event_positions?on_conflict=user_id,event_id,event_kind",
          {
            body: {
              desired_outcome: desiredOutcome.trim(),
              event_id: activeEvent.id,
              event_kind: activeEvent.eventKind,
              position,
              public_anonymous: true,
              reason: reason.trim(),
              region_label: activeEvent.regionLabel,
              topic_tags: activeTopicTags,
              urgency,
              user_id: session.user.id,
            },
            headers: {
              Prefer: "resolution=merge-duplicates",
            },
            method: "POST",
            token: session.access_token,
          },
        ),
      ]);
      setDataSuccess("Anonymous civic feedback saved");
      await refreshEventSummary();
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to save signal");
    } finally {
      setDataLoading(false);
    }
  }

  async function refreshEventSummary() {
    if (!activeEvent || !supabase) {
      return;
    }

    try {
      const rows = await supabaseRequest<EventSignalSummary[]>(
        supabase,
        "/rest/v1/rpc/civic_event_feedback_summary",
        {
          body: {
            p_event_id: activeEvent.id,
            p_event_kind: activeEvent.eventKind,
            p_min_count: 5,
          },
          method: "POST",
          token: session?.access_token,
        },
      );

      setEventSummary(rows[0] ?? null);
    } catch {
      const rows = await supabaseRequest<EventSignalSummary[]>(
        supabase,
        "/rest/v1/rpc/civic_event_signal_summary",
        {
          body: {
            p_event_id: activeEvent.id,
            p_event_kind: activeEvent.eventKind,
            p_min_count: 5,
          },
          method: "POST",
          token: session?.access_token,
        },
      );

      setEventSummary(rows[0] ?? null);
    }
  }

  async function runCandidateQuery() {
    if (!supabase) {
      return;
    }

    setDataLoading(true);
    setDataError("");
    setDataSuccess("");

    try {
      let rows: CandidateTopicSummary[];
      try {
        rows = await supabaseRequest<CandidateTopicSummary[]>(
          supabase,
          "/rest/v1/rpc/civic_public_topic_summary",
          {
            body: {
              p_region: candidateForm.region_label.trim(),
              p_topic: candidateForm.topic_query.trim(),
              p_min_count: candidateForm.min_threshold,
            },
            method: "POST",
            token: session?.access_token,
          },
        );
      } catch {
        rows = await supabaseRequest<CandidateTopicSummary[]>(
          supabase,
          "/rest/v1/rpc/civic_candidate_topic_summary",
          {
            body: {
              p_region: candidateForm.region_label.trim(),
              p_topic: candidateForm.topic_query.trim(),
              p_min_count: candidateForm.min_threshold,
            },
            method: "POST",
            token: session?.access_token,
          },
        );
      }
      const summary = rows[0] ?? null;
      setCandidateSummary(summary);

      if (session?.access_token && session.user.id) {
        await supabaseRequest<unknown>(supabase, "/rest/v1/civic_candidate_queries", {
          body: {
            requester_user_id: session.user.id,
            requester_role: candidateForm.requester_role,
            region_label: candidateForm.region_label.trim(),
            topic_query: candidateForm.topic_query.trim(),
            question: candidateForm.question.trim() || "Aggregate civic signal request",
            min_threshold: candidateForm.min_threshold,
            response: summary,
            status: summary?.threshold_met ? "answered" : "threshold_not_met",
          },
          method: "POST",
          token: session.access_token,
        });
      }

      setDataSuccess(summary?.threshold_met ? "Aggregate ready" : "Privacy threshold not met");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Unable to run aggregate query");
    } finally {
      setDataLoading(false);
    }
  }

  const activeEventKey = activeEvent?.id ?? "";

  useEffect(() => {
    if (!activeEventKey) {
      return;
    }

    const resetTimer = window.setTimeout(() => {
      setBrief(null);
      setAdvocacyDraft("");
      setEventSummary(null);
      setAffectedness(3);
      setReason("");
      setDesiredOutcome("");
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [activeEventKey]);

  const onboardingStepIndex = Math.max(
    0,
    ONBOARDING_STEPS.findIndex((step) => step.id === onboardingStep),
  );
  const onboardingPreviewEvents =
    matchedEvents.length > 0 ? matchedEvents.slice(0, 3) : civicEvents.slice(0, 3);

  function renderFeedbackButtons(event: CivicEvent) {
    if (!isSignedIn) {
      return null;
    }

    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {RELEVANCE_FEEDBACK_OPTIONS.map((option) => {
          const savingKey = `${event.id}:${option.type}`;

          return (
            <button
              className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:border-teal-500 hover:text-teal-700 disabled:cursor-wait disabled:opacity-60"
              disabled={feedbackSaving === savingKey}
              key={option.type}
              onClick={() => void saveRelevanceFeedback(event, option.type)}
              type="button"
            >
              {feedbackSaving === savingKey ? "Saving" : option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <section className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
            My Civic Radar
          </p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-950">
            Resident-first alerts, civic briefs, and public signals
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill>{matchedEvents.length} alert matches</Pill>
          <Pill>{regions.length} regions</Pill>
          <Pill>{topics.length} topics</Pill>
          <Pill>{isSignedIn ? "Account active" : "Public mode"}</Pill>
          <a
            className="inline-flex items-center rounded-full bg-white px-2 py-1 text-[11px] font-medium text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50"
            href={methodologyHref}
            rel="noreferrer"
            target="_blank"
          >
            Methodology
          </a>
        </div>
      </div>

      {configResolved && !isConfigured ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Supabase public config is missing. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY, or define window.__SUPABASE_URL__ and
          window.__SUPABASE_ANON_KEY__ for the static site.
        </div>
      ) : null}

      {isConfigured && !isSignedIn ? (
        <form
          className="mt-4 grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 lg:grid-cols-[1fr_1fr_auto_auto]"
          onSubmit={handleAuthSubmit}
        >
          <div className="grid gap-1">
            <FieldLabel>Email</FieldLabel>
            <input
              autoComplete="email"
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
              onChange={(event) => setAuthEmail(event.target.value)}
              required
              type="email"
              value={authEmail}
            />
          </div>
          <div className="grid gap-1">
            <FieldLabel>Password</FieldLabel>
            <input
              autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
              minLength={6}
              onChange={(event) => setAuthPassword(event.target.value)}
              required
              type="password"
              value={authPassword}
            />
          </div>
          <div className="grid gap-1">
            <FieldLabel>Mode</FieldLabel>
            <select
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
              onChange={(event) => setAuthMode(event.target.value as "signin" | "signup")}
              value={authMode}
            >
              <option value="signin">Sign in</option>
              <option value="signup">Create account</option>
            </select>
          </div>
          <button
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60"
            disabled={authLoading}
            type="submit"
          >
            {authLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
            Continue
          </button>
          <div className="lg:col-span-4">{statusMessage(authError, authSuccess)}</div>
        </form>
      ) : null}

      {showOnboarding ? (
        <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50/60 p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <FieldLabel>Account setup</FieldLabel>
              <h3 className="mt-1 text-lg font-semibold text-zinc-950">
                Tune Civic Radar for your region and topics
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md border border-teal-200 bg-white px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
                onClick={() => setOnboardingDismissed(true)}
                type="button"
              >
                Skip for now
              </button>
              <button
                className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60"
                disabled={dataLoading}
                onClick={() => void completeOnboarding()}
                type="button"
              >
                Finish setup
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {ONBOARDING_STEPS.map((step, index) => (
              <button
                className={`rounded-md px-2 py-2 text-xs font-medium ${
                  onboardingStep === step.id
                    ? "bg-zinc-950 text-white"
                    : index < onboardingStepIndex
                      ? "bg-white text-teal-700 ring-1 ring-teal-200"
                      : "bg-white text-zinc-600 ring-1 ring-zinc-200"
                }`}
                key={step.id}
                onClick={() => setOnboardingStep(step.id)}
                type="button"
              >
                {step.label}
              </button>
            ))}
          </div>

          {onboardingStep === "welcome" ? (
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <div className="rounded-lg bg-white p-3 text-sm leading-6 text-zinc-700 ring-1 ring-teal-100">
                Watchlists, notification settings, and optional private context are saved to
                your account. Public radar browsing still works without this setup.
              </div>
              <div className="grid gap-2">
                <input
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      display_name: event.target.value,
                    }))
                  }
                  placeholder="Display name"
                  value={profileForm.display_name}
                />
                <select
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      notify_frequency: event.target.value as NotifyFrequency,
                    }))
                  }
                  value={profileForm.notify_frequency}
                >
                  <option value="immediate">Immediate alerts</option>
                  <option value="daily">Daily digest</option>
                  <option value="weekly">Weekly digest</option>
                  <option value="off">Off</option>
                </select>
              </div>
              <button
                className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white"
                onClick={() => setOnboardingStep("regions")}
                type="button"
              >
                Continue
              </button>
            </div>
          ) : null}

          {onboardingStep === "regions" ? (
            <div className="mt-3 grid gap-3">
              <div className="grid gap-2 md:grid-cols-[1fr_120px_auto_auto]">
                <input
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setRegionForm((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Home region or public body"
                  value={regionForm.label}
                />
                <input
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                  min={1}
                  onChange={(event) =>
                    setRegionForm((current) => ({
                      ...current,
                      radius_miles: Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={regionForm.radius_miles}
                />
                <button
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
                  onClick={() => void addRegion()}
                  type="button"
                >
                  Add region
                </button>
                {selectedSource ? (
                  <button
                    className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white"
                    onClick={() =>
                      void addRegion({
                        label: selectedSource.place,
                        source_id: selectedSource.id,
                        jurisdiction_kind: selectedSource.kind,
                        lat: selectedSource.lat,
                        lng: selectedSource.lng,
                      })
                    }
                    type="button"
                  >
                    Watch selected
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {regions.map((region) => (
                  <Pill key={region.id}>{region.label}</Pill>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white"
                  onClick={() => setOnboardingStep("topics")}
                  type="button"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {onboardingStep === "topics" ? (
            <div className="mt-3 grid gap-3">
              <div className="flex flex-wrap gap-2">
                {POLICY_DOMAINS.map((domain) => (
                  <button
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50"
                    key={domain.label}
                    onClick={() =>
                      void addTopic({
                        label: domain.label,
                        query: domain.terms.join(" "),
                        topic_type: "topic",
                      })
                    }
                    type="button"
                  >
                    {domain.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 md:grid-cols-[140px_1fr_1fr_auto]">
                <select
                  className="rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setTopicForm((current) => ({
                      ...current,
                      topic_type: event.target.value as TopicType,
                    }))
                  }
                  value={topicForm.topic_type}
                >
                  <option value="topic">Topic</option>
                  <option value="bill_keyword">Bill keyword</option>
                  <option value="agency">Agency</option>
                  <option value="committee">Committee</option>
                  <option value="local_body">Local body</option>
                </select>
                <input
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setTopicForm((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Label"
                  value={topicForm.label}
                />
                <input
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setTopicForm((current) => ({ ...current, query: event.target.value }))
                  }
                  placeholder="Match text"
                  value={topicForm.query}
                />
                <button
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
                  onClick={() => void addTopic()}
                  type="button"
                >
                  Add topic
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <Pill key={topic.id}>{topic.label}</Pill>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white"
                  onClick={() => {
                    void syncAlertMatches(true);
                    setOnboardingStep("alerts");
                  }}
                  type="button"
                >
                  Show matches
                </button>
              </div>
            </div>
          ) : null}

          {onboardingStep === "alerts" ? (
            <div className="mt-3 grid gap-2">
              {onboardingPreviewEvents.map((event) => (
                <article
                  className="rounded-lg border border-zinc-200 bg-white p-3"
                  key={`${event.eventKind}:${event.id}:onboarding`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        {event.eventKind} · {event.sourceName}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-5 text-zinc-950">
                        {event.title}
                      </p>
                    </div>
                    <BurdenPill burden={event.burden} />
                  </div>
                  {"relevanceReasons" in event &&
                  (event as MatchedEvent).relevanceReasons.length > 0 ? (
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      Why: {(event as MatchedEvent).relevanceReasons.join("; ")}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      Add a region and topic to create stronger personal matches.
                    </p>
                  )}
                  {renderFeedbackButtons(event)}
                </article>
              ))}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
                  onClick={() => void completeOnboarding()}
                  type="button"
                >
                  Finish without context
                </button>
                <button
                  className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white"
                  onClick={() => setOnboardingStep("context")}
                  type="button"
                >
                  Add context
                </button>
              </div>
            </div>
          ) : null}

          {onboardingStep === "context" ? (
            <div className="mt-3 grid gap-2">
              <div className="grid gap-2 md:grid-cols-2">
                <textarea
                  className="min-h-20 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setContextForm((current) => ({ ...current, goals: event.target.value }))
                  }
                  placeholder="Goals, one per line"
                  value={contextForm.goals}
                />
                <textarea
                  className="min-h-20 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setContextForm((current) => ({
                      ...current,
                      concerns: event.target.value,
                    }))
                  }
                  placeholder="Concerns, one per line"
                  value={contextForm.concerns}
                />
              </div>
              <textarea
                className="min-h-20 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                onChange={(event) =>
                  setContextForm((current) => ({
                    ...current,
                    life_context: event.target.value,
                  }))
                }
                placeholder="Optional private life context"
                value={contextForm.life_context}
              />
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
                  onClick={() => void completeOnboarding()}
                  type="button"
                >
                  Skip context
                </button>
                <button
                  className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white"
                  onClick={() => {
                    void (async () => {
                      const saved = await saveContext();
                      if (saved) {
                        await completeOnboarding();
                      }
                    })();
                  }}
                  type="button"
                >
                  Save and finish
                </button>
              </div>
            </div>
          ) : null}

          {statusMessage(dataError, dataSuccess)}
        </div>
      ) : null}

      {isSignedIn ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
          <div className="grid gap-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-950">
                    {profile?.display_name || session?.user.email || "Civic account"}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Private data is protected by Supabase RLS
                  </p>
                </div>
                <button
                  className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-teal-500 hover:text-teal-700"
                  onClick={handleSignOut}
                  type="button"
                >
                  Sign out
                </button>
              </div>

              <div className="mt-3 grid gap-2">
                <FieldLabel>Profile</FieldLabel>
                <input
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      display_name: event.target.value,
                    }))
                  }
                  placeholder="Name"
                  value={profileForm.display_name}
                />
                <input
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      home_region: event.target.value,
                    }))
                  }
                  placeholder="Home region"
                  value={profileForm.home_region}
                />
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        notification_email: event.target.value,
                      }))
                    }
                    placeholder="Notification email"
                    type="email"
                    value={profileForm.notification_email}
                  />
                  <select
                    className="rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm outline-none focus:border-teal-500"
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        notify_frequency: event.target.value as NotifyFrequency,
                      }))
                    }
                    value={profileForm.notify_frequency}
                  >
                    <option value="immediate">Immediate</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="off">Off</option>
                  </select>
                </div>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60"
                  disabled={dataLoading}
                  onClick={saveProfile}
                  type="button"
                >
                  {dataLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Save profile
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 p-3">
              <div className="flex items-center justify-between">
                <FieldLabel>Watchlist</FieldLabel>
                {selectedSource ? (
                  <button
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 hover:border-teal-500 hover:text-teal-700"
                    onClick={() =>
                      void addRegion({
                        label: selectedSource.place,
                        source_id: selectedSource.id,
                        jurisdiction_kind: selectedSource.kind,
                        lat: selectedSource.lat,
                        lng: selectedSource.lng,
                      })
                    }
                    type="button"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Watch selected
                  </button>
                ) : null}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_96px_auto]">
                <input
                  className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setRegionForm((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Region or jurisdiction"
                  value={regionForm.label}
                />
                <input
                  className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  min={1}
                  onChange={(event) =>
                    setRegionForm((current) => ({
                      ...current,
                      radius_miles: Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={regionForm.radius_miles}
                />
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
                  onClick={() => void addRegion()}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-[130px_1fr_1fr_auto]">
                <select
                  className="rounded-md border border-zinc-200 px-2 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setTopicForm((current) => ({
                      ...current,
                      topic_type: event.target.value as TopicType,
                    }))
                  }
                  value={topicForm.topic_type}
                >
                  <option value="topic">Topic</option>
                  <option value="bill_keyword">Bill keyword</option>
                  <option value="agency">Agency</option>
                  <option value="committee">Committee</option>
                  <option value="local_body">Local body</option>
                </select>
                <input
                  className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setTopicForm((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Label"
                  value={topicForm.label}
                />
                <input
                  className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setTopicForm((current) => ({ ...current, query: event.target.value }))
                  }
                  placeholder="Match text"
                  value={topicForm.query}
                />
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
                  onClick={() => void addTopic()}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {regions.map((region) => (
                  <button
                    className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-200"
                    key={region.id}
                    onClick={() => void deleteRow("civic_user_regions", region.id)}
                    title="Remove region"
                    type="button"
                  >
                    {region.label}
                    <Trash2 className="h-3 w-3" />
                  </button>
                ))}
                {topics.map((topic) => (
                  <button
                    className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-200"
                    key={topic.id}
                    onClick={() => void deleteRow("civic_user_topics", topic.id)}
                    title="Remove topic"
                    type="button"
                  >
                    {topic.label}
                    <Trash2 className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 p-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-teal-700" />
                <FieldLabel>Private civic context</FieldLabel>
              </div>
              <div className="mt-2 grid gap-2">
                <textarea
                  className="min-h-20 rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setContextForm((current) => ({ ...current, goals: event.target.value }))
                  }
                  placeholder="Goals, one per line"
                  value={contextForm.goals}
                />
                <textarea
                  className="min-h-20 rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setContextForm((current) => ({
                      ...current,
                      concerns: event.target.value,
                    }))
                  }
                  placeholder="Concerns, one per line"
                  value={contextForm.concerns}
                />
                <textarea
                  className="min-h-24 rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setContextForm((current) => ({
                      ...current,
                      life_context: event.target.value,
                    }))
                  }
                  placeholder="Life context Civic Radar should consider privately"
                  value={contextForm.life_context}
                />
                <textarea
                  className="min-h-20 rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setContextForm((current) => ({
                      ...current,
                      policy_priorities: event.target.value,
                    }))
                  }
                  placeholder="Priority: description"
                  value={contextForm.policy_priorities}
                />
                <label className="inline-flex items-start gap-2 text-sm text-zinc-700">
                  <input
                    checked={contextForm.agent_consent}
                    className="mt-1"
                    onChange={(event) =>
                      setContextForm((current) => ({
                        ...current,
                        agent_consent: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  Let Civic Radar use this private context to generate briefs and drafts.
                </label>
                <label className="inline-flex items-start gap-2 text-sm text-zinc-700">
                  <input
                    checked={contextForm.candidate_agent_consent}
                    className="mt-1"
                    onChange={(event) =>
                      setContextForm((current) => ({
                        ...current,
                        candidate_agent_consent: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  Include my anonymous feedback in thresholded public aggregates.
                </label>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60"
                  disabled={dataLoading}
                  onClick={() => void saveContext()}
                  type="button"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Save context
                </button>
              </div>
              {statusMessage(dataError, dataSuccess)}
            </div>
          </div>

          <div className="min-w-0">
            <div className="inline-flex flex-wrap rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
              {AGENT_VIEWS.map(({ id, label, Icon }) => (
                <button
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                    agentView === id
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                  key={id}
                  onClick={() => setAgentView(id)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {agentView === "alerts" ? (
              <div className="mt-3 rounded-lg border border-zinc-200 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <FieldLabel>Matched civic alerts</FieldLabel>
                    <h3 className="mt-1 text-lg font-semibold text-zinc-950">
                      {matchedEvents.length} current matches
                    </h3>
                  </div>
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
                    onClick={() => void syncAlertMatches()}
                    type="button"
                  >
                    <Bell className="h-4 w-4" />
                    Save in-app alerts
                  </button>
                </div>

                <div className="mt-3 grid max-h-[560px] gap-2 overflow-auto pr-1">
                  {(matchedEvents.length > 0 ? matchedEvents : civicEvents.slice(0, 8)).map(
                    (event) => (
                      <article
                        className={`rounded-lg border p-3 transition ${
                          activeEvent?.id === event.id
                            ? "border-teal-500 bg-teal-50"
                            : "border-zinc-200 bg-white hover:border-zinc-300"
                        }`}
                        key={`${event.eventKind}:${event.id}`}
                      >
                        <button
                          className="block w-full text-left"
                          onClick={() => {
                            setActiveEventId(event.id);
                            setAgentView("agent");
                          }}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                {event.eventKind} · {event.sourceName}
                              </p>
                              <p className="mt-1 text-sm font-semibold leading-5 text-zinc-950">
                                {event.title}
                              </p>
                              {event.summary ? (
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">
                                  {event.summary}
                                </p>
                              ) : null}
                            </div>
                            <span className="shrink-0 text-xs text-zinc-500">
                              {eventDateLabel(event.eventDate)}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <BurdenPill burden={event.burden} />
                            {"relevanceScore" in event ? (
                              <Pill>{(event as MatchedEvent).relevanceScore}/100 relevance</Pill>
                            ) : null}
                            {"confidence" in event ? (
                              <Pill>{(event as MatchedEvent).confidence} confidence</Pill>
                            ) : null}
                            {"matchedRegions" in event
                              ? (event as MatchedEvent).matchedRegions.map((label) => (
                                  <Pill key={label}>{label}</Pill>
                                ))
                              : null}
                            {"matchedTerms" in event
                              ? (event as MatchedEvent).matchedTerms.map((label) => (
                                  <Pill key={label}>{label}</Pill>
                                ))
                              : null}
                          </div>
                          {"relevanceReasons" in event &&
                          (event as MatchedEvent).relevanceReasons.length > 0 ? (
                            <p className="mt-2 text-xs leading-5 text-zinc-500">
                              Why: {(event as MatchedEvent).relevanceReasons.join("; ")}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs leading-5 text-zinc-500">
                            Burden: {event.burden.reasons.join("; ")}
                          </p>
                        </button>
                        {renderFeedbackButtons(event)}
                      </article>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            {agentView === "agent" ? (
              <div className="mt-3 grid gap-3">
                <div className="rounded-lg border border-zinc-200 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <FieldLabel>Evidence-bound civic brief</FieldLabel>
                      <h3 className="mt-1 text-lg font-semibold text-zinc-950">
                        {activeEvent?.title ?? "No active event"}
                      </h3>
                      {activeEvent ? (
                        <p className="mt-1 text-sm text-zinc-600">
                          {activeEvent.sourceName} · {eventDateLabel(activeEvent.eventDate)}
                        </p>
                      ) : null}
                    </div>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60"
                      disabled={!activeEvent || dataLoading}
                      onClick={() => void generateBrief()}
                      type="button"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate brief
                    </button>
                  </div>

                  {activeMatchedEvent ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {activeMatchedEvent.matchedRegions.map((label) => (
                        <Pill key={label}>{label}</Pill>
                      ))}
                      {activeMatchedEvent.matchedTerms.map((label) => (
                        <Pill key={label}>{label}</Pill>
                      ))}
                    </div>
                  ) : null}

                  {brief ? (
                    <div className="mt-3 grid gap-3">
                      <div className="flex flex-wrap gap-2">
                        <Pill>{brief.confidence} confidence</Pill>
                        {brief.relevanceScore !== null ? (
                          <Pill>{brief.relevanceScore}/100 relevance</Pill>
                        ) : null}
                        <Pill>{brief.burdenScore}/100 {brief.burdenLabel}</Pill>
                      </div>
                      <div className="rounded-lg bg-zinc-50 p-3">
                        <p className="text-sm font-semibold text-zinc-950">What happened</p>
                        <p className="mt-1 text-sm leading-6 text-zinc-700">
                          {brief.whatHappened}
                        </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-zinc-50 p-3">
                          <p className="text-sm font-semibold text-zinc-950">Why this matched</p>
                          <ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-700">
                            {brief.whySeeing.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-3">
                          <p className="text-sm font-semibold text-zinc-950">Personal read</p>
                          <p className="mt-1 text-sm leading-6 text-zinc-700">
                            {brief.personalRead}
                          </p>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-3">
                          <p className="text-sm font-semibold text-zinc-950">Resident burden</p>
                          <ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-700">
                            {brief.burdenReasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-3">
                          <p className="text-sm font-semibold text-zinc-950">Decision pending</p>
                          <p className="mt-1 text-sm leading-6 text-zinc-700">
                            {brief.decisionPending}
                          </p>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-3">
                          <p className="text-sm font-semibold text-zinc-950">Who can act</p>
                          <p className="mt-1 text-sm leading-6 text-zinc-700">
                            {brief.whoCanAct}
                          </p>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-3">
                          <p className="text-sm font-semibold text-zinc-950">Tradeoffs</p>
                          <ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-700">
                            {brief.tradeoffs.map((tradeoff) => (
                              <li key={tradeoff}>{tradeoff}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-3">
                          <p className="text-sm font-semibold text-zinc-950">Next steps</p>
                          <ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-700">
                            {brief.engagementSteps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="rounded-lg bg-zinc-50 p-3">
                        <p className="text-sm font-semibold text-zinc-950">Source proof</p>
                        <p className="mt-1 text-sm leading-6 text-zinc-700">
                          {brief.sourceProof}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-700">
                          {brief.suggestedPosition}
                        </p>
                      </div>
                      {brief.citations.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {brief.citations.map((citation) => (
                            <a
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
                              href={citation.url}
                              key={citation.url}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {citation.label}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
                      Select an alert and generate a brief to map the official source to your
                      saved goals and concerns.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-zinc-200 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <FieldLabel>Consent-gated advocacy draft</FieldLabel>
                    <select
                      className="rounded-md border border-zinc-200 px-2 py-2 text-sm outline-none focus:border-teal-500"
                      onChange={(event) =>
                        setDraftType(event.target.value as typeof draftType)
                      }
                      value={draftType}
                    >
                      <option value="comment">Comment</option>
                      <option value="email">Email</option>
                      <option value="testimony">Testimony</option>
                      <option value="call_script">Call script</option>
                    </select>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700 disabled:opacity-50"
                      disabled={!brief || !activeEvent}
                      onClick={() => {
                        if (brief && activeEvent) {
                          setAdvocacyDraft(
                            buildAdvocacyDraft(activeEvent, brief, context, draftType),
                          );
                        }
                      }}
                      type="button"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Draft
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700 disabled:opacity-50"
                      disabled={!advocacyDraft}
                      onClick={() => void saveAdvocacyDraft(false)}
                      type="button"
                    >
                      Save draft
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                      disabled={!advocacyDraft}
                      onClick={() => void saveAdvocacyDraft(true)}
                      type="button"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve only
                    </button>
                  </div>
                  <textarea
                    className="mt-3 min-h-56 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm leading-6 outline-none focus:border-teal-500"
                    onChange={(event) => setAdvocacyDraft(event.target.value)}
                    placeholder="Generated draft will appear here"
                    value={advocacyDraft}
                  />
                </div>
              </div>
            ) : null}

            {agentView === "signals" ? (
              <div className="mt-3 grid gap-3">
                <div className="rounded-lg border border-zinc-200 p-3">
                  <FieldLabel>Anonymous civic feedback</FieldLabel>
                  <h3 className="mt-1 text-lg font-semibold text-zinc-950">
                    {activeEvent?.title ?? "No active event"}
                  </h3>
                  <div className="mt-3 grid gap-2 md:grid-cols-[160px_1fr_1fr]">
                    <select
                      className="rounded-md border border-zinc-200 px-2 py-2 text-sm outline-none focus:border-teal-500"
                      onChange={(event) =>
                        setPosition(event.target.value as "support" | "oppose" | "unsure")
                      }
                      value={position}
                    >
                      <option value="support">Support</option>
                      <option value="oppose">Oppose</option>
                      <option value="unsure">Unsure</option>
                    </select>
                    <div className="grid gap-1">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>Priority intensity</span>
                        <span>{urgency}/5</span>
                      </div>
                      <input
                        max={5}
                        min={1}
                        onChange={(event) => setUrgency(Number(event.target.value))}
                        type="range"
                        value={urgency}
                      />
                    </div>
                    <div className="grid gap-1">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>Affectedness</span>
                        <span>{affectedness}/5</span>
                      </div>
                      <input
                        max={5}
                        min={1}
                        onChange={(event) => setAffectedness(Number(event.target.value))}
                        type="range"
                        value={affectedness}
                      />
                    </div>
                  </div>
                  <textarea
                    className="mt-2 min-h-20 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Reason"
                    value={reason}
                  />
                  <textarea
                    className="mt-2 min-h-20 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                    onChange={(event) => setDesiredOutcome(event.target.value)}
                    placeholder="Desired outcome"
                    value={desiredOutcome}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                      disabled={!activeEvent}
                      onClick={() => void saveSignal()}
                      type="button"
                    >
                      <Vote className="h-4 w-4" />
                      Save feedback
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700 disabled:opacity-50"
                      disabled={!activeEvent}
                      onClick={() => void refreshEventSummary().catch((error) => {
                        setDataError(error instanceof Error ? error.message : "Unable to refresh aggregate");
                      })}
                      type="button"
                    >
                      Refresh aggregate
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-200 p-3">
                  <FieldLabel>Privacy-threshold public pulse</FieldLabel>
                  {eventSummary ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-6">
                      <Pill>{eventSummary.threshold_met ? `${eventSummary.total_count} total` : "Threshold not met"}</Pill>
                      <Pill>{eventSummary.support_count} support</Pill>
                      <Pill>{eventSummary.oppose_count} oppose</Pill>
                      <Pill>{eventSummary.unsure_count} unsure</Pill>
                      <Pill>{eventSummary.average_urgency ?? "-"} avg urgency</Pill>
                      <Pill>{eventSummary.average_affectedness ?? "-"} avg affected</Pill>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">
                      Aggregates appear only when at least five anonymous signals exist.
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            {agentView === "public" ? (
              <div className="mt-3 rounded-lg border border-zinc-200 p-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-teal-700" />
                  <FieldLabel>Public pulse query</FieldLabel>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <select
                    className="rounded-md border border-zinc-200 px-2 py-2 text-sm outline-none focus:border-teal-500"
                    onChange={(event) =>
                      setCandidateForm((current) => ({
                        ...current,
                        requester_role: event.target.value,
                      }))
                    }
                    value={candidateForm.requester_role}
                  >
                    <option value="candidate">Candidate</option>
                    <option value="official">Official</option>
                    <option value="journalist">Journalist</option>
                    <option value="public">Public</option>
                  </select>
                  <input
                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                    onChange={(event) =>
                      setCandidateForm((current) => ({
                        ...current,
                        region_label: event.target.value,
                      }))
                    }
                    placeholder="Region"
                    value={candidateForm.region_label}
                  />
                  <input
                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                    onChange={(event) =>
                      setCandidateForm((current) => ({
                        ...current,
                        topic_query: event.target.value,
                      }))
                    }
                    placeholder="Topic"
                    value={candidateForm.topic_query}
                  />
                  <input
                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                    max={100}
                    min={3}
                    onChange={(event) =>
                      setCandidateForm((current) => ({
                        ...current,
                        min_threshold: Number(event.target.value),
                      }))
                    }
                    type="number"
                    value={candidateForm.min_threshold}
                  />
                </div>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                  onChange={(event) =>
                    setCandidateForm((current) => ({
                      ...current,
                      question: event.target.value,
                    }))
                  }
                  placeholder="Question for thresholded anonymous aggregate"
                  value={candidateForm.question}
                />
                <button
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60"
                  disabled={dataLoading}
                  onClick={() => void runCandidateQuery()}
                  type="button"
                >
                  <Users className="h-4 w-4" />
                  Run public pulse
                </button>

                {candidateSummary ? (
                  <div className="mt-3 rounded-lg bg-zinc-50 p-3">
                    <p className="text-sm font-semibold text-zinc-950">
                      {candidateSummary.threshold_met
                        ? "Thresholded aggregate"
                        : "Privacy threshold not met"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Pill>{candidateSummary.total_count} total</Pill>
                      <Pill>{candidateSummary.support_count} support</Pill>
                      <Pill>{candidateSummary.oppose_count} oppose</Pill>
                      <Pill>{candidateSummary.unsure_count} unsure</Pill>
                      <Pill>{candidateSummary.average_urgency ?? "-"} avg urgency</Pill>
                      <Pill>{candidateSummary.average_affectedness ?? "-"} avg affected</Pill>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
