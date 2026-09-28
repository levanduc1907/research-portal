"use client";

import { Search } from "lucide-react";

interface ResearcherSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ResearcherSearch({
  value,
  onChange,
}: ResearcherSearchProps): React.JSX.Element {
  return (
    <div className="researcher-search">
      <Search className="researcher-search-icon" aria-hidden="true" />
      <input
        className="researcher-search-input"
        type="search"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Search researchers by name, topic, or keyword"
        placeholder="Search names, topics, or keywords"
      />
    </div>
  );
}
