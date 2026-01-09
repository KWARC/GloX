import { searchUriUsingSubstr } from "@/serverFns/searchUriUsingSubstr";
import {
  Combobox,
  InputBase,
  Loader,
  ScrollArea,
  useCombobox,
} from "@mantine/core";
import { useRef, useState } from "react";

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
  const [allOptions, setAllOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const lastFetchedTextRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const didInitialLoadRef = useRef(false);

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const ensureLoaded = async () => {
    if (!selectedText) return;

    if (lastFetchedTextRef.current !== selectedText) {
      lastFetchedTextRef.current = selectedText;
      setAllOptions([]);
    }

    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);

    try {
      const results = await searchUriUsingSubstr({
        data: { input: selectedText },
      } as any);

      setAllOptions(results ?? []);
      combobox.openDropdown();
    } catch (err) {
      console.error("URI search failed", err);
      setAllOptions([]);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  if (!didInitialLoadRef.current && selectedText) {
    didInitialLoadRef.current = true;
    ensureLoaded();
  }

  const openAndLoad = () => {
    combobox.openDropdown();
    ensureLoaded();
  };

  const filteredOptions = value
    ? allOptions.filter((uri) =>
        uri.toLowerCase().includes(value.toLowerCase())
      )
    : allOptions;

  return (
    <Combobox
      store={combobox}
      withinPortal
      position="bottom"
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
          onFocus={openAndLoad}
          onClick={openAndLoad}
          onChange={(event) => {
            onChange(event.currentTarget.value);
            combobox.openDropdown();
          }}
          rightSection={loading ? <Loader size="xs" /> : <Combobox.Chevron />}
          rightSectionPointerEvents="none"
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          <ScrollArea.Autosize mah={200}>
            {loading ? (
              <Combobox.Empty>Loading…</Combobox.Empty>
            ) : filteredOptions.length === 0 ? (
              <Combobox.Empty>No matching URIs</Combobox.Empty>
            ) : (
              filteredOptions.map((option) => (
                <Combobox.Option value={option} key={option}>
                  {option}
                </Combobox.Option>
              ))
            )}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
