import {
  Box,
  Button,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { LlmSuggestion } from "@/types/llm.types";
import { useState } from "react";
import { PageImage } from "./PageImage";

type TextSegment =
  | { kind: "plain"; content: string }
  | { kind: "highlight"; content: string; suggestion: LlmSuggestion };

function buildSegments(
  pageText: string,
  suggestions: LlmSuggestion[],
): TextSegment[] {
  const valid = suggestions
    .map((s) => ({
      ...s,
      text: pageText.slice(s.startOffset, s.endOffset),
    }))
    .sort((a, b) =>
      a.startOffset !== b.startOffset
        ? a.startOffset - b.startOffset
        : b.endOffset - a.endOffset,
    );

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const s of valid) {
    if (s.startOffset < cursor) continue;

    if (s.startOffset > cursor) {
      segments.push({
        kind: "plain",
        content: pageText.slice(cursor, s.startOffset),
      });
    }

    segments.push({ kind: "highlight", content: s.text, suggestion: s });
    cursor = s.endOffset;
  }

  if (cursor < pageText.length) {
    segments.push({ kind: "plain", content: pageText.slice(cursor) });
  }

  return segments;
}

interface HighlightedPageTextProps {
  pageText: string;
  suggestions: LlmSuggestion[];
  onSelection: () => void;
  onSuggestionClick: (suggestion: LlmSuggestion) => void;
}

function HighlightedPageText({
  pageText,
  suggestions,
  onSelection,
  onSuggestionClick,
}: HighlightedPageTextProps) {
  const segments = buildSegments(pageText, suggestions);

  return (
    <Text
      size="sm"
      lh={1.8}
      mt="sm"
      component="span"
      style={{
        whiteSpace: "pre-wrap",
        userSelect: "text",
        cursor: "text",
        display: "block",
      }}
      onMouseUp={onSelection}
    >
      {segments.map((seg, i) => {
        if (seg.kind === "plain") {
          return <span key={i}>{seg.content}</span>;
        }

        return (
          <Tooltip
            key={i}
            label={
              <Box>
                <Text size="xs" fw={600}>
                  LLM suggestion
                </Text>
                <Text size="xs">{seg.suggestion.label}</Text>
                <Text size="xs" c="dimmed" mt={2}>
                  Click to open Extract dialog
                </Text>
              </Box>
            }
            withArrow
            multiline
            maw={260}
            position="top"
            zIndex={5000}
          >
            <Box
              component="mark"
              onClick={(e) => {
                e.stopPropagation();
                onSuggestionClick(seg.suggestion);
              }}
              style={{
                backgroundColor: "rgba(234, 179, 8, 0.25)",
                borderBottom: "2px solid #ca8a04",
                borderRadius: "2px",
                cursor: "pointer",
                padding: "1px 0",
                transition: "background-color 100ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "rgba(234, 179, 8, 0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "rgba(234, 179, 8, 0.25)";
              }}
            >
              {seg.content}
            </Box>
          </Tooltip>
        );
      })}
    </Text>
  );
}

interface DocumentPagesPanelProps {
  documentId: string;
  pages: DocumentPage[];
  onSelection: (pageId: string) => void;
  llmSuggestions?: Record<string, LlmSuggestion[]>;
  llmEnabled?: boolean;
  onLlmSuggestionClick?: (suggestion: LlmSuggestion, pageId: string) => void;
}

export function DocumentPagesPanel({
  documentId,
  pages,
  onSelection,
  llmSuggestions,
  llmEnabled = false,
  onLlmSuggestionClick,
}: DocumentPagesPanelProps) {
  const [collapsedPages, setCollapsedPages] = useState<Record<string, boolean>>(
    {},
  );

  function togglePage(pageId: string) {
    setCollapsedPages((prev) => ({
      ...prev,
      [pageId]: !prev[pageId],
    }));
  }

  return (
    <Paper withBorder h="100%" radius="md">
      <ScrollArea h="100%">
        <Stack p="lg" gap="lg">
          {pages.map((page) => {
            const isCollapsed = collapsedPages[page.id];
            const pageSuggestions =
              llmEnabled && llmSuggestions
                ? (llmSuggestions[page.id] ?? [])
                : [];
            const hasHighlights = pageSuggestions.length > 0;

            return (
              <Box key={page.id}>
                <Group justify="space-between" align="center" mb="xs">
                  <Group gap="xs">
                    <Text size="xs" fw={700} c="dark" tt="uppercase">
                      Page {page.pageNumber}
                    </Text>
                    {hasHighlights && (
                      <Text
                        size="10px"
                        c="yellow.7"
                        fw={600}
                        style={{
                          backgroundColor: "var(--mantine-color-yellow-1)",
                          border: "1px solid var(--mantine-color-yellow-4)",
                          borderRadius: 3,
                          padding: "1px 5px",
                        }}
                      >
                        {pageSuggestions.length} suggestion
                        {pageSuggestions.length !== 1 ? "s" : ""}
                      </Text>
                    )}
                  </Group>

                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => togglePage(page.id)}
                  >
                    {isCollapsed ? "Show Image" : "Hide Image"}
                  </Button>
                </Group>

                {hasHighlights ? (
                  <HighlightedPageText
                    pageText={page.text}
                    suggestions={pageSuggestions}
                    onSelection={() => onSelection(page.id)}
                    onSuggestionClick={(s) =>
                      onLlmSuggestionClick?.(s, page.id)
                    }
                  />
                ) : (
                  <Text
                    size="sm"
                    lh={1.8}
                    mt="sm"
                    style={{
                      whiteSpace: "pre-wrap",
                      userSelect: "text",
                      cursor: "text",
                    }}
                    onMouseUp={() => onSelection(page.id)}
                  >
                    {page.text}
                  </Text>
                )}

                {!isCollapsed && (
                  <Box mt="sm">
                    <PageImage
                      documentId={documentId}
                      pageNumber={page.pageNumber}
                    />
                  </Box>
                )}

                {page.id !== pages[pages.length - 1]?.id && <Divider mt="lg" />}
              </Box>
            );
          })}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
