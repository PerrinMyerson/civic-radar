export type CivicBurdenLabel = "Low burden" | "Moderate burden" | "High burden";

export type CivicBurdenInput = {
  actionability?: "high" | "medium" | "low" | "unknown";
  eventDate?: string;
  eventKind?: "federal" | "local";
  event_date?: string;
  event_kind?: "federal" | "local";
  searchText?: string;
  search_text?: string;
  sourceConfidence?: "high" | "partial" | "insufficient";
  sourceName?: string;
  sourceUrl?: string;
  source_confidence?: "high" | "partial" | "insufficient";
  source_name?: string;
  source_url?: string;
  summary?: string;
  title: string;
};

export type CivicBurdenResult = {
  actionAmbiguity: number;
  actorAmbiguity: number;
  decisionAmbiguity: number;
  label: CivicBurdenLabel;
  reasons: string[];
  score: number;
  sourceFriction: number;
  timeAmbiguity: number;
};

function normalizeSearch(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasDecisionSignal(text: string) {
  return /\b(agenda|comment|deadline|hearing|markup|meeting|notice|public hearing|rule|vote)\b/.test(
    text,
  );
}

function hasActionSignal(text: string) {
  return /\b(agenda|apply|call|comment|contact|deadline|hearing|meeting|register|submit|testify|vote)\b/.test(
    text,
  );
}

function burdenLabel(score: number): CivicBurdenLabel {
  if (score <= 34) {
    return "Low burden";
  }

  if (score <= 66) {
    return "Moderate burden";
  }

  return "High burden";
}

export function civicBurdenForEvent(event: CivicBurdenInput): CivicBurdenResult {
  const sourceUrl = event.sourceUrl ?? event.source_url ?? "";
  const sourceName = event.sourceName ?? event.source_name ?? "";
  const sourceConfidence = event.sourceConfidence ?? event.source_confidence ?? "partial";
  const eventDate = event.eventDate ?? event.event_date ?? "";
  const eventKind = event.eventKind ?? event.event_kind ?? "federal";
  const searchText = normalizeSearch(
    event.searchText ??
      event.search_text ??
      [event.title, event.summary ?? "", sourceName, eventKind].join(" "),
  );
  const reasons: string[] = [];

  let sourceFriction = 4;
  if (!sourceUrl || sourceConfidence === "insufficient") {
    sourceFriction = 20;
    reasons.push("source proof is missing or insufficient");
  } else if (sourceConfidence === "partial") {
    sourceFriction = 11;
    reasons.push("source proof is partial");
  }

  let decisionAmbiguity = 8;
  const actionability = event.actionability ?? (hasDecisionSignal(searchText) ? "high" : "low");
  if (actionability === "high") {
    decisionAmbiguity = 3;
  } else if (actionability === "medium") {
    decisionAmbiguity = 10;
    reasons.push("decision point is only partly clear");
  } else {
    decisionAmbiguity = 18;
    reasons.push("decision point is hard to identify");
  }

  const normalizedSourceName = normalizeSearch(sourceName);
  let actorAmbiguity = 5;
  if (!sourceName) {
    actorAmbiguity = 20;
    reasons.push("responsible public body is not named");
  } else if (/^(federal source|local source|local meeting)$/.test(normalizedSourceName)) {
    actorAmbiguity = 13;
    reasons.push("responsible public body is generic");
  }

  let timeAmbiguity = 5;
  const timestamp = Date.parse(eventDate);
  if (!eventDate) {
    timeAmbiguity = 20;
    reasons.push("date or deadline is missing");
  } else if (Number.isNaN(timestamp)) {
    timeAmbiguity = 15;
    reasons.push("date or deadline is hard to parse");
  } else {
    const ageDays = Math.abs(Date.now() - timestamp) / 86400000;
    if (ageDays > 90) {
      timeAmbiguity = 12;
      reasons.push("item may not be time-sensitive anymore");
    }
  }

  let actionAmbiguity = 7;
  if (hasActionSignal(searchText)) {
    actionAmbiguity = 4;
  } else if (sourceUrl) {
    actionAmbiguity = 11;
    reasons.push("resident action path is not explicit");
  } else {
    actionAmbiguity = 20;
    reasons.push("resident action path is unclear");
  }

  const score = Math.max(
    0,
    Math.min(
      100,
      sourceFriction + decisionAmbiguity + actorAmbiguity + timeAmbiguity + actionAmbiguity,
    ),
  );

  return {
    actionAmbiguity,
    actorAmbiguity,
    decisionAmbiguity,
    label: burdenLabel(score),
    reasons: reasons.length ? reasons : ["source, decision, actor, timing, and action path are clear"],
    score,
    sourceFriction,
    timeAmbiguity,
  };
}
