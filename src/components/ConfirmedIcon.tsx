import { Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

type ConfirmedIconProps = {
  confirmedByName: string | null;
};

export function ConfirmedIcon({ confirmedByName }: ConfirmedIconProps) {
  return (
    <Tooltip
      label={
        <Stack gap={2}>
          <Text size="xs" fw={600}>
            This symbol is not a duplicate.
          </Text>
          {confirmedByName && (
            <Text size="xs" c="dimmed">
              Confirmed by: {confirmedByName}
            </Text>
          )}
        </Stack>
      }
      withArrow
      multiline
      w={220}
      position="top"
    >
      <ThemeIcon
        size="sm"
        radius="xl"
        color="green"
        variant="light"
        style={{ cursor: "help" }}
      >
        <IconInfoCircle size={13} />
      </ThemeIcon>
    </Tooltip>
  );
}
