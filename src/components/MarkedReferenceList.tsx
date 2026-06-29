import { parseUri } from "@/server/parseUri";
import { Box, Group, Paper, Text } from "@mantine/core";
import { SymbolicLinkPreview } from "./SymbolicLinkPreview";

export type MarkReferenceItem = {
  id: string;
  symbolName: string;
  verbalization: string | null;
};

function getReferenceDisplay(reference: MarkReferenceItem) {
  try {
    const parsed = parseUri(reference.symbolName);
    return {
      uri: reference.symbolName,
      label: parsed.symbol || reference.symbolName,
    };
  } catch {
    return {
      uri: reference.symbolName,
      label: reference.symbolName,
    };
  }
}

export function MarkedReferenceList({
  references,
}: {
  references: MarkReferenceItem[];
}) {
  if (references.length === 0) return null;

  return (
    <Paper
      withBorder
      radius="sm"
      px="xs"
      py={3}
      mt="xs"
      bg="blue.0"
      style={{ borderColor: "var(--mantine-color-blue-2)" }}
    >
      <Group gap="md" wrap="wrap" align="center">
        {references.map((reference) => {
          const display = getReferenceDisplay(reference);

          return (
            <Box
              key={reference.id}
              px={6}
              py={2}
              style={{
                borderRadius: 6,
                background: "var(--mantine-color-white)",
                maxWidth: "100%",
              }}
            >
              <SymbolicLinkPreview
                uri={display.uri}
                label={display.label}
                compact
              />
            </Box>
          );
        })}
      </Group>
    </Paper>
  );
}
