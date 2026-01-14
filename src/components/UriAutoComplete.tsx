import { searchUriUsingSubstr } from "@/serverFns/searchUriUsingSubstr";
import {
  Combobox,
  InputBase,
  Loader,
  ScrollArea,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";

interface UriAutoCompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function UriAutoComplete({
  value,
  onChange,
  label,
  placeholder,
}: UriAutoCompleteProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [debouncedValue] = useDebouncedValue(value, 300);
  const { data: options = [], isFetching } = useQuery({
    queryKey: ["uri-search", debouncedValue],
    queryFn: () =>
      searchUriUsingSubstr({
        data: { input: debouncedValue },
      }),
    enabled: debouncedValue.length >= 2,
  });

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
          onFocus={() => combobox.openDropdown()}
          onClick={() => combobox.openDropdown()}
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
            {isFetching && options.length === 0 ? (
              <Combobox.Empty>Loading…</Combobox.Empty>
            ) : options.length === 0 ? (
              <Combobox.Empty>No URIs found</Combobox.Empty>
            ) : (
              options.map((option) => (
                <Combobox.Option key={option} value={option}>
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
