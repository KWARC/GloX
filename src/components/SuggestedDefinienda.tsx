import { Badge, Group } from "@mantine/core";

interface SuggestedDefiniendaProps {
  definienda: {
    text: string;
    label: string;
  }[];
}

export function SuggestedDefinienda({
  definienda,
}: SuggestedDefiniendaProps) {
  if (!definienda.length) {
    return null;
  }

  return (
    <Group gap={6} mt="xs">
      {definienda.map((item, index) => (
        <Badge
          key={`${item.text}-${index}`}
          size="xs"
          radius="sm"
          variant="light"
          color="violet"
        >
          {item.text}
        </Badge>
      ))}
    </Group>
  );
}