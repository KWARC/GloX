import { SymbolSearchResult } from "@/server/useSymbolSearch";
import {
  ActionIcon,
  Button,
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
import { useEffect, useState } from "react";
import { SymbolResult } from "./SymbolResult";

type DefiniendumMode = "CREATE" | "PICK_EXISTING";

interface DefiniendumDialogProps {
  opened: boolean;
  extractedText: string | null;
  onSubmit: (
    params:
      | { mode: "CREATE"; symbolName: string; alias: string; symdecl: true }
      | { mode: "PICK_EXISTING"; selectedSymbol: SymbolSearchResult },
  ) => void;
  onClose: () => void;
}

export function DefiniendumDialog({
  opened,
  extractedText,
  onSubmit,
  onClose,
}: DefiniendumDialogProps) {
  const [mode, setMode] = useState<DefiniendumMode>("CREATE");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] =
    useState<SymbolSearchResult | null>(null);

  const form = useForm({
    defaultValues: {
      symbolName: extractedText ?? "",
      alias: "",
      symdecl: true,
    },
    onSubmit: ({ value }) => {
      if (mode === "CREATE") {
        onSubmit({
          mode: "CREATE",
          symbolName: value.symbolName.trim(),
          alias: value.alias.trim(),
          symdecl: true,
        });
      }
    },
  });

  useEffect(() => {
    if (opened) {
      setMode("CREATE");
      setSearchQuery(extractedText ?? "");
      setSelectedSymbol(null);
      form.reset({
        symbolName: extractedText ?? "",
        alias: "",
        symdecl: true,
      });
    }
  }, [opened, extractedText]);

  const handlePickExisting = () => {
    if (!selectedSymbol) return;
    onSubmit({
      mode: "PICK_EXISTING",
      selectedSymbol,
    });
  };

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
          maxHeight: "calc(100vh - 120px)",
          overflowY: "auto",
          zIndex: 5000,
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

          <Paper withBorder p="sm" bg="blue.0" radius="md">
            <Text size="xs" fw={600} c="dimmed" mb={4}>
              Selected Text:
            </Text>
            <Text size="sm" fw={500}>
              {extractedText}
            </Text>
          </Paper>

          <Group gap="xs">
            <Button
              size="xs"
              variant={mode === "CREATE" ? "filled" : "light"}
              onClick={() => setMode("CREATE")}
            >
              Create New Symbol
            </Button>
            <Button
              size="xs"
              variant={mode === "PICK_EXISTING" ? "filled" : "light"}
              onClick={() => setMode("PICK_EXISTING")}
            >
              Link to Existing
            </Button>
          </Group>

          {mode === "CREATE" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
            >
              <Stack gap="sm">
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
                      onChange={(e) =>
                        field.handleChange(e.currentTarget.value)
                      }
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
                      onChange={(e) =>
                        field.handleChange(e.currentTarget.value)
                      }
                      autosize
                      minRows={2}
                    />
                  )}
                </form.Field>

                <Button
                  type="submit"
                  leftSection={<IconCheck size={16} />}
                  fullWidth
                >
                  Create & Insert Definiendum
                </Button>
              </Stack>
            </form>
          )}

          {mode === "PICK_EXISTING" && (
            <Stack gap="sm">
              <SymbolResult
                initialQuery={searchQuery}
                onQueryChange={setSearchQuery}
                selectedSymbol={selectedSymbol}
                onSelectSymbol={setSelectedSymbol}
              />

              {selectedSymbol && (
                <Paper withBorder p="sm" bg="green.0" radius="md">
                  <Text size="xs" fw={600} c="dimmed" mb={4}>
                    Selected Symbol:
                  </Text>
                  <Text size="xs" ff="monospace">
                    {selectedSymbol.source === "DB"
                      ? selectedSymbol.symbolName
                      : selectedSymbol.uri}
                  </Text>
                </Paper>
              )}

              <Paper withBorder p="sm" bg="blue.0">
                <Text size="xs" c="dimmed">
                  Linking to an existing symbol does NOT declare it.
                </Text>
              </Paper>

              <Button
                onClick={handlePickExisting}
                disabled={!selectedSymbol}
                fullWidth
                leftSection={<IconCheck size={16} />}
              >
                Link & Insert Definiendum
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Portal>
  );
}
