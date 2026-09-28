"use client";
import Link from "next/link";
import type { ResearcherDto } from "@repo/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { researchApi } from "../../lib/research-api";
import { DEFAULT_RESEARCHERS_RESULT } from "../../lib/sample-researchers";
import { DepartmentFilter } from "./department-filter";
import { ResearcherSearch } from "./researcher-search";

export function ResearcherAvatar({
  researcher,
}: {
  researcher: ResearcherDto;
}): React.JSX.Element {
  return (
    <span className="researcher-avatar">
      {researcher.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={researcher.photoUrl}
          alt={researcher.name}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span>
        {researcher.name
          .replace(/^Dr\. /, "")
          .split(" ")
          .filter(Boolean)
          .map((n) => n[0])
          .slice(0, 2)
          .join("")}
      </span>
    </span>
  );
}
export function ResearcherDirectory(): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSearchQuery(
      new URLSearchParams(window.location.search).get("keyword") || "",
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const researchersQuery = useQuery({
    queryKey: ["researchers", debouncedQuery, selectedDepartment, page],
    queryFn: () =>
      researchApi.getResearchers({
        query: debouncedQuery,
        department: selectedDepartment,
        page,
        limit: 12,
      }),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const sampleResult = useMemo(() => {
    const data = DEFAULT_RESEARCHERS_RESULT.data.filter(
      (researcher) =>
        [researcher.name, researcher.bio, ...researcher.keywords]
          .join(" ")
          .toLowerCase()
          .includes(debouncedQuery.toLowerCase()) &&
        (!selectedDepartment ||
          researcher.department?.includes(selectedDepartment)),
    );

    return {
      data,
      meta: { ...DEFAULT_RESEARCHERS_RESULT.meta, total: data.length },
    };
  }, [debouncedQuery, selectedDepartment]);

  const researchersResult = researchersQuery.data ?? sampleResult;
  const updateSearch = (value: string): void => {
    setSearchQuery(value);
    setPage(1);
  };
  const updateDepartment = (value: string): void => {
    setSelectedDepartment(value);
    setPage(1);
  };

  return (
    <>
      <section id="faculty" className="portal-container directory">
        <div className="directory-heading">
          <div>
            <span className="eyebrow">Our community</span>
            <h2>Find a researcher</h2>
            <p>Discover people by name, department, or research interest.</p>
          </div>
        </div>
        <div className="directory-filters">
          <ResearcherSearch value={searchQuery} onChange={updateSearch} />
          <DepartmentFilter
            value={selectedDepartment}
            onChange={updateDepartment}
          />
        </div>
        {researchersResult.data.length ? (
          <div className="researcher-grid">
            {researchersResult.data.map((r) => (
              <Link
                className="researcher-card"
                key={r.id}
                href={`/researchers/${encodeURIComponent(r.slug)}`}
              >
                <div className="card-top">
                  <ResearcherAvatar researcher={r} />
                </div>
                <h3>{r.name.replace(/^Dr\. /, "")}</h3>
                <p className="researcher-title">{r.title || "Researcher"}</p>
                <p className="researcher-department">
                  {r.department || "University of Illinois"}
                </p>
                <div className="keyword-list">
                  {r.keywords.slice(0, 3).map((k) => (
                    <span key={k}>{k}</span>
                  ))}
                  {r.keywords.length > 3 && (
                    <span>+{r.keywords.length - 3}</span>
                  )}
                </div>
                <span className="profile-link">
                  View profile <span>→</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No researchers found</h3>
            <p>Try another name or research interest.</p>
            <button
              onClick={() => {
                updateSearch("");
                updateDepartment("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
      <div className="portal-container directory-status" aria-live="polite">
        {researchersQuery.isFetching
          ? "Loading researchers…"
          : researchersQuery.isError
            ? "Live directory unavailable. Showing sample profiles."
            : `${researchersResult.meta.total.toLocaleString()} researchers`}
        {!researchersQuery.isError &&
          !researchersQuery.isFetching &&
          researchersResult.meta.totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={!researchersResult.meta.hasPrevPage}
                onClick={() => setPage((currentPage) => currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {researchersResult.meta.totalPages}
              </span>
              <button
                disabled={!researchersResult.meta.hasNextPage}
                onClick={() => setPage((currentPage) => currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
      </div>
    </>
  );
}
