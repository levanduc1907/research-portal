"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@repo/ui/components/ui/combobox";
import { useEffect, useMemo, useState } from "react";
import { researchApi } from "../../lib/research-api";

const DEPARTMENT_SEARCH_DEBOUNCE_MS = 300;

interface DepartmentFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function DepartmentFilter({
  value,
  onChange,
}: DepartmentFilterProps): React.JSX.Element {
  const [inputValue, setInputValue] = useState(value);
  const [debouncedInputValue, setDebouncedInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedInputValue(inputValue.trim()),
      DEPARTMENT_SEARCH_DEBOUNCE_MS,
    );

    return () => window.clearTimeout(timer);
  }, [inputValue]);

  const departmentsQuery = useQuery({
    queryKey: ["researcher-departments", debouncedInputValue],
    queryFn: ({ signal }) =>
      researchApi.getResearcherDepartments(debouncedInputValue, signal),
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: false,
  });

  const departments = departmentsQuery.data ?? [];
  const visibleDepartments = useMemo(() => {
    const normalizedInput = inputValue.trim().toLocaleLowerCase();
    if (!normalizedInput) return departments;

    return departments.filter((department) =>
      department.toLocaleLowerCase().includes(normalizedInput),
    );
  }, [departments, inputValue]);

  return (
    <div className="department-filter">
      <Combobox
        items={departments}
        filteredItems={visibleDepartments}
        value={value || null}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        onValueChange={(department) => {
          const nextDepartment = department ?? "";
          setInputValue(nextDepartment);
          onChange(nextDepartment);
        }}
        openOnInputClick
        autoHighlight
      >
        <ComboboxInput
          className="department-combobox-input"
          aria-label="Filter by department"
          aria-busy={departmentsQuery.isFetching}
          placeholder="Select a department"
          showClear
        />
        <ComboboxContent className="department-combobox-content">
          <ComboboxEmpty>
            {departmentsQuery.isFetching
              ? "Searching departments..."
              : departmentsQuery.isError
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
