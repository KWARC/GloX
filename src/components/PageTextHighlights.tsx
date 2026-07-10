import {
  getPageTextHighlightSegments,
  PageTextHighlightMatch,
} from "@/hooks/files/pageTextHighlights";
import { LlmSuggestion } from "@/types/llm.types";
import { Box, Text, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

type PersistentSegment = {
  start: number;
  end: number;
  definition: boolean;
  reference: boolean;
  definitionLabel?: string;
  referenceLabel?: string;
};

type RenderSegment = PersistentSegment & {
  content: string;
  suggestion?: LlmSuggestion;
};

function getLlmSuggestionId(pageId: string, suggestion: LlmSuggestion): string {
  return `llm-suggestion-${pageId}-${suggestion.startOffset}-${suggestion.endOffset}`;
}

function getRenderSegments(
  pageText: string,
  highlights: PageTextHighlightMatch[],
  suggestions: LlmSuggestion[],
): RenderSegment[] {
  const persistentSegments = getPageTextHighlightSegments(pageText, highlights);
  let cursor = 0;
  const persistentRanges = persistentSegments.map((segment) => {
    const start = cursor;
    cursor += segment.content.length;
    return {
      start,
      end: cursor,
      definition: segment.definition,
      reference: segment.reference,
      definitionLabel: segment.definitionLabel,
      referenceLabel: segment.referenceLabel,
    };
  });
  const validSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.startOffset >= 0 &&
      suggestion.endOffset <= pageText.length &&
      suggestion.startOffset < suggestion.endOffset,
  );
  const boundaries = Array.from(
    new Set([
      0,
      pageText.length,
      ...persistentRanges.flatMap((range) => [range.start, range.end]),
      ...validSuggestions.flatMap((suggestion) => [
        suggestion.startOffset,
        suggestion.endOffset,
      ]),
    ]),
  ).sort((a, b) => a - b);

  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const persistent = persistentRanges.find(
      (range) => range.start <= start && range.end >= end,
    );

    return {
      start,
      end,
      content: pageText.slice(start, end),
      definition: persistent?.definition ?? false,
      reference: persistent?.reference ?? false,
      definitionLabel: persistent?.definitionLabel,
      referenceLabel: persistent?.referenceLabel,
      suggestion: validSuggestions.find(
        (suggestion) =>
          suggestion.startOffset <= start && suggestion.endOffset >= end,
      ),
    };
  });
}

function getPersistentBackground(segment: RenderSegment) {
  if (segment.definition && segment.reference) {
    return "linear-gradient(135deg, rgba(147, 197, 253, 0.42) 0 50%, rgba(134, 239, 172, 0.42) 50% 100%)";
  }

  if (segment.definition) return "rgba(147, 197, 253, 0.42)";
  if (segment.reference) return "rgba(134, 239, 172, 0.42)";
  return undefined;
}

function getPersistentTooltipLabel(segment: RenderSegment) {
  return [
    segment.definition ? segment.definitionLabel : undefined,
    segment.reference ? segment.referenceLabel : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

interface PageTextHighlightsProps {
  pageId: string;
  pageText: string;
  highlights: PageTextHighlightMatch[];
  suggestions: LlmSuggestion[];
  focusedSuggestionId?: string | null;
  onSelection: () => void;
  onSuggestionClick?: (suggestion: LlmSuggestion) => void;
}

export function PageTextHighlights({
  pageId,
  pageText,
  highlights,
  suggestions,
  focusedSuggestionId,
  onSelection,
  onSuggestionClick,
}: PageTextHighlightsProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const segments = getRenderSegments(pageText, highlights, suggestions);

  return (
    <Text
      size={isMobile ? "md" : "sm"}
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
      {segments.map((segment) => {
        const suggestionId = segment.suggestion
          ? getLlmSuggestionId(pageId, segment.suggestion)
          : undefined;
        const isFocused = suggestionId === focusedSuggestionId;
        const backgroundColor = segment.suggestion
          ? isFocused
            ? "rgba(234, 179, 8, 0.62)"
            : "rgba(234, 179, 8, 0.25)"
          : getPersistentBackground(segment);
        const content = (
          <Box
            id={suggestionId}
            key={`${segment.start}-${segment.end}`}
            component={backgroundColor ? "mark" : "span"}
            onClick={(event) => {
              if (!segment.suggestion) return;
              event.stopPropagation();
              onSuggestionClick?.(segment.suggestion);
            }}
            style={{
              background: backgroundColor ?? "transparent",
              borderRadius: backgroundColor ? "2px" : undefined,
              boxShadow: isFocused
                ? "0 0 0 2px rgba(202, 138, 4, 0.75)"
                : undefined,
              cursor: segment.suggestion ? "pointer" : "text",
              padding: backgroundColor ? "1px 0" : undefined,
            }}
          >
            {segment.content}
          </Box>
        );

        const persistentTooltipLabel = getPersistentTooltipLabel(segment);

        if (!segment.suggestion) {
          if (!persistentTooltipLabel) return content;

          return (
            <Tooltip
              key={`${segment.start}-${segment.end}`}
              label={persistentTooltipLabel}
              withArrow
              position="top"
            >
              {content}
            </Tooltip>
          );
        }

        return (
          <Tooltip
            key={`${segment.start}-${segment.end}`}
            label={
              <Box>
                <Text size="xs" fw={600}>
                  LLM suggestion
                </Text>
                <Text size={isMobile ? "sm" : "xs"}>{segment.suggestion.label}</Text>
                <Text size={isMobile ? "sm" : "xs"} c="dimmed" mt={2}>
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
            {content}
          </Tooltip>
        );
      })}
    </Text>
  );
}
