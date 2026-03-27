import { Box } from "@mantine/core";
import { RenderDbSymbol, RenderSymbolicUri } from "./RenderUri";

type CurrentUriDisplayProps = {
  uri: string;
};

export function CurrentUriDisplay({ uri }: CurrentUriDisplayProps) {
  return (
    <Box
      style={{
        maxWidth: 300,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
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
