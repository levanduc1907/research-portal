"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, BookOpen, Quote, Search, X } from "lucide-react";
import type { ResearcherDto } from "@repo/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Header } from "../../../components/research/header";
import { Footer } from "../../../components/research/footer";
import { AiAssistant } from "../../../components/research/ai-assistant";
import { ResearcherAvatar } from "../../../components/research/researcher-directory";
import { getProfileLinkMetadata } from "../../../lib/profile-link";
import { researchApi } from "../../../lib/research-api";
import { DEFAULT_RESEARCHERS_RESULT } from "../../../lib/sample-researchers";

export default function ResearcherPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): React.JSX.Element {
  const { slug } = use(params);
  const router = useRouter();
  const [paperPage, setPaperPage] = useState(1);
  const [paperSearch, setPaperSearch] = useState("");
  const [debouncedPaperSearch, setDebouncedPaperSearch] = useState("");
  const [showAllTopics, setShowAllTopics] = useState(false);

  useEffect(() => {
    setPaperPage(1);
    setPaperSearch("");
    setDebouncedPaperSearch("");
    setShowAllTopics(false);
  }, [slug]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedPaperSearch(paperSearch.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [paperSearch]);

  const sampleResearcher =
    DEFAULT_RESEARCHERS_RESULT.data.find(
      (researcher) => researcher.slug === slug || researcher.id === slug,
    ) ?? null;
  const researcherQuery = useQuery({
    queryKey: ["researcher", slug],
    queryFn: () => researchApi.getResearcher(slug),
    retry: false,
  });
  const papersQuery = useQuery({
    queryKey: ["researcher-papers", slug, debouncedPaperSearch, paperPage],
    queryFn: () =>
      researchApi.getResearcherPapers(slug, {
        query: debouncedPaperSearch,
        page: paperPage,
        limit: 8,
      }),
    placeholderData: keepPreviousData,
    retry: false,
  });

  const researcher: ResearcherDto | null =
    researcherQuery.data ?? sampleResearcher;
  const profileLink = researcher?.profileUrl
    ? getProfileLinkMetadata(researcher.profileUrl)
    : null;

  useEffect(() => {
    if (researcher?.slug && researcher.slug !== slug) {
      router.replace(`/researchers/${encodeURIComponent(researcher.slug)}`);
    }
  }, [slug, researcher?.slug, router]);
  const isSample = researcherQuery.isError && Boolean(sampleResearcher);
  const papers = papersQuery.data;
  const portalPaperCount = papers?.meta.total;
  const visibleKeywords = showAllTopics
    ? (researcher?.keywords ?? [])
    : (researcher?.keywords.slice(0, 12) ?? []);

  return (
    <div className="portal">
      <Header />
      <main id="main-content" className="portal-container profile-page">
        <Link className="back-link" href="/#faculty">
          ← All researchers
        </Link>
        {researcherQuery.isPending ? (
          <div className="empty-state" role="status">
            Loading researcher profile…
          </div>
        ) : !researcher ? (
          <div className="empty-state">
            <h1>Profile unavailable</h1>
            <p>
              We couldn’t load this researcher. Return to the directory to try
              another profile.
            </p>
          </div>
        ) : (
          <>
            {isSample && (
              <p className="sample-notice">
                Sample profile · Live directory unavailable
              </p>
            )}
            <div className="profile-layout">
              <aside className="profile-sidebar">
                <section className="profile-identity">
                  <ResearcherAvatar researcher={researcher} />
                  <h1>{researcher.name}</h1>
                  <p>{researcher.title || "Researcher"}</p>
                </section>
                <section className="profile-panel">
                  <h2>Academic appointment</h2>
                  <dl className="profile-appointment">
                    <div>
                      <dt>Institution</dt>
                      <dd>University of Illinois Urbana-Champaign</dd>
                    </div>
                    {researcher.department && (
                      <div>
                        <dt>Department</dt>
                        <dd>{researcher.department}</dd>
                      </div>
                    )}
                  </dl>
                </section>
                {researcher.bio && (
                  <section className="profile-panel">
                    <h2>About</h2>
                    <p>{researcher.bio}</p>
                  </section>
                )}
                <section className="profile-panel">
                  <h2>Connect</h2>
                  {researcher.email && (
                    <a
                      className="contact-link"
                      href={`mailto:${researcher.email}`}
                    >
                      {researcher.email}
                    </a>
                  )}
                  {researcher.profileUrl && profileLink && (
                    <a
                      className="contact-link"
                      href={researcher.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {profileLink.label} ↗
                    </a>
                  )}
                  {!researcher.email && !researcher.profileUrl && (
                    <p>Contact information is not available.</p>
                  )}
                </section>
              </aside>

              <div className="profile-content">
                <section className="profile-panel topics-panel">
                  <span className="eyebrow">Areas of expertise</span>
                  <h2>Research topics</h2>
                  <p>
                    Explore the interests that shape{" "}
                    {researcher.name.replace(/^Dr\. /, "")}’s work.
                  </p>
                  {!!researcher.keywords.length && (
                    <div className="topic-cloud">
                      {visibleKeywords.map((keyword) => (
                        <Link
                          key={keyword}
                          href={`/?keyword=${encodeURIComponent(keyword)}#faculty`}
                        >
                          {keyword}
                        </Link>
                      ))}
                      {researcher.keywords.length > 12 && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowAllTopics((current) => !current)
                          }
                        >
                          {showAllTopics
                            ? "Show fewer"
                            : `+${researcher.keywords.length - 12} more`}
                        </button>
                      )}
                    </div>
                  )}
                  {!researcher.keywords.length && (
                    <p className="profile-muted">
                      No research topics listed yet.
                    </p>
                  )}
                </section>

                <section className="profile-panel">
                  <h2>Research activity</h2>
                  <dl className="profile-metrics">
                    <div>
                      <dt>Scholarly works</dt>
                      <dd>{researcher.worksCount.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>Citations</dt>
                      <dd>{researcher.citedByCount.toLocaleString()}</dd>
                    </div>
                  </dl>
                </section>

                <section className="profile-panel profile-publications">
                  <div className="profile-section-heading">
                    <div>
                      <span className="eyebrow">Publications</span>
                      <h2>Scholarly works</h2>
                    </div>
                    {portalPaperCount !== undefined && (
                      <span className="publication-count">
                        {debouncedPaperSearch
                          ? `${portalPaperCount.toLocaleString()} result${portalPaperCount === 1 ? "" : "s"}`
                          : `${portalPaperCount.toLocaleString()} indexed`}
                      </span>
                    )}
                  </div>

                  <div className="profile-paper-search">
                    <label htmlFor="paper-title-search">
                      Search publications by title
                    </label>
                    <div className="profile-paper-search-field">
                      <Search aria-hidden="true" />
                      <input
                        id="paper-title-search"
                        type="search"
                        value={paperSearch}
                        placeholder="Enter a paper title…"
                        autoComplete="off"
                        onChange={(event) => {
                          setPaperSearch(event.target.value);
                          setPaperPage(1);
                        }}
                      />
                      {paperSearch && (
                        <button
                          type="button"
                          aria-label="Clear paper title search"
                          onClick={() => {
                            setPaperSearch("");
                            setPaperPage(1);
                          }}
                        >
                          <X aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <span aria-live="polite">
                      {papersQuery.isFetching && !papersQuery.isPending
                        ? "Searching…"
                        : ""}
                    </span>
                  </div>

                  {papersQuery.isPending ? (
                    <div className="profile-inline-state" role="status">
                      Loading publications…
                    </div>
                  ) : papersQuery.isError ? (
                    <div className="profile-inline-state is-error">
                      Publications could not be loaded. Please try again.
                    </div>
                  ) : papers && papers.data.length ? (
                    <>
                      <div className="profile-paper-list">
                        {papers.data.map((paper) => {
                          const externalUrl = paper.landingPageUrl || paper.doi;
                          return (
                            <article className="profile-paper" key={paper.id}>
                              <div
                                className="profile-paper-icon"
                                aria-hidden="true"
                              >
                                <BookOpen />
                              </div>
                              <div className="profile-paper-content">
                                <div className="profile-paper-meta">
                                  <span>{paper.publicationYear}</span>
                                  <span>{paper.authorPosition} author</span>
                                  {paper.isCorresponding && (
                                    <span>Corresponding author</span>
                                  )}
                                </div>
                                <h3>{paper.title}</h3>
                                <div className="profile-paper-footer">
                                  <span>
                                    <Quote aria-hidden="true" />
                                    {paper.citedByCount.toLocaleString()}{" "}
                                    citations
                                  </span>
                                  {paper.primaryTopic && (
                                    <span>
                                      {paper.primaryTopic.displayName}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {externalUrl && (
                                <a
                                  className="profile-paper-link"
                                  href={
                                    externalUrl.startsWith("http")
                                      ? externalUrl
                                      : `https://doi.org/${externalUrl}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`Open publication: ${paper.title}`}
                                >
                                  <ArrowUpRight aria-hidden="true" />
                                </a>
                              )}
                            </article>
                          );
                        })}
                      </div>

                      {papers.meta.totalPages > 1 && (
                        <div className="profile-publication-pagination">
                          <span>
                            Page {papers.meta.page} of {papers.meta.totalPages}
                          </span>
                          <div>
                            <button
                              type="button"
                              disabled={!papers.meta.hasPrevPage}
                              onClick={() =>
                                setPaperPage((current) => current - 1)
                              }
                            >
                              Previous
                            </button>
                            <button
                              type="button"
                              disabled={!papers.meta.hasNextPage}
                              onClick={() =>
                                setPaperPage((current) => current + 1)
                              }
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="profile-inline-state">
                      {debouncedPaperSearch
                        ? `No publications match “${debouncedPaperSearch}”.`
                        : "No publications have been linked to this researcher yet."}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
      <AiAssistant />
    </div>
  );
}
