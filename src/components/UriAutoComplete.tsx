import { Autocomplete, Loader } from "@mantine/core";
import { useEffect, useState } from "react";
import { searchUriUsingSubstr } from "@/serverFns/searchUriUsingSubStr";

interface UriAutoCompleteProps {
  selectedText: string; 
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function UriAutoComplete({
  selectedText,
  value,
  onChange,
  label,
  placeholder,
}: UriAutoCompleteProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedText) {
      setOptions([]);
      return;
    }

    let cancelled = false;

    const runSearch = async () => {
      setLoading(true);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("selectedText", selectedText);
        window.history.replaceState({}, "", url.toString());
        const results = await searchUriUsingSubstr({
          data: {
            input: selectedText,
          }as any,
        });

        if (!cancelled) setOptions(results ?? []);
      } catch (err) {
        console.error("URI search failed", err);
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [selectedText]);
  useEffect(() => {
    console.log("URI AUTOCOMPLETE INPUT =", selectedText);
  }, [selectedText]);
  return (
    <Autocomplete
      data={options}
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      rightSection={loading ? <Loader size="xs" /> : null}
      maxDropdownHeight={240}
    />
  );
}
