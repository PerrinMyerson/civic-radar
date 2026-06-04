"use client";

import {
  AlertCircle,
  Building2,
  CalendarDays,
  Clock3,
  ExternalLink,
  FileText,
  Landmark,
  Layers,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  sourceNotes: string[];
  stats: {
    federalItems: number;
    federalFeedsLive: number;
    municipalSources: number;
    municipalSourcesLive: number;
    municipalMeetings: number;
    nextLocalMeeting: string;
  };
  federalFeeds: FederalFeed[];
  municipalSources: MunicipalSource[];
  municipalMeetings: Meeting[];
};

type UserPosition = {
  lat: number;
  lng: number;
};

type Scope = "all" | "federal" | "local";
type FeedFilter = "all" | "House" | "Senate" | "Congress" | "GovInfo" | "Agencies";

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

type LeafletMapInstance = {
  fitBounds: (
    bounds: Array<[number, number]>,
    options?: { padding?: [number, number]; maxZoom?: number },
  ) => void;
  flyTo: (
    latLng: [number, number],
    zoom: number,
    options?: { duration?: number },
  ) => void;
  remove: () => void;
  setView: (latLng: [number, number], zoom: number) => LeafletMapInstance;
};

type LeafletLayerGroup = {
  addTo: (map: LeafletMapInstance) => LeafletLayerGroup;
  clearLayers: () => void;
};

type LeafletMarker = {
  addTo: (target: LeafletLayerGroup) => LeafletMarker;
  bindPopup: (html: string) => LeafletMarker;
  on: (eventName: "click", handler: () => void) => LeafletMarker;
};

type LeafletNamespace = {
  control: {
    zoom: (options: { position: "bottomright" }) => {
      addTo: (map: LeafletMapInstance) => void;
    };
  };
  divIcon: (options: {
    className: string;
    html: string;
    iconAnchor: [number, number];
    iconSize: [number, number];
  }) => unknown;
  layerGroup: () => LeafletLayerGroup;
  map: (
    element: HTMLDivElement,
    options: { scrollWheelZoom: boolean; zoomControl: boolean },
  ) => LeafletMapInstance;
  marker: (
    latLng: [number, number],
    options: { icon: unknown; title: string },
  ) => LeafletMarker;
  tileLayer: (
    url: string,
    options: { attribution: string; maxZoom: number },
  ) => {
    addTo: (map: LeafletMapInstance) => void;
  };
};

let leafletLoadPromise: Promise<void> | null = null;

const FEED_FILTERS: Array<{ id: FeedFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "House", label: "House" },
  { id: "Senate", label: "Senate" },
  { id: "Congress", label: "Congress" },
  { id: "Agencies", label: "Agencies" },
];

const SCOPE_OPTIONS: Array<{ id: Scope; label: string; Icon: typeof Layers }> = [
  { id: "all", label: "All", Icon: Layers },
  { id: "federal", label: "Federal", Icon: Landmark },
  { id: "local", label: "Local", Icon: MapPin },
];

function loadLeafletAssets() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.L) {
    return Promise.resolve();
  }

  if (leafletLoadPromise) {
    return leafletLoadPromise;
  }

  leafletLoadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-civic-leaflet="true"]')) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      style.dataset.civicLeaflet = "true";
      document.head.appendChild(style);
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-civic-leaflet="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Leaflet failed to load")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.dataset.civicLeaflet = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.body.appendChild(script);
  });

  return leafletLoadPromise;
}

function formatDate(value: string) {
  if (!value) {
    return "No date";
  }

  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatFeedDate(value: string) {
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

function relativeDate(dayDiff: number | null) {
  if (dayDiff === null) {
    return "Scheduled";
  }

  if (dayDiff === 0) {
    return "Today";
  }

  if (dayDiff === 1) {
    return "Tomorrow";
  }

  if (dayDiff === -1) {
    return "Yesterday";
  }

  if (dayDiff > 1) {
    return `${dayDiff} days out`;
  }

  return `${Math.abs(dayDiff)} days ago`;
}

function statusTone(status: string) {
  if (/cancel/i.test(status)) {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  if (/final/i.test(status)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (/draft|quiet/i.test(status)) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (/error|stale/i.test(status)) {
    return "bg-zinc-100 text-zinc-600 ring-zinc-300";
  }

  return "bg-sky-50 text-sky-700 ring-sky-200";
}

function sourceTone(status: MunicipalSource["status"]) {
  if (status === "live") {
    return "Live";
  }

  if (status === "quiet") {
    return "Quiet";
  }

  if (status === "stale") {
    return "Stale";
  }

  return "Error";
}

function distanceMiles(from: UserPosition, to: UserPosition) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function CivicMap({
  sources,
  selectedId,
  onSelect,
}: {
  sources: MunicipalSource[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const markersRef = useRef<LeafletLayerGroup | null>(null);
  const didFitRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let mounted = true;

    loadLeafletAssets()
      .then(() => {
        if (!mounted || !containerRef.current || mapRef.current || !window.L) {
          return;
        }

        const L = window.L;
        const map = L.map(containerRef.current, {
          zoomControl: false,
          scrollWheelZoom: true,
        }).setView([39.5, -98.35], 4);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        L.control.zoom({ position: "bottomright" }).addTo(map);

        mapRef.current = map;
        markersRef.current = L.layerGroup().addTo(map);
        setReady(true);
      })
      .catch((error: Error) => {
        if (mounted) {
          setMapError(error.message);
        }
      });

    return () => {
      mounted = false;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || !window.L || !mapRef.current || !markersRef.current) {
      return;
    }

    const L = window.L;
    markersRef.current.clearLayers();
    const bounds: Array<[number, number]> = [];

    sources.forEach((source) => {
      const selected = source.id === selectedId;
      const tone = selected ? "selected" : source.status;
      const marker = L.marker([source.lat, source.lng], {
        icon: L.divIcon({
          html: `<span class="civic-marker civic-marker-${tone}">${source.eventCount}</span>`,
          className: "civic-marker-shell",
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
        title: source.name,
      });

      marker.on("click", () => onSelect(source.id));
      marker.bindPopup(
        `<strong>${escapeHtml(source.name)}</strong><br/>${escapeHtml(
          source.place,
        )}<br/>${source.eventCount} current meetings`,
      );
      marker.addTo(markersRef.current);
      bounds.push([source.lat, source.lng]);
    });

    if (bounds.length > 0 && !didFitRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [34, 34], maxZoom: 5 });
      didFitRef.current = true;
    }
  }, [onSelect, ready, selectedId, sources]);

  useEffect(() => {
    if (!ready || !window.L || !mapRef.current || !selectedId) {
      return;
    }

    const selected = sources.find((source) => source.id === selectedId);
    if (selected) {
      mapRef.current.flyTo([selected.lat, selected.lng], 9, { duration: 0.8 });
    }
  }, [ready, selectedId, sources]);

  return (
    <div className="relative min-h-[380px] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 md:min-h-[510px]">
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && !mapError ? (
        <div className="absolute inset-0 grid place-items-center bg-[#f2f5f1] text-sm text-zinc-600">
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading map
          </span>
        </div>
      ) : null}
      {mapError ? (
        <div className="absolute inset-0 grid place-items-center bg-[#f2f5f1] p-6 text-center text-sm text-zinc-600">
          <span className="max-w-sm">{mapError}</span>
        </div>
      ) : null}
    </div>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const sourceLabel = meeting.sourceName ? `${meeting.sourceName}, ${meeting.place}` : "";

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {relativeDate(meeting.dayDiff)}
          </p>
          <h3 className="mt-1 text-sm font-semibold leading-5 text-zinc-950">
            {meeting.title}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${statusTone(
            meeting.status,
          )}`}
        >
          {meeting.status}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-zinc-600">
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-teal-700" />
          {formatDate(meeting.date)}
          {meeting.time ? `, ${meeting.time}` : ""}
        </span>
        {meeting.location ? (
          <span className="inline-flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
            <span>{meeting.location}</span>
          </span>
        ) : null}
        {sourceLabel ? (
          <span className="inline-flex items-center gap-2">
            <Building2 className="h-4 w-4 text-sky-700" />
            {sourceLabel}
          </span>
        ) : null}
      </div>

      {meeting.note ? <p className="mt-3 text-sm text-zinc-600">{meeting.note}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {meeting.agendaUrl ? (
          <a
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
            href={meeting.agendaUrl}
            rel="noreferrer"
            target="_blank"
          >
            <FileText className="h-3.5 w-3.5" />
            Agenda
          </a>
        ) : null}
        {meeting.minutesUrl ? (
          <a
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
            href={meeting.minutesUrl}
            rel="noreferrer"
            target="_blank"
          >
            <FileText className="h-3.5 w-3.5" />
            Minutes
          </a>
        ) : null}
        {meeting.videoUrl ? (
          <a
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
            href={meeting.videoUrl}
            rel="noreferrer"
            target="_blank"
          >
            <Video className="h-3.5 w-3.5" />
            Video
          </a>
        ) : null}
        {meeting.sourceUrl ? (
          <a
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
            href={meeting.sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Record
          </a>
        ) : null}
      </div>
    </article>
  );
}

function SourceRow({
  source,
  selected,
  distance,
  onSelect,
}: {
  source: MunicipalSource;
  selected: boolean;
  distance?: number;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      className={`w-full rounded-lg border p-3 text-left shadow-sm transition ${
        selected
          ? "border-teal-500 bg-teal-50"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
      }`}
      onClick={() => onSelect(source.id)}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-950">{source.name}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{source.place}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${statusTone(
            source.status,
          )}`}
        >
          {sourceTone(source.status)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span>{source.eventCount} current</span>
        <span>{distance === undefined ? source.kind : `${Math.round(distance)} mi`}</span>
      </div>
    </button>
  );
}

function FederalFeedCard({ feed }: { feed: FederalFeed }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {feed.chamber}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-zinc-950">{feed.source}</h3>
        </div>
        <a
          className="rounded-md border border-zinc-200 p-1.5 text-zinc-500 hover:border-teal-500 hover:text-teal-700"
          href={feed.sourceUrl}
          rel="noreferrer"
          target="_blank"
          title={`Open ${feed.source}`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {feed.status === "error" ? (
        <div className="mt-4 flex gap-2 rounded-md bg-zinc-100 p-3 text-sm text-zinc-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{feed.error ?? "Feed unavailable"}</span>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {feed.items.slice(0, 4).map((item) => (
            <a
              className="block rounded-md border border-transparent p-2 -mx-2 hover:border-zinc-200 hover:bg-zinc-50"
              href={item.url}
              key={item.id}
              rel="noreferrer"
              target="_blank"
            >
              <p className="text-sm font-medium leading-5 text-zinc-900">{item.title}</p>
              {item.summary ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">
                  {item.summary}
                </p>
              ) : null}
              <p className="mt-1 text-[11px] text-zinc-400">
                {formatFeedDate(item.published || feed.updated)}
              </p>
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
      {label}
    </div>
  );
}

export default function CivicDashboard() {
  const [data, setData] = useState<CivicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [sourceQuery, setSourceQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [geoError, setGeoError] = useState("");

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/civic", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const payload = (await response.json()) as CivicData;
      setData(payload);
      setSelectedSourceId((current) => {
        if (current && payload.municipalSources.some((source) => source.id === current)) {
          return current;
        }

        return (
          payload.municipalSources.find((source) => source.status === "live")?.id ??
          payload.municipalSources[0]?.id ??
          ""
        );
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void refreshData();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [refreshData]);

  const sources = useMemo(() => data?.municipalSources ?? [], [data?.municipalSources]);
  const selectedSource = sources.find((source) => source.id === selectedSourceId);

  const visibleSources = useMemo(() => {
    const query = sourceQuery.trim().toLowerCase();
    const filtered = sources.filter((source) => {
      if (!query) {
        return true;
      }

      return `${source.name} ${source.place} ${source.kind}`.toLowerCase().includes(query);
    });

    return filtered
      .map((source) => ({
        source,
        distance: userPosition
          ? distanceMiles(userPosition, { lat: source.lat, lng: source.lng })
          : undefined,
      }))
      .sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }

        return b.source.eventCount - a.source.eventCount;
      });
  }, [sourceQuery, sources, userPosition]);

  const visibleFederalFeeds = useMemo(() => {
    const feeds = data?.federalFeeds ?? [];
    if (feedFilter === "all") {
      return feeds;
    }

    return feeds.filter((feed) => feed.chamber === feedFilter);
  }, [data?.federalFeeds, feedFilter]);

  const selectedMeetings = selectedSource?.events ?? [];
  const localMeetings = data?.municipalMeetings ?? [];
  const showFederal = scope !== "local";
  const showLocal = scope !== "federal";

  function locateUser() {
    setGeoError("");

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (positionError) => setGeoError(positionError.message),
      { enableHighAccuracy: false, maximumAge: 600000, timeout: 9000 },
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-[#f5f7f4]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
              Civic Radar
            </p>
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 md:text-3xl">
              Live government map and docket monitor
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
              {SCOPE_OPTIONS.map(({ id, label, Icon }) => (
                <button
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                    scope === id
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                  key={id}
                  onClick={() => setScope(id)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <button
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:border-teal-500 hover:text-teal-700 disabled:cursor-wait disabled:opacity-60"
              disabled={loading}
              onClick={refreshData}
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-4 md:px-6">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm md:p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Federal feeds
            </p>
            <p className="mt-1 text-2xl font-semibold">{data?.stats.federalFeedsLive ?? 0}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm md:p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Federal items
            </p>
            <p className="mt-1 text-2xl font-semibold">{data?.stats.federalItems ?? 0}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm md:p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Local sources
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {data?.stats.municipalSourcesLive ?? 0}
              <span className="text-base font-normal text-zinc-400">
                /{data?.stats.municipalSources ?? 0}
              </span>
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm md:p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Local meetings
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {data?.stats.municipalMeetings ?? 0}
            </p>
          </div>
          <div className="col-span-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm md:col-span-1 md:p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Next local
            </p>
            <p className="mt-1 text-xl font-semibold">
              {data?.stats.nextLocalMeeting
                ? formatDate(data.stats.nextLocalMeeting)
                : "No date"}
            </p>
          </div>
        </section>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        <section
          className={`mt-4 grid gap-4 ${
            showFederal && showLocal
              ? "xl:grid-cols-[320px_minmax(0,1.45fr)_minmax(360px,0.85fr)]"
              : "xl:grid-cols-[340px_minmax(0,1fr)]"
          }`}
        >
          {showLocal ? (
            <aside className="order-2 min-w-0 xl:order-none">
              <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <Search className="h-4 w-4 text-zinc-500" />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
                    onChange={(event) => setSourceQuery(event.target.value)}
                    placeholder="Search city, county, state"
                    type="search"
                    value={sourceQuery}
                  />
                </div>

                <button
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
                  onClick={locateUser}
                  type="button"
                >
                  <LocateFixed className="h-4 w-4" />
                  Sort by my location
                </button>

                {geoError ? <p className="mt-2 text-xs text-rose-700">{geoError}</p> : null}
              </div>

              <div className="mt-3 grid max-h-[640px] gap-2 overflow-auto pr-1">
                {loading && !data ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <div
                      className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-white"
                      key={index}
                    />
                  ))
                ) : visibleSources.length > 0 ? (
                  visibleSources.map(({ source, distance }) => (
                    <SourceRow
                      distance={distance}
                      key={source.id}
                      onSelect={setSelectedSourceId}
                      selected={source.id === selectedSourceId}
                      source={source}
                    />
                  ))
                ) : (
                  <EmptyState label="No matching sources" />
                )}
              </div>
            </aside>
          ) : null}

          {showLocal ? (
            <section className="order-1 min-w-0 xl:order-none">
              <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Municipal map
                    </p>
                    <h2 className="truncate text-lg font-semibold text-zinc-950">
                      {selectedSource?.name ?? "Local sources"}
                    </h2>
                    {selectedSource ? (
                      <p className="text-sm text-zinc-500">
                        {selectedSource.place} · {selectedSource.eventCount} current
                      </p>
                    ) : null}
                  </div>
                  {selectedSource ? (
                    <a
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:border-teal-500 hover:text-teal-700"
                      href={selectedSource.sourceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Source
                    </a>
                  ) : null}
                </div>

                <CivicMap
                  onSelect={setSelectedSourceId}
                  selectedId={selectedSourceId}
                  sources={visibleSources.map(({ source }) => source)}
                />
              </div>

              <div className="mt-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Meeting queue
                    </p>
                    <h2 className="text-lg font-semibold text-zinc-950">
                      {selectedSource?.place ?? "Current local meetings"}
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200">
                    <Clock3 className="h-3.5 w-3.5" />
                    {selectedMeetings.length || localMeetings.length}
                  </span>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {(selectedMeetings.length > 0 ? selectedMeetings : localMeetings)
                    .slice(0, 8)
                    .map((meeting) => (
                      <MeetingCard key={meeting.id} meeting={meeting} />
                    ))}
                </div>

                {!loading && selectedMeetings.length === 0 && localMeetings.length === 0 ? (
                  <EmptyState label="No current local meetings returned" />
                ) : null}
              </div>
            </section>
          ) : null}

          {showFederal ? (
            <aside className="order-3 min-w-0 xl:order-none">
              <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Federal watch
                    </p>
                    <h2 className="text-lg font-semibold text-zinc-950">
                      House, Senate, agencies
                    </h2>
                  </div>
                  <Radio className="h-5 w-5 text-teal-700" />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {FEED_FILTERS.map((filter) => (
                    <button
                      className={`rounded-md px-2.5 py-1.5 text-xs font-medium ring-1 transition ${
                        feedFilter === filter.id
                          ? "bg-zinc-950 text-white ring-zinc-950"
                          : "bg-white text-zinc-600 ring-zinc-200 hover:ring-teal-500"
                      }`}
                      key={filter.id}
                      onClick={() => setFeedFilter(filter.id)}
                      type="button"
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid max-h-[820px] gap-3 overflow-auto pr-1">
                {loading && !data ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div
                      className="h-48 animate-pulse rounded-lg border border-zinc-200 bg-white"
                      key={index}
                    />
                  ))
                ) : visibleFederalFeeds.length > 0 ? (
                  visibleFederalFeeds.map((feed) => (
                    <FederalFeedCard feed={feed} key={feed.id} />
                  ))
                ) : (
                  <EmptyState label="No federal feeds in this filter" />
                )}
              </div>
            </aside>
          ) : null}
        </section>

        <footer className="mt-6 flex flex-col gap-2 border-t border-zinc-200 py-5 text-xs text-zinc-500 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(data?.sourceNotes ?? []).map((note) => (
              <span key={note}>{note}</span>
            ))}
          </div>
          <span>
            Updated {data?.generatedAt ? formatFeedDate(data.generatedAt) : "on refresh"}
          </span>
        </footer>
      </div>
    </main>
  );
}
