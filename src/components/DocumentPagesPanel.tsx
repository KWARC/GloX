import { PageTextHighlights } from "@/components/PageTextHighlights";
import { PageTextHighlightMatch } from "@/hooks/files/pageTextHighlights";
import { ExtractedItem } from "@/server/text-selection";
import { blockTypeLabel, getTopLevelBlockType } from "@/types/blockType";
import { LlmSuggestion } from "@/types/llm.types";
import {
  Box,
  Button,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { DocumentPage } from "generated/prisma/browser";
import { useEffect, useRef, useState } from "react";
import { MarkReferenceItem, MarkedReferenceList } from "./MarkedReferenceList";
import { PageImage } from "./PageImage";

interface DocumentPagesPanelProps {
  documentId: string;
  pages: DocumentPage[];
  extractsByPageNumber?: Record<number, ExtractedItem[]>;
  persistentHighlightsEnabled?: boolean;
  markReferencesByPage?: Record<string, MarkReferenceItem[]>;
  deletingMarkReferenceId?: string | null;
  onDeleteMarkReference?: (referenceId: string) => Promise<void>;
  onSelection: (pageId: string) => void;
  llmSuggestions?: Record<string, LlmSuggestion[]>;
  llmEnabled?: boolean;
  focusedSuggestionId?: string | null;
  sourcePageTarget?: { pageNumber: number; requestedAt: number } | null;
  onLlmSuggestionClick?: (suggestion: LlmSuggestion, pageId: string) => void;
}

export function DocumentPagesPanel({
  documentId,
  pages,
  extractsByPageNumber = {},
  persistentHighlightsEnabled = true,
  markReferencesByPage = {},
  deletingMarkReferenceId = null,
  onDeleteMarkReference,
  onSelection,
  llmSuggestions,
  llmEnabled = false,
  focusedSuggestionId,
  sourcePageTarget,
  onLlmSuggestionClick,
}: DocumentPagesPanelProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [collapsedPages, setCollapsedPages] = useState<Record<string, boolean>>(
    {},
  );
  const pageRefs = useRef(new Map<number, HTMLDivElement>());

  useEffect(() => {
    const sourcePageNumber = sourcePageTarget?.pageNumber;
    if (sourcePageNumber === undefined) return;

    const page = pages.find((item) => item.pageNumber === sourcePageNumber);
    if (!page) return;

    setCollapsedPages((previous) => ({ ...previous, [page.id]: false }));
    const frame = requestAnimationFrame(() => {
      pageRefs.current
        .get(sourcePageNumber)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => cancelAnimationFrame(frame);
  }, [pages, sourcePageTarget]);

  function togglePage(pageId: string) {
    setCollapsedPages((prev) => ({
      ...prev,
      [pageId]: !prev[pageId],
    }));
  }

  return (
    <Paper withBorder h="100%" radius="md">
      <ScrollArea h="100%">
        <Stack p={isMobile ? "xl" : "lg"} gap={isMobile ? "xl" : "lg"}>
          {pages.map((page) => {
            const isCollapsed = collapsedPages[page.id];
            const pageSuggestions =
              llmEnabled && llmSuggestions
                ? (llmSuggestions[page.id] ?? [])
                : [];
            const pageMarkReferences = markReferencesByPage[page.id] ?? [];
            const pageExtracts = extractsByPageNumber[page.pageNumber] ?? [];
            const hasHighlights = pageSuggestions.length > 0;
            const persistentHighlights: PageTextHighlightMatch[] =
              persistentHighlightsEnabled
                ? [
              ...pageExtracts.map((extract) => ({
                text: extract.originalText,
                source: "extract" as const,
                label: blockTypeLabel(getTopLevelBlockType(extract.statement)),
              })),
              ...pageMarkReferences.map((reference) => ({
                text: reference.verbalization,
                source: "reference" as const,
                label: "Mark reference",
              })),
                  ]
                : [];

            return (
              <Box
                key={page.id}
                ref={(element) => {
                  if (element) pageRefs.current.set(page.pageNumber, element);
                  else pageRefs.current.delete(page.pageNumber);
                }}
              >
                <Group justify="space-between" align="center" mb="xs">
                  <Group gap="xs">
                    <Text size={isMobile ? "sm" : "xs"} fw={700} c="dark" tt="uppercase">
                      Page {page.pageNumber}
                    </Text>

                    {pageExtracts.length > 0 && (
                      <Text
                        size={isMobile ? "xs" : "10px"}
                        c="blue.7"
                        fw={600}
                        style={{
                          backgroundColor: "var(--mantine-color-blue-1)",
                          border: "1px solid var(--mantine-color-blue-3)",
                          borderRadius: 3,
                          padding: "1px 5px",
                        }}
                      >
                        {pageExtracts.length} definition
                        {pageExtracts.length !== 1 ? "s" : ""} extracted
                      </Text>
                    )}

                    {pageMarkReferences.length > 0 && (
                      <Text
                        size={isMobile ? "xs" : "10px"}
                        c="green.7"
                        fw={600}
                        style={{
                          backgroundColor: "var(--mantine-color-green-1)",
                          border: "1px solid var(--mantine-color-green-3)",
                          borderRadius: 3,
                          padding: "1px 5px",
                        }}
                      >
                        {pageMarkReferences.length} marked reference
                        {pageMarkReferences.length !== 1 ? "s" : ""}
                      </Text>
                    )}

                    {hasHighlights && (
                      <Text
                        size={isMobile ? "xs" : "10px"}
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
                    size={isMobile ? "sm" : "xs"}
                    variant="subtle"
                    onClick={() => togglePage(page.id)}
                  >
                    {isCollapsed ? "Show Image" : "Hide Image"}
                  </Button>
                </Group>
                {!isCollapsed && (
                  <Box mt="sm">
                    <PageImage
                      documentId={documentId}
                      pageNumber={page.pageNumber}
                    />
                  </Box>
                )}
                <MarkedReferenceList
                  references={pageMarkReferences}
                  deletingId={deletingMarkReferenceId}
                  onDelete={onDeleteMarkReference}
                />

                <PageTextHighlights
                  pageId={page.id}
                  pageText={page.text}
                  highlights={persistentHighlights}
                  suggestions={pageSuggestions}
                  focusedSuggestionId={focusedSuggestionId}
                  onSelection={() => onSelection(page.id)}
                  onSuggestionClick={(suggestion) =>
                    onLlmSuggestionClick?.(suggestion, page.id)
                  }
                />

                {page.id !== pages[pages.length - 1]?.id && <Divider mt="lg" />}
              </Box>
            );
          })}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
