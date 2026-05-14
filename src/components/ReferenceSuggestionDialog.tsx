import type {
  CatalogEntry,
  SuggestedReference,
  SuggestedReferenceCandidate,
} from "@/server/symbolic-suggestions";
import {
  getSuggestedReferenceCandidateKey,
  searchReferenceCandidates,
} from "@/server/symbolic-suggestions";
import type { FtmlStatement } from "@/types/ftml.types";
import {
  Badge,
  Box,
  Button,
  Group,
  Mark,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { FtmlPreview } from "./FtmlPreview";
import { RenderSymbolicUri } from "./RenderUri";

type Props = {
  opened: boolean;
  onClose: () => void;
  definitionId: string;
  definitionStatement: FtmlStatement | null;
  definitionText: string;
  suggestions: SuggestedReference[];
  catalog: CatalogEntry[];
  onAccept: (
    s: SuggestedReference,
    candidate: SuggestedReferenceCandidate,
  ) => Promise<void>;
};

function getContext(text: string, s: SuggestedReference) {
  const w = 80;
  const pre = text.slice(
    Math.max(0, s.plainStartOffset - w),
    s.plainStartOffset,
  );
  const mid = text.slice(s.plainStartOffset, s.plainEndOffset);
  const post = text.slice(s.plainEndOffset, s.plainEndOffset + w);
  return { pre, mid, post };
}

export function ReferenceSuggestionDialog({
  opened,
  onClose,
  definitionId,
  definitionStatement,
  definitionText,
  suggestions,
  catalog,
  onAccept,
}: Props) {
  const [index, setIndex] = useState(0);
  const [selectedCandidate, setSelectedCandidate] =
    useState<SuggestedReferenceCandidate | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebouncedValue(searchQuery, 150);

  useEffect(() => {
    if (opened) {
      setIndex(0);
      setSelectedCandidate(null);
      setError(null);
      setSearchQuery("");
    }
  }, [opened, definitionId]);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, suggestions.length - 1)));
    setSelectedCandidate(null);
    setError(null);
    setSearchQuery("");
  }, [suggestions]);

  const current = suggestions[index];
  const sniffyCandidateKeys = useMemo(
    () =>
      new Set(
        (current?.candidates ?? []).map((candidate) =>
          getSuggestedReferenceCandidateKey(candidate),
        ),
      ),
    [current],
  );
  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return [];

    return searchReferenceCandidates(
      debouncedSearchQuery,
      catalog,
      definitionId,
    ).filter(
      (candidate) =>
        !sniffyCandidateKeys.has(getSuggestedReferenceCandidateKey(candidate)),
    );
  }, [catalog, debouncedSearchQuery, definitionId, sniffyCandidateKeys]);

  function resetPerSuggestionState() {
    setSelectedCandidate(null);
    setError(null);
    setSearchQuery("");
  }

  function goPrevious() {
    resetPerSuggestionState();
    setIndex((v) => Math.max(0, v - 1));
  }

  function goNext() {
    resetPerSuggestionState();
    setIndex((v) => Math.min(suggestions.length, v + 1));
  }

  function goToLastSuggestion() {
    resetPerSuggestionState();
    setIndex(Math.max(0, suggestions.length - 1));
  }

  async function handleAccept() {
    if (!current || !selectedCandidate) return;
    setAccepting(true);
    setError(null);
    try {
      await onAccept(current, selectedCandidate);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not insert reference.";
      setError(message);
    } finally {
      setAccepting(false);
    }
  }

  function handleSkip() {
    goNext();
  }

  function handleRestart() {
    setIndex(0);
    resetPerSuggestionState();
  }

  const context = current ? getContext(definitionText, current) : null;
  const complete = index >= suggestions.length;
  const selectedCandidateKey = selectedCandidate
    ? getSuggestedReferenceCandidateKey(selectedCandidate)
    : null;

  function renderCandidate(candidate: SuggestedReferenceCandidate) {
    const candidateKey = getSuggestedReferenceCandidateKey(candidate);
    const selected = selectedCandidateKey === candidateKey;

    return (
      <Paper
        key={candidateKey}
        withBorder
        p="xs"
        radius="sm"
        bg={selected ? "blue.0" : undefined}
        style={{ cursor: "pointer" }}
        onClick={() => {
          setSelectedCandidate(candidate);
          setError(null);
        }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={1}>
            <Text size="sm" fw={selected ? 600 : 500}>
              {candidate.label}
            </Text>
            {candidate.source === "MATHHUB" && candidate.uri ? (
              <RenderSymbolicUri uri={candidate.uri} />
            ) : candidate.path ? (
              <Text size="xs" c="dimmed">
                {candidate.path}
              </Text>
            ) : null}
          </Stack>
          <Badge size="xs" color={candidate.source === "DB" ? "green" : "blue"}>
            {candidate.source}
          </Badge>
        </Group>
        {selected && candidate.source === "MATHHUB" && candidate.uri && (
          <Box h={160} mt="xs">
            <iframe
              src={candidate.uri.replace("http:", "https:")}
              sandbox="allow-scripts allow-same-origin"
              title="MathHub content preview"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          </Box>
        )}
      </Paper>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={600}>
          {complete || !current
            ? "All suggestions reviewed"
            : `Suggestion ${index + 1} of ${suggestions.length}`}
        </Text>
      }
      size="lg"
      centered
      padding="lg"
      radius="md"
      styles={{ body: { overflow: "hidden" } }}
    >
      {complete || !current || !context ? (
        <Stack gap="md">
          <Text size="sm" fw={600}>
            All suggestions reviewed
          </Text>
          <Group justify="space-between">
            <Button
              variant="subtle"
              color="gray"
              onClick={goToLastSuggestion}
              disabled={suggestions.length === 0}
            >
              Previous
            </Button>
            <Group justify="flex-end">
              {suggestions.length > 0 && (
                <Button variant="subtle" color="gray" onClick={handleRestart}>
                  Review Again
                </Button>
              )}
              <Button onClick={onClose}>Close</Button>
            </Group>
          </Group>
        </Stack>
      ) : (
        <Box
          style={{
            display: "flex",
            flexDirection: "column",
            maxHeight: "calc(100dvh - 160px)",
            minHeight: 0,
          }}
        >
          <Stack gap="md" style={{ flex: "0 0 auto" }}>
            {definitionStatement && (
              <Paper withBorder p="sm" radius="md">
                <Text size="xs" c="dimmed" fw={600} mb={6}>
                  Definition
                </Text>
                <Box mah={180} style={{ overflow: "auto" }}>
                  <FtmlPreview
                    ftmlAst={definitionStatement}
                    docId={definitionId}
                  />
                </Box>
              </Paper>
            )}

            <Paper withBorder p="sm" radius="md" bg="gray.0">
              <Text size="xs" c="dimmed" fw={600} mb={6}>
                Context
              </Text>
              <Text size="sm" lh={1.7}>
                {context.pre}
                <Mark>{context.mid}</Mark>
                {context.post}
              </Text>
            </Paper>
          </Stack>

          <Paper
            withBorder
            p="sm"
            radius="md"
            mt="md"
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
            }}
          >
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start">
                <Stack gap={2}>
                  <Text size="xs" c="dimmed" fw={600}>
                    Match
                  </Text>
                  <Text size="sm">{current.text}</Text>
                </Stack>
                <Text size="xs" c="dimmed" fw={600}>
                  {current.candidates.length} candidates
                </Text>
              </Group>

              <TextInput
                placeholder="Search symbolic target"
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
              />

              <Stack gap="sm">
                <Stack gap={6}>
                  <Text size="xs" c="dimmed" fw={600}>
                    Sniffy candidates
                  </Text>

                  {current.candidates.map(renderCandidate)}
                </Stack>

                {searchQuery.trim() && (
                  <Stack gap={6}>
                    <Text size="xs" c="dimmed" fw={600}>
                      Search results
                    </Text>

                    {searchResults.length > 0 ? (
                      searchResults.map(renderCandidate)
                    ) : (
                      <Text size="xs" c="dimmed">
                        No matching symbolic targets
                      </Text>
                    )}
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Paper>

          <Stack gap={6} mt="md" style={{ flex: "0 0 auto" }}>
            {error && (
              <Text size="xs" c="red">
                {error}
              </Text>
            )}
            <Group justify="space-between">
              <Group gap="xs">
                <Button
                  variant="subtle"
                  color="gray"
                  onClick={goPrevious}
                  disabled={index === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="subtle"
                  color="gray"
                  onClick={goNext}
                  disabled={index >= suggestions.length - 1}
                >
                  Next
                </Button>
              </Group>
              <Group gap="xs">
                <Button variant="subtle" color="gray" onClick={handleSkip}>
                  Skip
                </Button>
                <Button
                  onClick={handleAccept}
                  loading={accepting}
                  disabled={!selectedCandidate}
                >
                  Accept
                </Button>
              </Group>
            </Group>
          </Stack>
        </Box>
      )}
    </Modal>
  );
}
