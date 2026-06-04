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

type FederalFeedItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  published: string;
  source: string;
  chamber: string;
};

type FederalFeedResult = {
  id: string;
  source: string;
  chamber: string;
  sourceUrl: string;
  updated: string;
  description: string;
  items: FederalFeedItem[];
  status: "live" | "error";
  error?: string;
};

type CongressGovBill = {
  congress?: number;
  latestAction?: {
    actionDate?: string;
    text?: string;
  };
  number?: string;
  originChamber?: string;
  title?: string;
  type?: string;
  updateDate?: string;
  url?: string;
};

type CongressGovCommitteeMeeting = {
  chamber?: string;
  congress?: number;
  date?: string;
  eventId?: number | string;
  meetingStatus?: string;
  title?: string;
  type?: string;
  updateDate?: string;
  url?: string;
};

type CongressGovAction = {
  actionDate?: string;
  text?: string;
  type?: string;
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

const CONGRESS_GOV_API_ROOT = "https://api.congress.gov/v3";
const CONGRESS_GOV_SEARCH_URL = "https://www.congress.gov/search";
const DEFAULT_MUNICIPAL_SOURCE_IDS = new Set([
  "seattle",
  "kingcounty",
  "chicago",
  "denver",
  "phoenix",
  "sanjose",
  "miamidade",
  "boston",
  "milwaukee",
  "madison",
  "nashville",
  "baltimore",
]);

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
  {
    id: "chicago",
    name: "Chicago City Council",
    place: "Chicago, IL",
    slug: "chicago",
    kind: "City",
    lat: 41.8781,
    lng: -87.6298,
  },
  {
    id: "longbeach",
    name: "Long Beach City Council",
    place: "Long Beach, CA",
    slug: "longbeach",
    kind: "City",
    lat: 33.7701,
    lng: -118.1937,
  },
  {
    id: "sacramento",
    name: "Sacramento City Council",
    place: "Sacramento, CA",
    slug: "sacramento",
    kind: "City",
    lat: 38.5816,
    lng: -121.4944,
  },
  {
    id: "fresno",
    name: "Fresno City Council",
    place: "Fresno, CA",
    slug: "fresno",
    kind: "City",
    lat: 36.7378,
    lng: -119.7871,
  },
  {
    id: "santaclara",
    name: "Santa Clara City Council",
    place: "Santa Clara, CA",
    slug: "santaclara",
    kind: "City",
    lat: 37.3541,
    lng: -121.9552,
  },
  {
    id: "sanmateocounty",
    name: "San Mateo County Board",
    place: "San Mateo County, CA",
    slug: "sanmateocounty",
    kind: "County",
    lat: 37.4337,
    lng: -122.4014,
  },
  {
    id: "sanantonio",
    name: "San Antonio City Council",
    place: "San Antonio, TX",
    slug: "sanantonio",
    kind: "City",
    lat: 29.4252,
    lng: -98.4946,
  },
  {
    id: "miamidade",
    name: "Miami-Dade County Commission",
    place: "Miami-Dade County, FL",
    slug: "miamidade",
    kind: "County",
    lat: 25.7617,
    lng: -80.1918,
  },
  {
    id: "nashville",
    name: "Metro Nashville Council",
    place: "Nashville, TN",
    slug: "nashville",
    kind: "Metro",
    lat: 36.1627,
    lng: -86.7816,
  },
  {
    id: "louisville",
    name: "Louisville Metro Council",
    place: "Louisville, KY",
    slug: "louisville",
    kind: "Metro",
    lat: 38.2527,
    lng: -85.7585,
  },
  {
    id: "columbus",
    name: "Columbus City Council",
    place: "Columbus, OH",
    slug: "columbus",
    kind: "City",
    lat: 39.9612,
    lng: -82.9988,
  },
  {
    id: "pittsburgh",
    name: "Pittsburgh City Council",
    place: "Pittsburgh, PA",
    slug: "pittsburgh",
    kind: "City",
    lat: 40.4406,
    lng: -79.9959,
  },
  {
    id: "baltimore",
    name: "Baltimore City Council",
    place: "Baltimore, MD",
    slug: "baltimore",
    kind: "City",
    lat: 39.2904,
    lng: -76.6122,
  },
  {
    id: "stpaul",
    name: "Saint Paul City Council",
    place: "Saint Paul, MN",
    slug: "stpaul",
    kind: "City",
    lat: 44.9537,
    lng: -93.09,
  },
  {
    id: "bellevue",
    name: "Bellevue City Council",
    place: "Bellevue, WA",
    slug: "bellevue",
    kind: "City",
    lat: 47.6101,
    lng: -122.2015,
  },
  {
    id: "redmond",
    name: "Redmond City Council",
    place: "Redmond, WA",
    slug: "redmond",
    kind: "City",
    lat: 47.674,
    lng: -122.1215,
  },
  {
    id: "detroit",
    name: "Detroit City Council",
    place: "Detroit, MI",
    slug: "detroit",
    kind: "City",
    lat: 42.3314,
    lng: -83.0458,
  },
  {
    id: "dane",
    name: "Dane County Board",
    place: "Dane County, WI",
    slug: "dane",
    kind: "County",
    lat: 43.0186,
    lng: -89.5498,
  },
  {
    id: "dupage",
    name: "DuPage County Board",
    place: "DuPage County, IL",
    slug: "dupage",
    kind: "County",
    lat: 41.8244,
    lng: -88.0901,
  },
  {
    id: "naperville",
    name: "Naperville City Council",
    place: "Naperville, IL",
    slug: "naperville",
    kind: "City",
    lat: 41.7508,
    lng: -88.1535,
  },
  {
    id: "coloradosprings",
    name: "Colorado Springs City Council",
    place: "Colorado Springs, CO",
    slug: "coloradosprings",
    kind: "City",
    lat: 38.8339,
    lng: -104.8214,
  },
  {
    id: "mesa",
    name: "Mesa City Council",
    place: "Mesa, AZ",
    slug: "mesa",
    kind: "City",
    lat: 33.4152,
    lng: -111.8315,
  },
  {
    id: "pima",
    name: "Pima County Board",
    place: "Pima County, AZ",
    slug: "pima",
    kind: "County",
    lat: 32.0575,
    lng: -111.6661,
  },
  {
    id: "plano",
    name: "Plano City Council",
    place: "Plano, TX",
    slug: "plano",
    kind: "City",
    lat: 33.0198,
    lng: -96.6989,
  },
  {
    id: "greensboro",
    name: "Greensboro City Council",
    place: "Greensboro, NC",
    slug: "greensboro",
    kind: "City",
    lat: 36.0726,
    lng: -79.792,
  },
  {
    id: "wake",
    name: "Wake County Board",
    place: "Wake County, NC",
    slug: "wake",
    kind: "County",
    lat: 35.8032,
    lng: -78.5661,
  },
  {
    id: "mecklenburg",
    name: "Mecklenburg County Commission",
    place: "Mecklenburg County, NC",
    slug: "mecklenburg",
    kind: "County",
    lat: 35.2633,
    lng: -80.8544,
  },
  {
    id: "richmondva",
    name: "Richmond City Council",
    place: "Richmond, VA",
    slug: "richmondva",
    kind: "City",
    lat: 37.5407,
    lng: -77.436,
  },
  {
    id: "huntingtonbeach",
    name: "Huntington Beach City Council",
    place: "Huntington Beach, CA",
    slug: "huntingtonbeach",
    kind: "City",
    lat: 33.6595,
    lng: -117.9988,
  },
  {
    id: "monterey",
    name: "Monterey City Council",
    place: "Monterey, CA",
    slug: "monterey",
    kind: "City",
    lat: 36.6002,
    lng: -121.8947,
  },
  {
    id: "mountainview",
    name: "Mountain View City Council",
    place: "Mountain View, CA",
    slug: "mountainview",
    kind: "City",
    lat: 37.3861,
    lng: -122.0839,
  },
  {
    id: "hayward",
    name: "Hayward City Council",
    place: "Hayward, CA",
    slug: "hayward",
    kind: "City",
    lat: 37.6688,
    lng: -122.0808,
  },
  {
    id: "napa",
    name: "Napa City Council",
    place: "Napa, CA",
    slug: "napa",
    kind: "City",
    lat: 38.2975,
    lng: -122.2869,
  },
  {
    id: "stockton",
    name: "Stockton City Council",
    place: "Stockton, CA",
    slug: "stockton",
    kind: "City",
    lat: 37.9577,
    lng: -121.2908,
  },
  {
    id: "visalia",
    name: "Visalia City Council",
    place: "Visalia, CA",
    slug: "visalia",
    kind: "City",
    lat: 36.3302,
    lng: -119.2921,
  },
  {
    id: "kansascity",
    name: "Kansas City Council",
    place: "Kansas City, MO",
    slug: "kansascity",
    kind: "City",
    lat: 39.0997,
    lng: -94.5786,
  },
] as const;

type CacheEntry = {
  expiresAt: number;
  payload: unknown;
};

const memoryCache = new Map<string, CacheEntry>();

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    "";

  if (!url || !key || process.env.SUPABASE_CACHE_ENABLED === "false") {
    return null;
  }

  return { key, url };
}

function cacheTtlMs(url: string) {
  if (url.includes("webapi.legistar.com")) {
    return 30 * 60 * 1000;
  }

  if (url.includes("api.congress.gov")) {
    return 15 * 60 * 1000;
  }

  if (url.includes("federalregister.gov")) {
    return 15 * 60 * 1000;
  }

  return 10 * 60 * 1000;
}

async function getSupabaseCache(cacheKey: string) {
  const config = supabaseConfig();

  if (!config) {
    return undefined;
  }

  try {
    const url = new URL(`${config.url}/rest/v1/civic_external_cache`);
    url.searchParams.set("cache_key", `eq.${cacheKey}`);
    url.searchParams.set("select", "payload,expires_at");
    url.searchParams.set("limit", "1");

    const response = await fetch(url, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const rows = (await response.json()) as Array<{
      expires_at?: string;
      payload?: unknown;
    }>;
    const row = rows[0];

    if (!row?.expires_at || Date.parse(row.expires_at) <= Date.now()) {
      return undefined;
    }

    return row.payload;
  } catch {
    return undefined;
  }
}

async function setSupabaseCache(cacheKey: string, payload: unknown, ttlMs: number) {
  const config = supabaseConfig();

  if (!config) {
    return;
  }

  try {
    await fetch(`${config.url}/rest/v1/civic_external_cache?on_conflict=cache_key`, {
      body: JSON.stringify({
        cache_key: cacheKey,
        expires_at: new Date(Date.now() + ttlMs).toISOString(),
        payload,
        updated_at: new Date().toISOString(),
      }),
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      method: "POST",
    });
  } catch {
    // Cache writes are best-effort; source fetches should still succeed.
  }
}

async function getCachedValue<T>(cacheKey: string): Promise<T | undefined> {
  const memoryEntry = memoryCache.get(cacheKey);

  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    return memoryEntry.payload as T;
  }

  memoryCache.delete(cacheKey);

  const supabaseValue = await getSupabaseCache(cacheKey);

  if (supabaseValue !== undefined) {
    return supabaseValue as T;
  }

  return undefined;
}

async function setCachedValue(cacheKey: string, payload: unknown, ttlMs: number) {
  memoryCache.set(cacheKey, {
    expiresAt: Date.now() + ttlMs,
    payload,
  });

  await setSupabaseCache(cacheKey, payload, ttlMs);
}

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

function numberParam(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distanceMiles(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const toRadians = (input: number) => (input * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

function sourceMatches(
  source: (typeof MUNICIPAL_SOURCES)[number],
  normalizedQuery: string,
) {
  return `${source.name} ${source.place} ${source.kind} ${source.slug}`
    .toLowerCase()
    .includes(normalizedQuery);
}

function selectMunicipalSources(request: Request) {
  const url = new URL(request.url);
  const lat = numberParam(url.searchParams.get("lat"));
  const lng = numberParam(url.searchParams.get("lng"));
  const query = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const loadAll = url.searchParams.get("all") === "1";
  const limit = clamp(numberParam(url.searchParams.get("limit")) ?? 12, 4, 60);
  const hasPosition = lat !== null && lng !== null;
  const userPosition = hasPosition ? { lat, lng } : null;

  const queryMatches =
    query.length >= 2
      ? MUNICIPAL_SOURCES.filter((source) => sourceMatches(source, query))
      : [];

  const pool =
    loadAll || queryMatches.length > 0 || hasPosition
      ? MUNICIPAL_SOURCES
      : MUNICIPAL_SOURCES.filter((source) => DEFAULT_MUNICIPAL_SOURCE_IDS.has(source.id));

  const ranked = (queryMatches.length > 0 ? queryMatches : pool)
    .map((source) => ({
      source,
      distance: userPosition
        ? distanceMiles(userPosition, { lat: source.lat, lng: source.lng })
        : null,
    }))
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }

      return a.source.name.localeCompare(b.source.name);
    });

  return {
    query,
    hasPosition,
    loadAll,
    selectedSources: ranked.slice(0, limit).map(({ source }) => source),
  };
}

async function fetchText(url: string, timeoutMs = 8500): Promise<string> {
  const cacheKey = `text:${url}`;
  const cached = await getCachedValue<string>(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

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

    const text = await response.text();
    await setCachedValue(cacheKey, text, cacheTtlMs(url));
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson<T>(url: string, timeoutMs = 8500): Promise<T> {
  const cacheKey = `json:${url}`;
  const cached = await getCachedValue<T>(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

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

    const json = (await response.json()) as T;
    await setCachedValue(cacheKey, json, cacheTtlMs(url));
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

function currentCongress(date: Date) {
  return Math.floor((date.getUTCFullYear() - 1789) / 2) + 1;
}

function congressGovApiKey() {
  return process.env.CONGRESS_GOV_API_KEY?.trim() ?? "";
}

function congressGovUrl(path: string, apiKey: string, params: Record<string, string> = {}) {
  const url = new URL(`${CONGRESS_GOV_API_ROOT}${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

function congressSearchUrl(query: string) {
  const url = new URL(CONGRESS_GOV_SEARCH_URL);
  url.searchParams.set("q", query);
  return url.toString();
}

function billTypeSlug(type: string) {
  const normalized = type.toLowerCase();

  return (
    {
      hconres: "house-concurrent-resolution",
      hjres: "house-joint-resolution",
      hr: "house-bill",
      hres: "house-resolution",
      s: "senate-bill",
      sconres: "senate-concurrent-resolution",
      sjres: "senate-joint-resolution",
      sres: "senate-resolution",
    }[normalized] ?? normalized
  );
}

function billPublicUrl(bill: CongressGovBill) {
  if (bill.congress && bill.type && bill.number) {
    return `https://www.congress.gov/bill/${bill.congress}th-congress/${billTypeSlug(
      bill.type,
    )}/${bill.number}`;
  }

  return bill.url ?? congressSearchUrl(bill.title ?? "latest bills");
}

function committeeMeetingUrl(meeting: CongressGovCommitteeMeeting) {
  if (meeting.congress && meeting.chamber && meeting.eventId) {
    return congressSearchUrl(
      `${meeting.congress} ${meeting.chamber} committee meeting ${meeting.eventId}`,
    );
  }

  return meeting.url ?? congressSearchUrl(meeting.title ?? "committee meeting");
}

async function readRssFeed(
  feed: (typeof FEDERAL_RSS_FEEDS)[number],
): Promise<FederalFeedResult> {
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

async function readFederalRegister(): Promise<FederalFeedResult> {
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

async function readCongressGovBills(
  apiKey: string,
  congress: number,
): Promise<FederalFeedResult> {
  const sourceUrl = "https://www.congress.gov/search?search-source=current-congress";

  try {
    const payload = await fetchJson<{ bills?: CongressGovBill[] }>(
      congressGovUrl(`/bill/${congress}`, apiKey, { limit: "10" }),
    );

    return {
      id: "congress-gov-latest-bills",
      source: "Congress.gov Latest Bills",
      chamber: "Congress",
      sourceUrl,
      updated: "",
      description: "Latest bill records and chamber activity from the Congress.gov API.",
      items: (payload.bills ?? []).map((bill, index) => ({
        id: bill.url ?? `${bill.type ?? "bill"}-${bill.number ?? index}`,
        title: cleanSummary(
          [bill.type, bill.number, bill.title].filter(Boolean).join(" "),
          160,
        ),
        summary: cleanSummary(bill.latestAction?.text ?? "No latest action text", 260),
        url: billPublicUrl(bill),
        published: bill.latestAction?.actionDate ?? bill.updateDate ?? "",
        source: "Congress.gov",
        chamber: bill.originChamber ?? "Congress",
      })),
      status: "live",
    };
  } catch (error) {
    return {
      id: "congress-gov-latest-bills",
      source: "Congress.gov Latest Bills",
      chamber: "Congress",
      sourceUrl,
      updated: "",
      description: "",
      items: [],
      status: "error",
      error: error instanceof Error ? error.message : "Unable to load Congress.gov bills",
    };
  }
}

async function readCongressGovBillActions(
  apiKey: string,
  congress: number,
): Promise<FederalFeedResult> {
  const sourceUrl = "https://www.congress.gov/search?search-source=current-congress";

  try {
    const payload = await fetchJson<{ bills?: CongressGovBill[] }>(
      congressGovUrl(`/bill/${congress}`, apiKey, { limit: "20" }),
    );

    const actionGroups = await Promise.all(
      (payload.bills ?? [])
        .filter((bill) => bill.type && bill.number)
        .slice(0, 6)
        .map(async (bill) => {
          try {
            const actionsPayload = await fetchJson<{ actions?: CongressGovAction[] }>(
              congressGovUrl(
                `/bill/${congress}/${bill.type?.toLowerCase()}/${bill.number}/actions`,
                apiKey,
                { limit: "5" },
              ),
            );

            return (actionsPayload.actions ?? []).map((action) => ({ action, bill }));
          } catch {
            return [];
          }
        }),
    );

    const items = actionGroups
      .flat()
      .sort((a, b) => {
        const aTime = parseDate(a.action.actionDate) ?? 0;
        const bTime = parseDate(b.action.actionDate) ?? 0;
        return bTime - aTime;
      })
      .slice(0, 10)
      .map(({ action, bill }, index) => ({
        id: `action-${bill.type ?? "bill"}-${bill.number ?? index}-${
          action.actionDate ?? index
        }-${index}`,
        title: cleanSummary(
          `${bill.type ?? "Bill"} ${bill.number ?? ""}: ${
            action.text ?? "Congressional action"
          }`,
          160,
        ),
        summary: cleanSummary(
          [action.type, bill.title].filter(Boolean).join(" · "),
          260,
        ),
        url: billPublicUrl(bill),
        published: action.actionDate ?? bill.latestAction?.actionDate ?? "",
        source: "Congress.gov",
        chamber: bill.originChamber ?? "Congress",
      }));

    return {
      id: "congress-gov-bill-actions",
      source: "Congress.gov Bill Actions",
      chamber: "Congress",
      sourceUrl,
      updated: "",
      description: "Newest recorded actions on current congressional bills.",
      items,
      status: "live",
    };
  } catch (error) {
    return {
      id: "congress-gov-bill-actions",
      source: "Congress.gov Bill Actions",
      chamber: "Congress",
      sourceUrl,
      updated: "",
      description: "",
      items: [],
      status: "error",
      error: error instanceof Error ? error.message : "Unable to load bill actions",
    };
  }
}

async function readCongressGovCommitteeMeetings(
  apiKey: string,
  congress: number,
): Promise<FederalFeedResult> {
  const sourceUrl =
    "https://www.congress.gov/committee-schedule/daily/by-committee";

  try {
    const [house, senate] = await Promise.all([
      fetchJson<{ committeeMeetings?: CongressGovCommitteeMeeting[] }>(
        congressGovUrl(`/committee-meeting/${congress}/house`, apiKey, { limit: "8" }),
      ),
      fetchJson<{ committeeMeetings?: CongressGovCommitteeMeeting[] }>(
        congressGovUrl(`/committee-meeting/${congress}/senate`, apiKey, { limit: "8" }),
      ),
    ]);

    const meetings = [
      ...(house.committeeMeetings ?? []),
      ...(senate.committeeMeetings ?? []),
    ]
      .sort((a, b) => {
        const aTime = parseDate(a.date ?? a.updateDate) ?? 0;
        const bTime = parseDate(b.date ?? b.updateDate) ?? 0;
        return bTime - aTime;
      })
      .slice(0, 10);

    return {
      id: "congress-gov-committee-meetings",
      source: "Congress.gov Committee Meetings",
      chamber: "Congress",
      sourceUrl,
      updated: "",
      description: "Current House and Senate committee meetings, hearings, and markups.",
      items: meetings.map((meeting, index) => ({
        id: meeting.url ?? `committee-meeting-${meeting.eventId ?? index}`,
        title: cleanSummary(meeting.title ?? "Committee meeting", 160),
        summary: cleanSummary(
          [
            meeting.chamber,
            meeting.type,
            meeting.meetingStatus,
          ]
            .filter(Boolean)
            .join(" · "),
          220,
        ),
        url: committeeMeetingUrl(meeting),
        published: meeting.date ?? meeting.updateDate ?? "",
        source: "Congress.gov",
        chamber: meeting.chamber ?? "Congress",
      })),
      status: "live",
    };
  } catch (error) {
    return {
      id: "congress-gov-committee-meetings",
      source: "Congress.gov Committee Meetings",
      chamber: "Congress",
      sourceUrl,
      updated: "",
      description: "",
      items: [],
      status: "error",
      error:
        error instanceof Error
          ? error.message
          : "Unable to load committee meetings",
    };
  }
}

async function readCongressGovFeeds(now: Date): Promise<FederalFeedResult[]> {
  const apiKey = congressGovApiKey();

  if (!apiKey) {
    return [];
  }

  const congress = currentCongress(now);

  return await Promise.all([
    readCongressGovBills(apiKey, congress),
    readCongressGovBillActions(apiKey, congress),
    readCongressGovCommitteeMeetings(apiKey, congress),
  ]);
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

export async function GET(request: Request) {
  const now = new Date();
  const sourceSelection = selectMunicipalSources(request);
  const [rssFeeds, federalRegister, congressGovFeeds, municipalSources] = await Promise.all([
    Promise.all(FEDERAL_RSS_FEEDS.map((feed) => readRssFeed(feed))),
    readFederalRegister(),
    readCongressGovFeeds(now),
    mapWithConcurrency(
      sourceSelection.selectedSources,
      sourceSelection.loadAll ? 6 : 8,
      (source) => readMunicipalSource(source, now),
    ),
  ]);

  const federalFeeds = [...congressGovFeeds, ...rssFeeds, federalRegister];
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
      congressGovApiKey()
        ? "Federal data comes from the Congress.gov API, Congress.gov RSS, GovInfo RSS, and the Federal Register API."
        : "Federal data comes from Congress.gov RSS, GovInfo RSS, and the Federal Register API. Add CONGRESS_GOV_API_KEY for richer bill, action, and committee feeds.",
      sourceSelection.query
        ? `Local meeting data is loaded from matching public Legistar calendars for "${sourceSelection.query}".`
        : sourceSelection.loadAll
          ? "Local meeting data is loaded from a broad public Legistar calendar snapshot."
          : sourceSelection.hasPosition
            ? "Local meeting data is loaded from the nearest public Legistar calendars to the user's location."
            : "Local meeting data is loaded from a representative default set of public Legistar calendars until a location or search is provided.",
      supabaseConfig()
        ? "External source responses are cached in Supabase with source-specific TTLs."
        : "External source responses use an in-memory TTL cache; configure Supabase for persistent caching.",
      "Coverage is source-based, not exhaustive. Use the source links for official records.",
    ],
    stats: {
      federalItems: federalItems.length,
      federalFeedsLive: federalFeeds.filter((feed) => feed.status === "live").length,
      municipalSources: MUNICIPAL_SOURCES.length,
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
