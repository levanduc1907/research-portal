"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { ResearcherDto } from "@repo/contracts";
import { Header } from "../../../components/research/header";
import { Footer } from "../../../components/research/footer";
import { AiAssistant } from "../../../components/research/ai-assistant";
import { ResearcherAvatar } from "../../../components/research/researcher-directory";
import { researchApi } from "../../../lib/research-api";
import { DEFAULT_RESEARCHERS_RESULT } from "../../../lib/sample-researchers";
export default function ResearcherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.JSX.Element {
  const { id } = use(params);
  const [researcher, setResearcher] = useState<ResearcherDto | null>(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let active = true;
    researchApi
      .getResearcher(id)
      .then((r) => {
        if (active) {
          setResearcher(r);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!active) return;
        const sample = DEFAULT_RESEARCHERS_RESULT.data.find((r) => r.id === id);
        setResearcher(sample || null);
        setStatus(sample ? "sample" : "error");
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <div className="portal">
      <Header />
      <main id="main-content" className="portal-container profile-page">
        <Link className="back-link" href="/#faculty">
          ← All researchers
        </Link>
        {status === "loading" ? (
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
            {status === "sample" && (
              <p className="sample-notice">
                Sample profile · Live directory unavailable
              </p>
            )}
            <div className="profile-layout">
              <aside className="profile-sidebar">
                <section className="profile-identity">
                  <ResearcherAvatar researcher={researcher} />
                  <h1>{researcher.name}</h1>
                  <p>{researcher.title}</p>
                </section>
                <section className="profile-panel">
                  <h2>Affiliation</h2>
                  <p>University of Illinois Urbana-Champaign</p>
                  <strong>{researcher.department}</strong>
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
                  {researcher.profileUrl && (
                    <a
                      className="contact-link"
                      href={researcher.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      University profile ↗
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
                  <div className="topic-cloud">
                    {researcher.keywords.map((k) => (
                      <Link
                        key={k}
                        href={`/?keyword=${encodeURIComponent(k)}#faculty`}
                      >
                        {k}
                      </Link>
                    ))}
                  </div>
                  {!researcher.keywords.length && (
                    <p>No research topics listed yet.</p>
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
                <section className="profile-panel">
                  <h2>Scholarly works & background</h2>
                  <p>
                    Visit the university profile for available publications,
                    professional experience, and academic background.
                  </p>
                  {researcher.profileUrl ? (
                    <a
                      className="text-link"
                      href={researcher.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Explore university profile ↗
                    </a>
                  ) : (
                    <p>A university profile link is not available.</p>
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
