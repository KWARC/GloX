import { Box } from "@mantine/core";
import { RenderDbSymbol, RenderSymbolicUri } from "./RenderUri";

type CurrentUriDisplayProps = {
  uri: string;
};

export function CurrentUriDisplay({ uri }: CurrentUriDisplayProps) {
  return (
    <Box
      style={{
        flex: 1,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {uri.startsWith("http") ? (
        <RenderSymbolicUri uri={uri} />
      ) : (
        <RenderDbSymbol
          symbol={{ symbolName: uri, source: "DB", futureRepo: "" }}
        />
      )}
    </Box>
  );
}
