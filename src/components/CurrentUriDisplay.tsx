import { Box, Stack } from "@mantine/core";
import { RenderDbSymbol, RenderSymbolicUri } from "./RenderUri";
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
      {uri.startsWith("http") ? (
        <Stack gap={2}>
          <RenderSymbolicUri uri={uri} showRightLabel={false} />
          <SymbolicLinkPreview uri={uri} label={label} />
        </Stack>
      ) : (
        <RenderDbSymbol
          symbol={{ symbolName: uri, source: "DB", futureRepo: "" }}
        />
      )}
    </Box>
  );
}
