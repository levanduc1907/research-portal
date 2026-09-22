"use client";

import React, { useState, useEffect } from "react";
import { Header } from "../components/research/header";
import { Hero } from "../components/research/hero";
import { StatsOverview } from "../components/research/stats-overview";
import { AnalyticsSection } from "../components/research/analytics-section";
import { PaperExplorer } from "../components/research/paper-explorer";
import { ResearcherDirectory } from "../components/research/researcher-directory";
import { AiAssistant } from "../components/research/ai-assistant";
import { PaperDetailModal } from "../components/research/paper-detail-modal";
import { ResearcherDetailModal } from "../components/research/researcher-detail-modal";
import { Footer } from "../components/research/footer";
import { researchApi } from "../lib/research-api";
import {
  InstitutionDto,
  AnalyticsStatsDto,
  PublicationYearTrendDto,
  TopicTrendDto,
  PaperDto,
  ResearcherDto,
  PaginatedResult,
} from "@repo/contracts";

const DEFAULT_PAPERS_RESULT: PaginatedResult<PaperDto> = {
  data: [
    {
      id: "p-1",
      openalexId: "https://openalex.org/W4391823901",
      doi: "https://doi.org/10.1145/3613904.3642100",
      title: "Optimizing Massive Scale Memory Consistency for Heterogeneous AI Accelerators",
      publicationDate: "2025-04-12T00:00:00.000Z",
      publicationYear: 2025,
      citedByCount: 48,
      abstract:
        "Modern deep learning workloads necessitate tightly coupled hardware accelerators. In this work, UIUC researchers present an optimized memory consistency model that reduces latency by 37% across heterogeneous GPU-NPU interconnects.",
      landingPageUrl: "https://doi.org/10.1145/3613904.3642100",
      pdfUrl: null,
      primaryTopic: {
        id: "T10054",
        displayName: "Parallel Computing and Optimization Techniques",
      },
      authors: [
        { id: "a-1", openalexId: "A5012345672", displayName: "Sarita Adve", authorPosition: "first" },
        { id: "a-2", openalexId: "A5012345673", displayName: "Marc Snir", authorPosition: "last" },
      ],
      topics: [
        {
          id: "t-1",
          openalexId: "T10054",
          displayName: "Parallel Computing and Optimization Techniques",
          score: 0.95,
          isPrimary: true,
        },
      ],
    },
    {
      id: "p-2",
      openalexId: "https://openalex.org/W4391823902",
      doi: "https://doi.org/10.18653/v1/2025.findings-acl.12",
      title: "Autonomous Knowledge Extraction from Scientific Text Using Graph Guided Foundation Models",
      publicationDate: "2025-07-20T00:00:00.000Z",
      publicationYear: 2025,
      citedByCount: 89,
      abstract:
        "Extracting structured scientific facts from multidisciplinary literature is hindered by hallucination. We present a dual graph-guided prompt framework that retrieves grounding evidence and verifies factual assertions across 200,000 papers.",
      landingPageUrl: "https://doi.org/10.18653/v1/2025.findings-acl.12",
      pdfUrl: null,
      primaryTopic: {
        id: "T10028",
        displayName: "Topic Modeling and Natural Language Processing",
      },
      authors: [
        { id: "a-3", openalexId: "A5012345671", displayName: "Jiawei Han", authorPosition: "first" },
        { id: "a-4", openalexId: "A5012345676", displayName: "ChengXiang Zhai", authorPosition: "last" },
      ],
      topics: [
        {
          id: "t-2",
          openalexId: "T10028",
          displayName: "Topic Modeling and Natural Language Processing",
          score: 0.98,
          isPrimary: true,
        },
      ],
    },
    {
      id: "p-3",
      openalexId: "https://openalex.org/W4391823903",
      doi: "https://doi.org/10.1126/science.ade4502",
      title: "Engineering Enhanced Photosynthetic Pathways for Elevated Atmospheric CO2 Resilience in Crops",
      publicationDate: "2024-09-15T00:00:00.000Z",
      publicationYear: 2024,
      citedByCount: 142,
      abstract:
        "Photosynthetic efficiency is a key bottleneck in crop yields under changing climatic conditions. This study demonstrates genetically modified soybean varieties that improve carbon assimilation efficiency by 22% in field trials.",
      landingPageUrl: "https://doi.org/10.1126/science.ade4502",
      pdfUrl: null,
      primaryTopic: {
        id: "T10303",
        displayName: "Photosynthetic Processes and Mechanisms",
      },
      authors: [
        { id: "a-5", openalexId: "A5012345675", displayName: "Stephen Long", authorPosition: "first" },
      ],
      topics: [
        {
          id: "t-3",
          openalexId: "T10303",
          displayName: "Photosynthetic Processes and Mechanisms",
          score: 0.97,
          isPrimary: true,
        },
      ],
    },
  ],
  meta: {
    total: 3,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

const DEFAULT_RESEARCHERS_RESULT: PaginatedResult<ResearcherDto> = {
  data: [
    {
      id: "r-1",
      name: "Dr. Jiawei Han",
      email: "hanj@illinois.edu",
      department: "Computer Science",
      title: "Michael Aiken Chair Professor",
      bio: "World-renowned pioneer in data mining, text mining, and information network analysis.",
      profileUrl: "https://siebelschool.illinois.edu/about/people/all-faculty/hanj",
      photoUrl: null,
      worksCount: 950,
      citedByCount: 198000,
      keywords: ["Data Mining", "Text Mining", "Information Networks", "LLM Extraction", "Knowledge Graphs"],
    },
    {
      id: "r-2",
      name: "Dr. Sarita Adve",
      email: "sadve@illinois.edu",
      department: "Computer Science",
      title: "Richard T. Cheng Professor",
      bio: "Pioneering computer architect leading Illinois XR and memory consistency models research.",
      profileUrl: "https://siebelschool.illinois.edu/about/people/all-faculty/sadve",
      photoUrl: null,
      worksCount: 220,
      citedByCount: 24000,
      keywords: ["Computer Architecture", "Memory Consistency", "Extended Reality (XR)", "Parallel Computing"],
    },
    {
      id: "r-3",
      name: "Dr. Marc Snir",
      email: "snir@illinois.edu",
      department: "Computer Science",
      title: "Professor Emeritus",
      bio: "Key contributor to the Message Passing Interface (MPI) standard and scalable supercomputing architecture.",
      profileUrl: "https://siebelschool.illinois.edu/about/people/all-faculty/snir",
      photoUrl: null,
      worksCount: 310,
      citedByCount: 29000,
      keywords: ["High Performance Computing", "MPI", "Supercomputing", "Parallel Algorithms"],
    },
    {
      id: "r-4",
      name: "Dr. Nancy M. Amato",
      email: "namato@illinois.edu",
      department: "Computer Science",
      title: "Abel Bliss Professor & Department Head",
      bio: "Leading researcher in motion planning, robotics, computational biology, and parallel computing.",
      profileUrl: "https://siebelschool.illinois.edu/about/people/all-faculty/namato",
      photoUrl: null,
      worksCount: 380,
      citedByCount: 21500,
      keywords: ["Robotics", "Motion Planning", "Computational Biology", "Parallel Algorithms"],
    },
    {
      id: "r-5",
      name: "Dr. Stephen Long",
      email: "slong@illinois.edu",
      department: "Crop Sciences & Plant Biology",
      title: "Ikenberry Endowed Chair",
      bio: "Pioneering research in improving crop photosynthetic efficiency for global food and bioenergy security.",
      profileUrl: "https://cropsciences.illinois.edu/directory/profile/slong",
      photoUrl: null,
      worksCount: 460,
      citedByCount: 45000,
      keywords: ["Photosynthesis", "Crop Yield", "Climate Change Mitigation", "Bioenergy Crops"],
    },
  ],
  meta: {
    total: 5,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
};

const DEFAULT_TRENDS: PublicationYearTrendDto[] = [
  { year: 2022, count: 11579, citedCount: 186345 },
  { year: 2023, count: 12310, citedCount: 134307 },
  { year: 2024, count: 13564, citedCount: 93579 },
  { year: 2025, count: 13585, citedCount: 37789 },
  { year: 2026, count: 12513, citedCount: 4192 },
];

const DEFAULT_TOPICS: TopicTrendDto[] = [
  { topicId: "T10054", displayName: "Parallel Computing & Optimization", count: 3871, percentage: 18.2 },
  { topicId: "T10472", displayName: "Semiconductor Quantum Structures", count: 3258, percentage: 15.3 },
  { topicId: "T10303", displayName: "Photosynthetic Processes & Mechanisms", count: 2774, percentage: 13.0 },
  { topicId: "T10028", displayName: "Topic Modeling & Natural Language AI", count: 2239, percentage: 10.5 },
  { topicId: "T10715", displayName: "Distributed Systems & Cloud Networks", count: 1982, percentage: 9.3 },
  { topicId: "T10286", displayName: "Information Retrieval & Search", count: 1850, percentage: 8.7 },
  { topicId: "T12571", displayName: "Soybean Genetics & Agriculture", count: 1650, percentage: 7.8 },
];

export default function HomePage() {
  const [institution, setInstitution] = useState<InstitutionDto | null>(null);
  const [stats, setStats] = useState<AnalyticsStatsDto | null>(null);
  const [trends, setTrends] = useState<PublicationYearTrendDto[]>(DEFAULT_TRENDS);
  const [topics, setTopics] = useState<TopicTrendDto[]>(DEFAULT_TOPICS);

  // Papers filters state
  const [papersResult, setPapersResult] = useState<PaginatedResult<PaperDto>>(DEFAULT_PAPERS_RESULT);
  const [paperSearch, setPaperSearch] = useState("");
  const [paperTopic, setPaperTopic] = useState("");
  const [paperYear, setPaperYear] = useState("");
  const [paperSort, setPaperSort] = useState<"citations" | "date">("citations");
  const [paperPage, setPaperPage] = useState(1);

  // Researchers filters state
  const [researchersResult, setResearchersResult] = useState<PaginatedResult<ResearcherDto>>(DEFAULT_RESEARCHERS_RESULT);
  const [facultySearch, setFacultySearch] = useState("");
  const [facultyDept, setFacultyDept] = useState("");

  // Modal inspection states
  const [selectedPaper, setSelectedPaper] = useState<PaperDto | null>(null);
  const [selectedResearcher, setSelectedResearcher] = useState<ResearcherDto | null>(null);

  // Floating AI Assistant state
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Initial load
  useEffect(() => {
    researchApi
      .getInstitution()
      .then(setInstitution)
      .catch(() => {});

    researchApi
      .getStats()
      .then(setStats)
      .catch(() => {});

    researchApi
      .getTrends()
      .then(setTrends)
      .catch(() => {});

    researchApi
      .getTopics()
      .then(setTopics)
      .catch(() => {});
  }, []);

  // Fetch papers when filters change
  useEffect(() => {
    researchApi
      .getPapers({
        query: paperSearch,
        topic: paperTopic,
        year: paperYear ? Number(paperYear) : undefined,
        sort: paperSort,
        page: paperPage,
        limit: 10,
      })
      .then(setPapersResult)
      .catch(() => {});
  }, [paperSearch, paperTopic, paperYear, paperSort, paperPage]);

  // Fetch researchers when filters change
  useEffect(() => {
    researchApi
      .getResearchers({
        query: facultySearch,
        department: facultyDept,
      })
      .then(setResearchersResult)
      .catch(() => {});
  }, [facultySearch, facultyDept]);

  const handleSelectTopicFromChart = (topicName: string) => {
    setPaperTopic(topicName);
    const papersEl = document.getElementById("papers");
    if (papersEl) {
      papersEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSelectKeywordFromFaculty = (keyword: string) => {
    setPaperSearch(keyword);
    const papersEl = document.getElementById("papers");
    if (papersEl) {
      papersEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      <Header onOpenAssistant={() => setIsAssistantOpen(true)} />

      <main className="flex-1">
        {/* 1. Hero */}
        <Hero
          institution={institution}
          onOpenAssistant={() => setIsAssistantOpen(true)}
        />

        {/* 2. Stats Overview */}
        <StatsOverview stats={stats} />

        {/* 3. Analytics & Topics Trends */}
        <AnalyticsSection
          trends={trends}
          topics={topics}
          onSelectTopic={handleSelectTopicFromChart}
        />

        {/* 4. Literature Explorer (List on main page) */}
        <PaperExplorer
          papersResult={papersResult}
          searchQuery={paperSearch}
          selectedTopic={paperTopic}
          selectedYear={paperYear}
          sortBy={paperSort}
          onSearchChange={setPaperSearch}
          onTopicChange={setPaperTopic}
          onYearChange={setPaperYear}
          onSortChange={setPaperSort}
          onPageChange={setPaperPage}
          onSelectPaper={setSelectedPaper}
        />

        {/* 5. Faculty & Researchers Directory (List on main page) */}
        <ResearcherDirectory
          researchersResult={researchersResult}
          searchQuery={facultySearch}
          selectedDepartment={facultyDept}
          onSearchChange={setFacultySearch}
          onDepartmentChange={setFacultyDept}
          onSelectKeyword={handleSelectKeywordFromFaculty}
          onSelectResearcher={setSelectedResearcher}
        />
      </main>

      <Footer />

      {/* Floating Mini Popup AI Assistant */}
      <AiAssistant
        isOpen={isAssistantOpen}
        onToggle={() => setIsAssistantOpen((prev) => !prev)}
      />

      {/* Detail Modals (Keep experience on 1 page without routing away) */}
      <PaperDetailModal
        paper={selectedPaper}
        onClose={() => setSelectedPaper(null)}
      />

      <ResearcherDetailModal
        researcher={selectedResearcher}
        onClose={() => setSelectedResearcher(null)}
        onSelectKeyword={handleSelectKeywordFromFaculty}
      />
    </div>
  );
}
