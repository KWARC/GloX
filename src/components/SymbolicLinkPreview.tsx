import { parseUri } from "@/server/parseUri";
import type { FtmlStatement } from "@/types/ftml.types";
import { Box } from "@mantine/core";
import { FtmlPreview } from "./FtmlPreview";

type SymbolicLinkPreviewProps = {
  uri: string;
  label?: string;
};

export function SymbolicLinkPreview({
  uri,
  label,
}: SymbolicLinkPreviewProps) {
  const text = (() => {
    if (label?.trim()) return label.trim();

    try {
      return parseUri(uri).symbol || uri;
    } catch {
      return uri;
    }
  })();

  const statement: FtmlStatement = {
    type: "paragraph",
    content: [
      {
        type: "symref",
        uri,
        content: [text],
      },
    ],
  };

  return (
    <Box style={{ minWidth: 0, overflow: "hidden" }}>
      <FtmlPreview
        docId={`symref-preview-${encodeURIComponent(uri)}`}
        ftmlAst={statement}
      />
    </Box>
  );
}
