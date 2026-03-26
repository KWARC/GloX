import { Button, Group, TextInput } from "@mantine/core";

type SearchBarProps = {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;
};

export function SearchBar({ value, onChange, onSearch }: SearchBarProps) {
  return (
    <Group>
      <TextInput
        placeholder="Search "
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        style={{ flex: 1 }}
      />
      <Button size="xs" onClick={onSearch}>
        Search
      </Button>
    </Group>
  );
}
