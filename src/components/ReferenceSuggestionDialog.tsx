import type { SuggestedRef } from "@/server/symbolic-suggestions";
import {
  Badge,
  Button,
  Group,
  Mark,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useEffect, useState } from "react";

type Props = {
  opened: boolean;
  onClose: () => void;
  definitionId: string;
  definitionText: string;
  suggestions: SuggestedRef[];
  onAccept: (s: SuggestedRef) => Promise<void>;
};

function getContext(text: string, s: SuggestedRef) {
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
  definitionText,
  suggestions,
  onAccept,
}: Props) {
  const [index, setIndex] = useState(0);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (opened) setIndex(0);
  }, [opened, definitionId]);

  const current = suggestions[index];

  useEffect(() => {
    if (opened && index >= suggestions.length) onClose();
  }, [index, onClose, opened, suggestions.length]);

  async function handleAccept() {
    if (!current) return;
    setAccepting(true);
    try {
      await onAccept(current);
      setIndex((v) => v + 1);
    } finally {
      setAccepting(false);
    }
  }

  function handleSkip() {
    setIndex((v) => v + 1);
  }

  const context = current ? getContext(definitionText, current) : null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Text fw={600}>Reference Suggestion</Text>
          <Badge size="sm" variant="light">
            {Math.min(index + 1, suggestions.length)} / {suggestions.length}
          </Badge>
        </Group>
      }
      size="lg"
      centered
      padding="lg"
      radius="md"
    >
      {!current || !context ? (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            No reference suggestions found.
          </Text>
          <Group justify="flex-end">
            <Button onClick={onClose}>Done</Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="md">
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
            <Group justify="space-between" align="flex-start">
              <Stack gap={2}>
                <Text size="xs" c="dimmed" fw={600}>
                  Match
                </Text>
                <Text size="sm">{current.text}</Text>
              </Stack>
              <Stack gap={2} align="flex-end">
                <Text size="xs" c="dimmed" fw={600}>
                  Target
                </Text>
                <Text size="sm" fw={600}>
                  {current.targetName}
                </Text>
              </Stack>
            </Group>
          </Paper>

          <Group justify="space-between">
            <Button variant="subtle" color="gray" onClick={handleSkip}>
              Skip
            </Button>
            <Button onClick={handleAccept} loading={accepting}>
              Accept
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
