import { Badge, Box, Group, Text, Tooltip } from "@mantine/core";
import { IconArchive, IconBook, IconSchool } from "@tabler/icons-react";

const ICON_SIZE = 14;
const ARCHIVE_ICON_STROKE = 1.6;
const SYMBOL_ICON_STROKE = 1.8;

const PARAM_ARCHIVE = "a";
const PARAM_SYMBOL = "s";
const PARAM_DEFINIENS = "d";

type DbSymbol = { symbolName: string; source: "DB"; futureRepo: string };

export function RenderSymbolicUri({ uri }: { uri: string }) {
  try {
    const url = new URL(uri);
    const params = url.searchParams;

    const archiveName = params.get(PARAM_ARCHIVE);
    const symbolName = params.get(PARAM_SYMBOL);
    const definiensName = params.get(PARAM_DEFINIENS);

    if (!archiveName) {
      return (
        <Tooltip label={uri} withArrow>
          <Text size="xs" truncate>
            {uri}
          </Text>
        </Tooltip>
      );
    }

    const RightIcon = symbolName ? IconSchool : IconBook;
    const rightLabel = symbolName ?? definiensName;

    return (
      <Tooltip label={uri} withArrow>
        <Box style={{ width: "100%", overflow: "hidden" }}>
          <Group justify="space-between" wrap="nowrap" w="100%">
            <Group gap={4} wrap="nowrap">
              <IconArchive size={ICON_SIZE} stroke={ARCHIVE_ICON_STROKE} />
              <Text size="xs" c="dimmed" truncate>
                {archiveName}
              </Text>
            </Group>

            {rightLabel && (
              <Group gap={4} wrap="nowrap">
                <RightIcon size={ICON_SIZE} stroke={SYMBOL_ICON_STROKE} />
                <Text size="xs" fw={500} truncate>
                  {rightLabel}
                </Text>
              </Group>
            )}
          </Group>
        </Box>
      </Tooltip>
    );
  } catch {
    return (
      <Tooltip label={uri} withArrow>
        <Text size="xs" truncate>
          {uri}
        </Text>
      </Tooltip>
    );
  }
}

export function RenderDbSymbol({ symbol }: { symbol: DbSymbol }) {
  const filePath = `${symbol.futureRepo}`;

  return (
    <Tooltip label={`${symbol.symbolName} • ${filePath}`} withArrow>
      <Group justify="space-between" w="100%">
        <Text size="xs" fw={500}>
          {symbol.symbolName}
        </Text>

        <Group gap={4}>
          <Badge size="xs" color="green">
            DB
          </Badge>
          <Text size="xs" c="dimmed" truncate>
            {filePath}
          </Text>
        </Group>
      </Group>
    </Tooltip>
  );
}
