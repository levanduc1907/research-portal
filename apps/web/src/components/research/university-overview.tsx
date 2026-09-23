"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

// Facts and editorial references: https://illinois.edu/about/ and /research/.
// Verified September 22, 2026. Keep dated research spending labeled by fiscal year.
export function UniversityOverview(): React.JSX.Element {
  const factsRef = useRef<HTMLDListElement>(null);
  const [factsVisible, setFactsVisible] = useState(false);

  useEffect(() => {
    const facts = factsRef.current;
    if (!facts) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setFactsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.2, rootMargin: "0px 0px -10%" },
    );

    observer.observe(facts);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="about-illinois"
      className="portal-container university-overview"
      aria-labelledby="university-heading"
    >
      <div className="university-intro">
        <div>
          <span className="eyebrow">
            A public university. A shared purpose.
          </span>
          <h2 id="university-heading">
            Learn about <span>Illinois.</span>
          </h2>
        </div>
        <div>
          <p>
            Illinois students and scholars make significant and lasting contributions toward a better future. Our transformative learning experiences, in and out of the classroom, are designed to produce alumni who strive to better understand and address society’s most pressing challenges. And our historical foundation of pioneering research since our founding in 1867 means that the university produces countless innovations that continue to shape our modern world.
          </p>
          <a
            className="university-link"
            href="https://illinois.edu/about/"
            target="_blank"
            rel="noreferrer"
          >
            Discover our university <ArrowUpRight size={17} />
          </a>
        </div>
      </div>
      <dl
        ref={factsRef}
        className={`university-facts${factsVisible ? " is-visible" : ""}`}
      >
        <div>
          <dt>Students</dt>
          <dd>
            60,000<span>+</span>
          </dd>
          <p>A community of learners</p>
        </div>
        <div>
          <dt>Nobel Prizes</dt>
          <dd>25</dd>
          <p>A tradition of discovery</p>
        </div>
        <div>
          <dt>Research centers, labs & institutes</dt>
          <dd>
            150<span>+</span>
          </dd>
          <p>Ideas across disciplines</p>
        </div>
        <div>
          <dt>Research expenditures</dt>
          <dd>
            $865<span>M</span>
          </dd>
          <p>Fiscal year 2025</p>
        </div>
      </dl>
      <div className="facts-source">
        University facts ·{" "}
        <a href="https://illinois.edu/about/" target="_blank" rel="noreferrer">
          About Illinois ↗
        </a>
        <a
          href="https://illinois.edu/research/"
          target="_blank"
          rel="noreferrer"
        >
          Research at Illinois ↗
        </a>
      </div>
      <div className="campus-stories">
        <article className="campus-story">
          <a
            className="story-image"
            href="https://researchpark.illinois.edu/"
            target="_blank"
            rel="noreferrer"
            aria-label="Explore Illinois Research Park"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/illinois-research-park.jpg"
              alt="Illinois Research Park campus"
              loading="lazy"
            />
            <span>Innovation & opportunity</span>
          </a>
          <div className="story-copy">
            <span className="eyebrow">Illinois Research Park</span>
            <h3>Where ideas become possibilities.</h3>
            <p>
              A campus home for startups and industry collaboration, connecting
              research with hands-on opportunities for students.
            </p>
            <a
              className="university-link"
              href="https://researchpark.illinois.edu/"
              target="_blank"
              rel="noreferrer"
            >
              Explore Research Park <ArrowUpRight size={17} />
            </a>
          </div>
        </article>
        <article className="campus-story">
          <a
            className="story-image"
            href="https://www.library.illinois.edu/"
            target="_blank"
            rel="noreferrer"
            aria-label="Explore the University Library"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/illinois-library.jpg"
              alt="University Library at Illinois"
              loading="lazy"
            />
            <span>Knowledge & community</span>
          </a>
          <div className="story-copy">
            <span className="eyebrow">University Library</span>
            <h3>A place for every question.</h3>
            <p>
              Explore more than 15 million volumes, subject libraries, and
              special collections that support learning and discovery across
              campus.
            </p>
            <a
              className="university-link"
              href="https://www.library.illinois.edu/"
              target="_blank"
              rel="noreferrer"
            >
              Discover the library <ArrowUpRight size={17} />
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
