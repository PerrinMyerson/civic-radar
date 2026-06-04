import { XMLParser } from "fast-xml-parser";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type RssItem = {
  title?: unknown;
  description?: unknown;
  link?: unknown;
  pubDate?: unknown;
  guid?: unknown;
};

type LegistarEvent = {
  EventId?: number;
  EventBodyName?: string;
  EventDate?: string;
  EventTime?: string;
  EventLocation?: string | null;
  EventAgendaStatusName?: string | null;
  EventMinutesStatusName?: string | null;
  EventAgendaFile?: string | null;
  EventMinutesFile?: string | null;
  EventMedia?: string | null;
  EventInSiteURL?: string | null;
  EventComment?: string | null;
};

const rssParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  cdataPropName: "__cdata",
  trimValues: true,
});

const FEDERAL_RSS_FEEDS = [
  {
    id: "house-floor",
    source: "House Floor Today",
    chamber: "House",
    url: "https://www.congress.gov/rss/house-floor-today.xml",
  },
  {
    id: "senate-floor",
    source: "Senate Floor Today",
    chamber: "Senate",
    url: "https://www.congress.gov/rss/senate-floor-today.xml",
  },
  {
    id: "presented-president",
    source: "Presented to President",
    chamber: "Congress",
    url: "https://www.congress.gov/rss/presented-to-president.xml",
  },
  {
    id: "most-viewed",
    source: "Most-Viewed Bills",
    chamber: "Congress",
    url: "https://www.congress.gov/rss/most-viewed-bills.xml",
  },
  {
    id: "govinfo-bills",
    source: "GovInfo New Bills",
    chamber: "GovInfo",
    url: "https://www.govinfo.gov/rss/bills.xml",
  },
] as const;

const MUNICIPAL_SOURCES = [
  {
    id: "seattle",
    name: "Seattle City Council",
    place: "Seattle, WA",
    slug: "seattle",
    kind: "City",
    lat: 47.6062,
    lng: -122.3321,
  },
  {
    id: "kingcounty",
    name: "King County Council",
    place: "King County, WA",
    slug: "kingcounty",
    kind: "County",
    lat: 47.6038,
    lng: -122.3301,
  },
  {
    id: "denver",
    name: "Denver City Council",
    place: "Denver, CO",
    slug: "denver",
    kind: "City",
    lat: 39.7392,
    lng: -104.9903,
  },
  {
    id: "phoenix",
    name: "Phoenix City Council",
    place: "Phoenix, AZ",
    slug: "phoenix",
    kind: "City",
    lat: 33.4484,
    lng: -112.074,
  },
  {
    id: "sanjose",
    name: "San Jose City Council",
    place: "San Jose, CA",
    slug: "sanjose",
    kind: "City",
    lat: 37.3382,
    lng: -121.8863,
  },
  {
    id: "oakland",
    name: "Oakland City Council",
    place: "Oakland, CA",
    slug: "oakland",
    kind: "City",
    lat: 37.8044,
    lng: -122.2712,
  },
  {
    id: "cupertino",
    name: "Cupertino City Council",
    place: "Cupertino, CA",
    slug: "cupertino",
    kind: "City",
    lat: 37.3229,
    lng: -122.0322,
  },
  {
    id: "boston",
    name: "Boston City Council",
    place: "Boston, MA",
    slug: "boston",
    kind: "City",
    lat: 42.3601,
    lng: -71.0589,
  },
  {
    id: "milwaukee",
    name: "Milwaukee Common Council",
    place: "Milwaukee, WI",
    slug: "milwaukee",
    kind: "City",
    lat: 43.0389,
    lng: -87.9065,
  },
  {
    id: "madison",
    name: "Madison Common Council",
    place: "Madison, WI",
    slug: "madison",
    kind: "City",
    lat: 43.0731,
    lng: -89.4012,
  },
] as const;

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object") {
    const maybeCdata = value as { __cdata?: unknown; "#text"?: unknown };
    return textValue(maybeCdata.__cdata ?? maybeCdata["#text"] ?? "");
  }

  return "";
}

function decodeEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}

function cleanSummary(value: string, maxLength = 260): string {
  const stripped = decodeEntities(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(li|p|div|tr)>/gi, ". ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (stripped.length <= maxLength) {
    return stripped;
  }

  return `${stripped.slice(0, maxLength - 1).trim()}...`;
}

function parseDate(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function fetchText(url: string, timeoutMs = 8500): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson<T>(url: string, timeoutMs = 8500): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function readRssFeed(feed: (typeof FEDERAL_RSS_FEEDS)[number]) {
  try {
    const xml = await fetchText(feed.url);
    const parsed = rssParser.parse(xml);
    const channel = parsed?.rss?.channel ?? parsed?.feed ?? {};
    const rawItems = Array.isArray(channel.item)
      ? channel.item
      : channel.item
        ? [channel.item]
        : [];

    const items = rawItems.slice(0, 8).map((item: RssItem, index: number) => {
      const title = cleanSummary(textValue(item.title), 140);
      const summary = cleanSummary(textValue(item.description), 280);
      const link = textValue(item.link);
      const published = textValue(item.pubDate);
      const guid = textValue(item.guid);

      return {
        id: guid || link || `${feed.id}-${index}`,
        title,
        summary,
        url: link || feed.url,
        published,
        source: feed.source,
        chamber: feed.chamber,
      };
    });

    return {
      id: feed.id,
      source: feed.source,
      chamber: feed.chamber,
      sourceUrl: feed.url,
      updated: textValue(channel.pubDate ?? channel.lastBuildDate ?? ""),
      description: cleanSummary(textValue(channel.description), 220),
      items,
      status: "live",
    };
  } catch (error) {
    return {
      id: feed.id,
      source: feed.source,
      chamber: feed.chamber,
      sourceUrl: feed.url,
      updated: "",
      description: "",
      items: [],
      status: "error",
      error: error instanceof Error ? error.message : "Unable to load feed",
    };
  }
}

async function readFederalRegister() {
  const url =
    "https://www.federalregister.gov/api/v1/documents?per_page=8&order=newest";

  try {
    const payload = await fetchJson<{
      results?: Array<{
        title?: string;
        type?: string;
        publication_date?: string;
        html_url?: string;
        agencies?: Array<{ name?: string; raw_name?: string }>;
      }>;
    }>(url);

    return {
      id: "federal-register",
      source: "Federal Register",
      chamber: "Agencies",
      sourceUrl: "https://www.federalregister.gov/documents/search?order=newest",
      updated: "",
      description: "Newest rules, notices, and presidential documents.",
      items: (payload.results ?? []).map((item, index) => ({
        id: item.html_url ?? `federal-register-${index}`,
        title: cleanSummary(item.title ?? "Untitled document", 150),
        summary: cleanSummary(
          [item.type, item.agencies?.[0]?.name ?? item.agencies?.[0]?.raw_name]
            .filter(Boolean)
            .join(" from "),
          220,
        ),
        url: item.html_url ?? "https://www.federalregister.gov/",
        published: item.publication_date ?? "",
        source: "Federal Register",
        chamber: "Agencies",
      })),
      status: "live",
    };
  } catch (error) {
    return {
      id: "federal-register",
      source: "Federal Register",
      chamber: "Agencies",
      sourceUrl: "https://www.federalregister.gov/documents/search?order=newest",
      updated: "",
      description: "",
      items: [],
      status: "error",
      error: error instanceof Error ? error.message : "Unable to load feed",
    };
  }
}

function eventStatus(event: LegistarEvent): string {
  const labels = [
    event.EventAgendaStatusName,
    event.EventMinutesStatusName,
    event.EventComment,
  ]
    .filter(Boolean)
    .join(" ");

  if (/cancel/i.test(labels)) {
    return "Cancelled";
  }

  if (/final/i.test(labels)) {
    return "Final";
  }

  if (/draft/i.test(labels)) {
    return "Draft";
  }

  return event.EventAgendaStatusName ?? "Scheduled";
}

function normalizeMeeting(event: LegistarEvent, sourceSlug: string, now: Date) {
  const timestamp = parseDate(event.EventDate);
  const date = timestamp ? new Date(timestamp) : null;
  const dayDiff =
    date === null
      ? null
      : Math.round(
          (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) /
            86400000,
        );

  return {
    id: `${sourceSlug}-${event.EventId ?? crypto.randomUUID()}`,
    title: event.EventBodyName ?? "Government meeting",
    date: date ? isoDay(date) : "",
    time: event.EventTime ?? "",
    location: event.EventLocation?.replace(/\s+/g, " ").trim() ?? "",
    status: eventStatus(event),
    agendaUrl: event.EventAgendaFile ?? "",
    minutesUrl: event.EventMinutesFile ?? "",
    videoUrl: event.EventMedia ?? "",
    sourceUrl: event.EventInSiteURL ?? "",
    note: cleanSummary(event.EventComment ?? "", 160),
    dayDiff,
  };
}

async function readMunicipalSource(
  source: (typeof MUNICIPAL_SOURCES)[number],
  now: Date,
) {
  const url = new URL(`https://webapi.legistar.com/v1/${source.slug}/events`);
  url.searchParams.set("$top", "120");
  url.searchParams.set("$orderby", "EventDate desc");

  try {
    const events = await fetchJson<LegistarEvent[]>(url.toString());
    const meetings = events
      .map((event) => normalizeMeeting(event, source.slug, now))
      .filter((meeting) => meeting.date)
      .sort((a, b) => {
        const aTime = Date.parse(`${a.date}T00:00:00Z`);
        const bTime = Date.parse(`${b.date}T00:00:00Z`);
        return aTime - bTime;
      });

    const currentWindow = meetings.filter(
      (meeting) =>
        meeting.dayDiff !== null && meeting.dayDiff >= -45 && meeting.dayDiff <= 120,
    );
    const upcoming = currentWindow.filter(
      (meeting) => meeting.dayDiff !== null && meeting.dayDiff >= 0,
    );
    const recent = currentWindow
      .filter((meeting) => meeting.dayDiff !== null && meeting.dayDiff < 0)
      .sort((a, b) => (b.dayDiff ?? 0) - (a.dayDiff ?? 0));
    const selectedMeetings = [...upcoming, ...recent].slice(0, 9);
    const latest = meetings.at(-1);
    const latestAge = latest?.dayDiff ?? null;

    return {
      ...source,
      sourceUrl: `https://${source.slug}.legistar.com/Calendar.aspx`,
      status:
        selectedMeetings.length > 0
          ? "live"
          : latestAge !== null && latestAge < -120
            ? "stale"
            : "quiet",
      latestDate: latest?.date ?? "",
      eventCount: selectedMeetings.length,
      totalFetched: meetings.length,
      events: selectedMeetings,
    };
  } catch (error) {
    return {
      ...source,
      sourceUrl: `https://${source.slug}.legistar.com/Calendar.aspx`,
      status: "error",
      latestDate: "",
      eventCount: 0,
      totalFetched: 0,
      events: [],
      error: error instanceof Error ? error.message : "Unable to load meetings",
    };
  }
}

export async function GET() {
  const now = new Date();
  const [rssFeeds, federalRegister, municipalSources] = await Promise.all([
    Promise.all(FEDERAL_RSS_FEEDS.map((feed) => readRssFeed(feed))),
    readFederalRegister(),
    Promise.all(MUNICIPAL_SOURCES.map((source) => readMunicipalSource(source, now))),
  ]);

  const federalFeeds = [...rssFeeds, federalRegister];
  const federalItems = federalFeeds.flatMap((feed) => feed.items);
  const municipalMeetings = municipalSources.flatMap((source) =>
    source.events.map((event) => ({
      ...event,
      sourceId: source.id,
      sourceName: source.name,
      place: source.place,
      lat: source.lat,
      lng: source.lng,
    })),
  );

  return Response.json({
    generatedAt: now.toISOString(),
    sourceNotes: [
      "Federal data comes from Congress.gov RSS, GovInfo RSS, and the Federal Register API.",
      "Local meeting data comes from public Legistar calendars for the mapped jurisdictions.",
      "Coverage is source-based, not exhaustive. Use the source links for official records.",
    ],
    stats: {
      federalItems: federalItems.length,
      federalFeedsLive: federalFeeds.filter((feed) => feed.status === "live").length,
      municipalSources: municipalSources.length,
      municipalSourcesLive: municipalSources.filter((source) => source.status === "live")
        .length,
      municipalMeetings: municipalMeetings.length,
      nextLocalMeeting:
        municipalMeetings
          .filter((meeting) => meeting.dayDiff !== null && meeting.dayDiff >= 0)
          .sort((a, b) => (a.dayDiff ?? 0) - (b.dayDiff ?? 0))[0]?.date ?? "",
    },
    federalFeeds,
    municipalSources,
    municipalMeetings,
  });
}
