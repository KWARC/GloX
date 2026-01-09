import { searchUriUsingSubstr } from "@/serverFns/searchUriUsingSubstr";
import {
  Combobox,
  InputBase,
  Loader,
  ScrollArea,
  useCombobox,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

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
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
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
    enabled: !!selectedText,
  });

  const filteredOptions = value
    ? allOptions.filter((uri) =>
        uri.toLowerCase().includes(value.toLowerCase())
      )
    : allOptions;

  if (allOptions.length > 0 && !combobox.dropdownOpened && !value) {
    combobox.openDropdown();
  }

  const openDropdown = () => {
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
            openDropdown();
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
            {isFetching && filteredOptions.length === 0 ? (
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