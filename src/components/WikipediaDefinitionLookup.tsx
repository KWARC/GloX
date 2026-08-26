import { parseWikipediaLanguage } from "@/lib/wikipediaLanguage";
import { searchWikipediaForSymbol } from "@/serverFns/wikipediaSearch.server";
import { WikipediaSearchResultItem } from "@/types/wikipedia.types";
import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconExternalLink, IconSearch, IconX } from "@tabler/icons-react";
import { FormEvent, CSSProperties, ReactNode, useEffect, useRef, useState } from "react";

const ARTICLE_IFRAME_HEIGHT_PX = 280;
const RESULT_BUTTON_MAX_WIDTH = "min(100%, 20rem)";
const PANEL_SPLIT_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)",
  gap: "var(--mantine-spacing-md)",
  alignItems: "start",
};

type WikipediaDefinitionLookupProps = {
  symbolName: string;
  language: string;
  enabled: boolean;
  /** Left side of the shared top row (typically the new symbol name field). */
  symbolNameField: ReactNode;
  children: ReactNode;
};

export function WikipediaDefinitionLookup({
  symbolName,
  language,
  enabled,
  symbolNameField,
  children,
}: WikipediaDefinitionLookupProps) {
  const [query, setQuery] = useState(symbolName);
  const [results, setResults] = useState<WikipediaSearchResultItem[]>([]);
  const [selected, setSelected] = useState<WikipediaSearchResultItem | null>(
    null,
  );
  const [searching, setSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [iframeFailed, setIframeFailed] = useState(false);
  const autoSearchedForOpenRef = useRef(false);
  const searchGenerationRef = useRef(0);

  const blockLanguage = parseWikipediaLanguage(language);

  useEffect(() => {
    setQuery(symbolName);
  }, [symbolName]);

  useEffect(() => {
    setIframeFailed(false);
  }, [selected?.url]);

  async function runSearch(searchQuery: string) {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      setStatusMessage("Enter a search term before searching Wikipedia.");
      setResults([]);
      setSelected(null);
      return;
    }

    if (!blockLanguage) {
      setStatusMessage(
        "Wikipedia search supports English, German, and French only.",
      );
      setResults([]);
      setSelected(null);
      return;
    }

    const generation = ++searchGenerationRef.current;
    setSearching(true);
    setStatusMessage(null);
    setResults([]);
    setSelected(null);
    setIframeFailed(false);

    try {
      const response = await searchWikipediaForSymbol({
        data: {
          symbolName: trimmedQuery,
          language: blockLanguage,
        },
      });

      if (generation !== searchGenerationRef.current) {
        return;
      }

      if (response.results.length === 0) {
        setStatusMessage("No Wikipedia articles found for this search.");
        return;
      }

      setResults(response.results);
      setSelected(response.results[0] ?? null);
    } catch (error) {
      if (generation !== searchGenerationRef.current) {
        return;
      }

      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Wikipedia search failed. Try again later.",
      );
    } finally {
      if (generation === searchGenerationRef.current) {
        setSearching(false);
      }
    }
  }

  useEffect(() => {
    if (!enabled) {
      autoSearchedForOpenRef.current = false;
      searchGenerationRef.current += 1;
      setQuery(symbolName);
      setResults([]);
      setSelected(null);
      setStatusMessage(null);
      setIframeFailed(false);
      setSearching(false);
      return;
    }

    setQuery(symbolName);

    const trimmedName = symbolName.trim();
    if (!trimmedName || autoSearchedForOpenRef.current) {
      return;
    }

    autoSearchedForOpenRef.current = true;
    void runSearch(trimmedName);
    // Auto-search once when create-symbol opens with a selected name; later edits use Search.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-once trigger
  }, [enabled, symbolName]);

  function handleSelectResult(result: WikipediaSearchResultItem) {
    setSelected(result);
    setIframeFailed(false);
    setStatusMessage(null);
  }

  function handleClear() {
    searchGenerationRef.current += 1;
    setResults([]);
    setSelected(null);
    setStatusMessage(null);
    setIframeFailed(false);
    setSearching(false);
    setQuery(symbolName);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(query);
  }

  if (!enabled) {
    return null;
  }

  return (
    <Stack gap="md">
      <Box style={PANEL_SPLIT_STYLE}>
        {symbolNameField}

        <form onSubmit={handleSearchSubmit}>
          <Group align="flex-end" gap="xs" wrap="nowrap">
            <TextInput
              label="Wikipedia search"
              placeholder="Type a term and search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              style={{ flex: 1 }}
              styles={{ input: { fontWeight: 500 } }}
            />
            <Button
              type="submit"
              variant="light"
              size="sm"
              leftSection={<IconSearch size={16} />}
              loading={searching}
              disabled={!query.trim()}
            >
              Search
            </Button>
            <Tooltip label="Clear" withArrow>
              <ActionIcon
                type="button"
                variant="light"
                color="red"
                size="input-sm"
                aria-label="Clear"
                onClick={handleClear}
              >
                <IconX size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </form>
      </Box>

      <Box style={PANEL_SPLIT_STYLE}>
        <Stack gap="lg">{children}</Stack>

        <Stack gap="sm">
          {statusMessage && (
            <Text size="xs" c="dimmed">
              {statusMessage}
            </Text>
          )}

          {results.length > 0 && (
            <Stack gap={6}>
              <Text size="xs" fw={600}>
                Results
              </Text>
              <Group gap={6} wrap="wrap">
                {results.map((result) => {
                  const isSelected = selected?.url === result.url;
                  return (
                    <Button
                      key={result.url}
                      variant={isSelected ? "filled" : "light"}
                      size="compact-sm"
                      onClick={() => handleSelectResult(result)}
                      title={result.title}
                      styles={{
                        root: { maxWidth: RESULT_BUTTON_MAX_WIDTH },
                        label: {
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        },
                      }}
                    >
                      {result.title}
                    </Button>
                  );
                })}
              </Group>
            </Stack>
          )}

          {selected && (
            <Stack gap={4}>
              <Text size="xs" fw={600}>
                Selected article
              </Text>

              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm">{selected.title}</Text>
                  <Anchor
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="xs"
                  >
                    {selected.url}
                  </Anchor>
                </Stack>

                <Button
                  component="a"
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="light"
                  leftSection={<IconExternalLink size={16} />}
                >
                  Open on Wikipedia
                </Button>
              </Group>

              {!iframeFailed && (
                <iframe
                  title={selected.title}
                  src={selected.url}
                  style={{
                    width: "100%",
                    height: ARTICLE_IFRAME_HEIGHT_PX,
                    border: "1px solid var(--mantine-color-gray-3)",
                    borderRadius: "var(--mantine-radius-sm)",
                  }}
                  onError={() => setIframeFailed(true)}
                />
              )}

              {iframeFailed && (
                <Text size="xs" c="dimmed">
                  This article could not be embedded. Use Open on Wikipedia to
                  read and copy the text.
                </Text>
              )}
            </Stack>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
