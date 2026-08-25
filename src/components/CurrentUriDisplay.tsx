import { Box, Group } from "@mantine/core";
import { RenderSymbolicUri } from "./RenderUri";
import { SymbolicLinkPreview } from "./SymbolicLinkPreview";

type CurrentUriDisplayProps = {
  uri: string;
  label?: string;
};

export function CurrentUriDisplay({ uri, label }: CurrentUriDisplayProps) {
  return (
    <Box
      style={{
        flex: 1,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <Group gap={2} wrap="nowrap">
        <RenderSymbolicUri uri={uri} showRightLabel={false} />
        <SymbolicLinkPreview uri={uri} label={label} compact />
      </Group>
    </Box>
  );
}
