"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@repo/ui/components/ui/combobox";
import { researchApi } from "../../lib/research-api";

interface DepartmentFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function DepartmentFilter({
  value,
  onChange,
}: DepartmentFilterProps): React.JSX.Element {
  const departmentsQuery = useQuery({
    queryKey: ["researcher-departments"],
    queryFn: () => researchApi.getResearcherDepartments(),
    staleTime: 5 * 60_000,
  });

  const departments = departmentsQuery.data ?? [];

  return (
    <div className="department-filter">
      <Combobox
        items={departments}
        value={value || null}
        onValueChange={(department) => onChange(department ?? "")}
        autoHighlight
      >
        <ComboboxInput
          className="department-combobox-input"
          aria-label="Filter by department"
          placeholder={
            departmentsQuery.isPending
              ? "Loading departments..."
              : "Select a department"
          }
          disabled={departmentsQuery.isPending}
          showClear
        />
        <ComboboxContent className="department-combobox-content">
          <ComboboxEmpty>
            {departmentsQuery.isError
              ? "Couldn't load departments."
              : "No department found."}
          </ComboboxEmpty>
          <ComboboxList>
            {(department) => (
              <ComboboxItem key={department} value={department}>
                {department}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
