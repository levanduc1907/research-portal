"use client";

import type { AnalyticsStatsDto } from "@repo/contracts";
import { useEffect, useState } from "react";
import { researchApi } from "../../lib/research-api";

export function StatsOverview(): React.JSX.Element {
  const [stats, setStats] = useState<AnalyticsStatsDto | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    researchApi
      .getStats()
      .then(setStats)
      .catch(() => setHasError(true));
  }, []);

  const metrics = [
    ["Publications", stats?.totalPapers],
    ["Citations", stats?.totalCitations],
    ["Researchers", stats?.totalResearchers],
    ["Research topics", stats?.totalTopics],
  ] as const;
  return (
    <section className="portal-container" aria-label="Research in numbers">
      <dl className="metrics">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {value == null
                ? "-"
                : new Intl.NumberFormat("en", {
                    notation: value >= 1000000 ? "compact" : "standard",
                    maximumFractionDigits: 1,
                  }).format(value)}
            </dd>
          </div>
        ))}
      </dl>
      {hasError && (
        <p className="metrics-note">
          Live research metrics are currently unavailable.
        </p>
      )}
    </section>
  );
}
