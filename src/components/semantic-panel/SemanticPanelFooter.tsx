import { Box, Button, Group } from "@mantine/core";

export type SemanticPanelFooterProps = {
  onClose: () => void;
};

export function SemanticPanelFooter({ onClose }: SemanticPanelFooterProps) {
  return (
    <Box
      pt="sm"
      mt="sm"
      style={{
        borderTop: "1px solid var(--mantine-color-gray-3)",
        background: "white",
      }}
    >
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onClose}>Close</Button>
      </Group>
    </Box>
  );
}
