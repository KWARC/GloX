import { Combobox, InputBase, Loader, ScrollArea, useCombobox } from "@mantine/core";
import { useEffect, useState } from "react";
import { searchUriUsingSubstr } from "@/serverFns/searchUriUsingSubstr";

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
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

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

        if (!cancelled) {
          setOptions(results ?? []);
          combobox.openDropdown();
        }
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

  const comboboxOptions = options.map((option) => (
    <Combobox.Option value={option} key={option}>
      {option}
    </Combobox.Option>
  ));
  
  return (
    <Combobox
      store={combobox}
      withinPortal
      position="bottom"
      middlewares={{ flip: true, shift: true }}
      zIndex={5000}
      onOptionSubmit={(val) => {
        onChange(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          label={label}
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            onChange(event.currentTarget.value);
            combobox.openDropdown();
          }}
          onClick={() => combobox.toggleDropdown()}
          onFocus={() => combobox.openDropdown()}
          rightSection={loading ? <Loader size="xs" /> : <Combobox.Chevron />}
          rightSectionPointerEvents="none"
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          <ScrollArea.Autosize mah={200} type="scroll">
            {loading ? (
              <Combobox.Empty>Loading...</Combobox.Empty>
            ) : options.length === 0 ? (
              <Combobox.Empty>No URIs found</Combobox.Empty>
            ) : (
              comboboxOptions
            )}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}