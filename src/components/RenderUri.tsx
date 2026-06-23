import { Badge, Box, Group, Text, Tooltip } from "@mantine/core";
import { IconArchive, IconBook, IconSchool } from "@tabler/icons-react";

const ICON_SIZE = 14;
const ARCHIVE_ICON_STROKE = 1.6;
const SYMBOL_ICON_STROKE = 1.8;
const URI_TOOLTIP_Z_INDEX = 7000;

const PARAM_ARCHIVE = "a";
const PARAM_SYMBOL = "s";
const PARAM_DEFINIENS = "d";

type DbSymbol = { symbolName: string; source: "DB"; futureRepo: string };
type RenderSymbolicUriProps = {
  uri: string;
  showRightLabel?: boolean;
  withTooltip?: boolean;
};

export function RenderSymbolicUri({
  uri,
  showRightLabel = true,
  withTooltip = true,
}: RenderSymbolicUriProps) {
  const wrapWithTooltip = (children: React.ReactNode) =>
    withTooltip ? (
      <Tooltip label={uri} withArrow zIndex={URI_TOOLTIP_Z_INDEX}>
        {children}
      </Tooltip>
    ) : (
      <>{children}</>
    );

  try {
    const url = new URL(uri);
    const params = url.searchParams;

    const archiveName = params.get(PARAM_ARCHIVE);
    const filePath = params.get("p");
    const symbolName = params.get(PARAM_SYMBOL);
    const definiensName = params.get(PARAM_DEFINIENS);

    if (!archiveName) {
      return wrapWithTooltip(
        <Text size="xs" truncate>
          {uri}
        </Text>,
      );
    }

    const RightIcon = symbolName ? IconSchool : IconBook;
    const rightLabel = symbolName ?? definiensName;
    const leftLabel = [archiveName, filePath].filter(Boolean).join("/");

    return wrapWithTooltip(
      <Box style={{ width: "100%", overflow: "hidden" }}>
        <Group justify="space-between" wrap="nowrap" w="100%">
          <Group gap={4} wrap="nowrap">
            <IconArchive size={ICON_SIZE} stroke={ARCHIVE_ICON_STROKE} />
            <Text size="xs" c="dimmed" truncate>
              {leftLabel || archiveName}
            </Text>
          </Group>

          {showRightLabel && rightLabel && (
            <Group gap={4} wrap="nowrap">
              <RightIcon size={ICON_SIZE} stroke={SYMBOL_ICON_STROKE} />
              <Text size="xs" fw={500} truncate>
                {rightLabel}
              </Text>
            </Group>
          )}
        </Group>
      </Box>,
    );
  } catch {
    return wrapWithTooltip(
      <Text size="xs" truncate>
        {uri}
      </Text>,
    );
  }
}

export function RenderDbSymbol({ symbol }: { symbol: DbSymbol }) {
  const filePath = `${symbol.futureRepo}`;

  return (
    <Tooltip
      label={`${symbol.symbolName} • ${filePath}`}
      withArrow
      zIndex={URI_TOOLTIP_Z_INDEX}
    >
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
