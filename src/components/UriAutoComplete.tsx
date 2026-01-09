import { searchUriUsingSubstr } from "@/serverFns/searchUriUsingSubstr";
import {
  Combobox,
  InputBase,
  Loader,
  ScrollArea,
  useCombobox,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

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
  const [opened, setOpened] = useState(false);

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setOpened(false);
    },
  });

  const {
    data: allOptions = [],
    isFetching,
  } = useQuery({
    queryKey: ["uri-search", selectedText],
    queryFn: () =>
      searchUriUsingSubstr({
        data: { input: selectedText },
      } as any),
    enabled: !!selectedText && opened,
  });

  const filteredOptions = value
    ? allOptions.filter((uri) =>
        uri.toLowerCase().includes(value.toLowerCase())
      )
    : allOptions;

  const openDropdown = () => {
    setOpened(true);
    combobox.openDropdown();
  };

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
          onFocus={openDropdown}
          onClick={openDropdown}
          onChange={(event) => {
            onChange(event.currentTarget.value);
            combobox.openDropdown();
          }}
          rightSection={
            isFetching ? <Loader size="xs" /> : <Combobox.Chevron />
          }
          rightSectionPointerEvents="none"
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          <ScrollArea.Autosize mah={200}>
            {isFetching ? (
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
