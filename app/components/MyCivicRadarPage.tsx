"use client";

import {
  AlertCircle,
  ArrowLeft,
  LoaderCircle,
  RefreshCw,
  UserRound,
} from "lucide-react";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useState } from "react";
import CivicAgentConsole from "./CivicAgentConsole";

declare global {
  interface Window {
    __CIVIC_DATA_URL__?: string;
  }
}

type CivicData = NonNullable<ComponentProps<typeof CivicAgentConsole>["data"]>;

type MyCivicRadarPageProps = {
  homeHref?: string;
};

export default function MyCivicRadarPage({
  homeHref = "/",
}: MyCivicRadarPageProps) {
  const [data, setData] = useState<CivicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const requestUrl = window.__CIVIC_DATA_URL__ ?? "/api/civic?limit=12";
      const response = await fetch(requestUrl, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      setData((await response.json()) as CivicData);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refreshData();
    }, 0);

    return () => window.clearTimeout(refreshTimer);
  }, [refreshData]);

  return (
    <main className="civic-radar-shell relative min-h-screen overflow-hidden bg-[#f6f7f2] text-zinc-950">
      <div aria-hidden="true" className="civic-ambient-background">
        <span className="civic-signal-path civic-signal-path-a" />
        <span className="civic-signal-path civic-signal-path-b" />
        <span className="civic-signal-node civic-signal-node-a" />
        <span className="civic-signal-node civic-signal-node-b" />
        <span className="civic-signal-node civic-signal-node-c" />
      </div>

      <header className="relative top-0 z-30 border-b border-zinc-200/80 bg-[#f6f7f2]/88 backdrop-blur md:sticky">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-3 md:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <a
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-900"
              href={homeHref}
            >
              <ArrowLeft className="h-4 w-4" />
              Public radar
            </a>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-teal-700">
              My Civic Radar
            </p>
            <h1 className="text-lg font-semibold tracking-normal text-zinc-950 sm:text-xl md:text-3xl">
              Personal civic alerts and evidence-bound briefs
            </h1>
          </div>

          <button
            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-zinc-200/80 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-[0_1px_2px_rgb(24_31_27/0.06)] hover:border-teal-500 hover:text-teal-700 disabled:cursor-wait disabled:opacity-60 sm:py-2 lg:self-center"
            disabled={loading}
            onClick={refreshData}
            type="button"
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-4 md:px-6">
        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-white p-4 text-sm text-zinc-600 shadow-[0_1px_2px_rgb(24_31_27/0.06)]">
            <UserRound className="h-4 w-4 text-teal-700" />
            Loading My Civic Radar
          </div>
        ) : null}

        <CivicAgentConsole data={data} />
      </div>
    </main>
  );
}
