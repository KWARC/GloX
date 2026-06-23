import { parseUri } from "@/server/parseUri";
import type { FtmlStatement } from "@/types/ftml.types";
import { Box } from "@mantine/core";
import { FtmlPreview } from "./FtmlPreview";

type SymbolicLinkPreviewProps = {
  uri: string;
  label?: string;
  compact?: boolean;
};

export function SymbolicLinkPreview({
  uri,
  label,
  compact = false,
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
    <Box
      data-compact-symref={compact ? "true" : undefined}
      style={{
        minWidth: 0,
        overflow: "hidden",
        ...(compact
          ? {
              display: "inline-block",
              verticalAlign: "middle",
            }
          : {}),
      }}
    >
      {compact && (
        <style>{`
          [data-compact-symref="true"] p,
          [data-compact-symref="true"] div {
            margin-top: 0;
            margin-bottom: 0;
            padding-top: 0;
            padding-bottom: 0;
          }
        `}</style>
      )}
      <FtmlPreview
        docId={`symref-preview-${encodeURIComponent(uri)}`}
        ftmlAst={statement}
      />
    </Box>
  );
}
