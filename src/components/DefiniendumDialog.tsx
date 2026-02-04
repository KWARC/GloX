import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Paper,
  Portal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";

interface DefiniendumDialogProps {
  opened: boolean;
  extractedText: string | null;
  onSubmit: (params: {
    symbolName: string;
    alias: string;
    symdecl: boolean;
  }) => void;
  onClose: () => void;
}

export function DefiniendumDialog({
  opened,
  extractedText,
  onSubmit,
  onClose,
}: DefiniendumDialogProps) {
  const form = useForm({
    defaultValues: {
      symbolName: extractedText ?? "",
      alias: "",
      symdecl: false,
    },
    onSubmit: ({ value }) => {
      onSubmit({
        symbolName: value.symbolName.trim(),
        alias: value.alias.trim(),
        symdecl: value.symdecl,
      });
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset({
        symbolName: extractedText ?? "",
        alias: "",
        symdecl: false,
      });
    }
  }, [opened, extractedText]);

  if (!opened) return null;

  return (
    <Portal>
      <Paper
        withBorder
        shadow="xl"
        p="lg"
        radius="md"
        style={{
          position: "fixed",
          right: 60,
          top: 100,
          width: 420,
          zIndex: 5000,
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={600}>Definiendum</Text>
              <ActionIcon
                variant="subtle"
                onClick={() => {
                  form.reset();
                  onClose();
                }}
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>

            <form.Field
              name="symbolName"
              validators={{
                onChange: ({ value }) =>
                  !value.trim() ? "Symbol name required" : undefined,
              }}
            >
              {(field) => (
                <TextInput
                  label="Symbol name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  error={field.state.meta.errors?.[0]}
                  autoFocus
                />
              )}
            </form.Field>

            <form.Field name="alias">
              {(field) => (
                <Textarea
                  label="Alias"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.value)}
                  autosize
                  minRows={2}
                />
              )}
            </form.Field>

            <form.Field name="symdecl">
              {(field) => (
                <Checkbox
                  label="Symbol needs declaration (symdecl)"
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.currentTarget.checked)}
                />
              )}
            </form.Field>

            <Button
              type="submit"
              leftSection={<IconCheck size={16} />}
              fullWidth
            >
              Save Definiendum
            </Button>
          </Stack>
        </form>
      </Paper>
    </Portal>
  );
}
