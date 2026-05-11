import type {
  SuggestedReference,
  SuggestedReferenceCandidate,
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
} from "@mantine/core";
import { useEffect, useState } from "react";
import { FtmlPreview } from "./FtmlPreview";
import { RenderSymbolicUri } from "./RenderUri";

type Props = {
  opened: boolean;
  onClose: () => void;
  definitionId: string;
  definitionStatement: FtmlStatement | null;
  definitionText: string;
  suggestions: SuggestedReference[];
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
  onAccept,
}: Props) {
  const [index, setIndex] = useState(0);
  const [selectedCandidate, setSelectedCandidate] =
    useState<SuggestedReferenceCandidate | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setIndex(0);
      setSelectedCandidate(null);
      setError(null);
    }
  }, [opened, definitionId]);

  const current = suggestions[index];

  async function handleAccept() {
    if (!current || !selectedCandidate) return;
    setAccepting(true);
    setError(null);
    try {
      await onAccept(current, selectedCandidate);
      setSelectedCandidate(null);
      setIndex((v) => v + 1);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not insert reference.";
      setError(message);
    } finally {
      setAccepting(false);
    }
  }

  function handleSkip() {
    setSelectedCandidate(null);
    setError(null);
    setIndex((v) => v + 1);
  }

  function handleRestart() {
    setIndex(0);
    setSelectedCandidate(null);
    setError(null);
  }

  const context = current ? getContext(definitionText, current) : null;
  const complete = index >= suggestions.length;

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
    >
      {complete || !current || !context ? (
        <Stack gap="md">
          <Text size="sm" fw={600}>
            All suggestions reviewed
          </Text>
          <Group justify="flex-end">
            {suggestions.length > 0 && (
              <Button variant="subtle" color="gray" onClick={handleRestart}>
                Review Again
              </Button>
            )}
            <Button onClick={onClose}>Close</Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="md">
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

          <Paper withBorder p="sm" radius="md">
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

              <Stack gap={6}>
                <Text size="xs" c="dimmed" fw={600}>
                  Targets
                </Text>

                {current.candidates.map((candidate) => {
                  const selected = selectedCandidate === candidate;
                  return (
                    <Paper
                      key={`${candidate.source}-${candidate.definitionId ?? candidate.uri}-${candidate.label}`}
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
                        <Badge
                          size="xs"
                          color={candidate.source === "DB" ? "green" : "blue"}
                        >
                          {candidate.source}
                        </Badge>
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>

              {selectedCandidate?.source === "MATHHUB" &&
                selectedCandidate.uri && (
                  <Box h={160}>
                    <iframe
                      src={selectedCandidate.uri.replace("http:", "https:")}
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
            </Stack>
          </Paper>

          <Stack gap={6}>
            {error && (
              <Text size="xs" c="red">
                {error}
              </Text>
            )}
            <Group justify="space-between">
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
          </Stack>
        </Stack>
      )}
    </Modal>
  );
}
