import { SymbolSearchResult } from "@/server/useSymbolSearch";
import {
  ActionIcon,
  Box,
  Button,
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
import { RenderDbSymbol, RenderSymbolicUri } from "./RenderUri";
import { SymbolResult } from "./SymbolResult";

type DefiniendumMode = "CREATE" | "PICK_EXISTING";

interface DefiniendumDialogProps {
  opened: boolean;
  extractedText: string | null;
  onSubmit: (
    params:
      | {
          mode: "CREATE";
          symbolName: string;
          verbalization: string;
          symdecl: true;
        }
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
  const [mode, setMode] = useState<DefiniendumMode>("PICK_EXISTING");
  const [searchQuery, setSearchQuery] = useState(extractedText ?? "");
  const [selectedSymbol, setSelectedSymbol] =
    useState<SymbolSearchResult | null>(null);

  const form = useForm({
    defaultValues: {
      symbolName: extractedText ?? "",
      verbalization: extractedText ?? "",
      symdecl: true,
    },
    onSubmit: ({ value }) => {
      if (mode === "CREATE") {
        onSubmit({
          mode: "CREATE",
          symbolName: value.symbolName.trim(),
          verbalization: value.verbalization.trim(),
          symdecl: true,
        });
      }
    },
  });

  useEffect(() => {
    if (!opened) return;

    setMode("PICK_EXISTING");
    setSearchQuery(extractedText ?? "");
    setSelectedSymbol(null);

    form.reset({
      symbolName: extractedText ?? "",
      verbalization: extractedText ?? "",
      symdecl: true,
    });
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
        key={`${opened}-${extractedText}`}
        withBorder
        shadow="xl"
        p="lg"
        radius="md"
        style={{
          position: "fixed",
          right: 60,
          top: 100,
          width: 520,
          maxHeight: "calc(100vh - 120px)",
          overflowY: "auto",
          zIndex: 5000,
        }}
      >
        <Stack gap="sm">
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              minWidth: 0,
            }}
          >
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
          </Box>

          <Paper withBorder p="sm" bg="blue.0" radius="md">
            <Text size="xs" fw={600} c="dimmed" mb={4}>
              Selected Text:
            </Text>
            <Text size="sm" fw={500}>
              {extractedText}
            </Text>
          </Paper>

          {mode === "CREATE" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
            >
              <Stack
                gap="sm"
                style={{
                  width: "100%",
                  minWidth: 0,
                }}
              >
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
                      onChange={(e) => {
                        const nextSymbolName = e.currentTarget.value;
                        const previousSymbolName = field.state.value;
                        const currentVerbalization =
                          form.getFieldValue("verbalization");

                        field.handleChange(nextSymbolName);

                        if (
                          !currentVerbalization.trim() ||
                          currentVerbalization === previousSymbolName
                        ) {
                          form.setFieldValue(
                            "verbalization",
                            nextSymbolName,
                          );
                        }
                      }}
                      error={field.state.meta.errors?.[0]}
                      autoFocus
                    />
                  )}
                </form.Field>

                <form.Field name="verbalization">
                  {(field) => (
                    <Textarea
                      label="Verbalization"
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

                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => setMode("PICK_EXISTING")}
                >
                  Back to existing symbol search
                </Button>
              </Stack>
            </form>
          )}

          {mode === "PICK_EXISTING" && (
            <Stack gap="sm">
              <Box style={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
                <SymbolResult
                  initialQuery={searchQuery}
                  onQueryChange={setSearchQuery}
                  selectedSymbol={selectedSymbol}
                  onSelectSymbol={setSelectedSymbol}
                />
              </Box>

              {selectedSymbol && (
                <Paper withBorder p="sm" bg="green.0" radius="md ">
                  <Text size="xs" fw={600} c="dimmed" mb={4}>
                    Selected Symbol:
                  </Text>
                  <Box
                    style={{ width: "100%", minWidth: 0, overflow: "hidden" }}
                  >
                    {selectedSymbol.source === "DB" ? (
                      <RenderDbSymbol
                        symbol={{
                          symbolName: selectedSymbol.symbolName,
                          source: "DB",
                          futureRepo: selectedSymbol.futureRepo,
                        }}
                      />
                    ) : (
                      <RenderSymbolicUri uri={selectedSymbol.uri} />
                    )}
                  </Box>
                </Paper>
              )}

              <Button
                onClick={handlePickExisting}
                disabled={!selectedSymbol}
                fullWidth
                leftSection={<IconCheck size={16} />}
              >
                Link & Insert Definiendum
              </Button>

              <Stack gap={4} align="center">
                <Text size="xs" c="dimmed">
                  Cannot find the symbol?
                </Text>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => setMode("CREATE")}
                >
                  Create New Symbol
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Portal>
  );
}
