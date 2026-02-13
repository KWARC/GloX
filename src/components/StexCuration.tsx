import {
  FileIdentity,
  getDefinitionsByIdentity,
} from "@/serverFns/latex.server";
import {
  Badge,
  Box,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { FtmlPreview } from "./FtmlPreview";

export function StexCuration({ identity }: { identity: FileIdentity }) {
  const { data, isLoading } = useQuery({
    queryKey: ["definitionsByIdentity", identity],
    queryFn: () =>
      getDefinitionsByIdentity({
        data: identity,
      }),
  });

  const hasSymbols = (data?.symbols.length ?? 0) > 0;

  return (
    <Paper
      withBorder
      p={0}
      radius="md"
      style={{
        aspectRatio: "1 / 1",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "box-shadow 150ms ease, border-color 150ms ease",
        borderColor: "var(--mantine-color-gray-3)",
      }}
      styles={{
        root: {
          "&:hover": {
            boxShadow: "var(--mantine-shadow-sm)",
            borderColor: "var(--mantine-color-gray-4)",
          },
        },
      }}
    >
      <Stack gap={0} style={{ height: "100%" }}>
        <Box
          px="md"
          py="sm"
          style={{
            borderBottom: "1px solid var(--mantine-color-gray-1)",
            backgroundColor: "var(--mantine-color-gray-0)",
          }}
        >
          <Text size="xs" fw={600} c="gray.7" mb={6} tt="uppercase">
            Symbol Declared
          </Text>

          {hasSymbols ? (
            <Group gap={6}>
              {data?.symbols.map((symbol, index) => (
                <Badge
                  key={`${symbol.id}-${index}`}
                  size="sm"
                  variant="light"
                  color="blue"
                  styles={{
                    root: {
                      textTransform: "none",
                      fontWeight: 500,
                    },
                  }}
                >
                  {symbol.label}
                </Badge>
              ))}
            </Group>
          ) : (
            <Text size="xs" c="dimmed">
              No symbol declared
            </Text>
          )}
        </Box>

        <Box
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box px="md" pt="sm" pb="xs">
            <Text size="xs" fw={600} c="gray.7" tt="uppercase">
              Definitions
            </Text>
          </Box>

          <ScrollArea
            type="auto"
            scrollbarSize={6}
            style={{ flex: 1 }}
            px="md"
            pb="md"
          >
            {isLoading && (
              <Group justify="center" py="lg">
                <Loader size="sm" />
              </Group>
            )}

            {!isLoading && (
              <Stack gap="md">
                {data?.definitions.map((def, index) => (
                  <Box
                    key={def.id}
                    pb={index !== data.definitions.length - 1 ? "md" : 0}
                    style={{
                      borderBottom:
                        index !== data.definitions.length - 1
                          ? "1px solid var(--mantine-color-gray-1)"
                          : "none",
                    }}
                  >
                    <FtmlPreview docId={def.id} ftmlAst={def.statement} />
                  </Box>
                ))}
              </Stack>
            )}
          </ScrollArea>
        </Box>
        <Box
          px="md"
          pt="sm"
          pb="xs"
          style={{
            borderBottom: "1px solid var(--mantine-color-gray-2)",
          }}
        >
          <Text size="xs" c="dimmed" ff="monospace" lh={1.4}>
            {[
              identity.futureRepo,
              identity.filePath,
              identity.fileName,
              identity.language,
            ]
              .filter(Boolean)
              .join(" / ")}
          </Text>
        </Box>
      </Stack>
    </Paper>
  );
}
