import {
  parseWikipediaLanguage,
  resolveWikipediaLanguageFromFilePath,
} from "@/lib/wikipediaLanguage";
import { searchWikipediaForSymbol } from "@/serverFns/wikipediaSearch.server";
import { WikipediaSearchResultItem } from "@/types/wikipedia.types";
import {
  Anchor,
  Button,
  Paper,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconExternalLink, IconSearch } from "@tabler/icons-react";
import { useEffect, useState } from "react";

type WikipediaDefinitionLookupProps = {
  symbolName: string;
  filePath: string;
  locationLanguage?: string;
  enabled: boolean;
};

export function WikipediaDefinitionLookup({
  symbolName,
  filePath,
  locationLanguage,
  enabled,
}: WikipediaDefinitionLookupProps) {
  const [results, setResults] = useState<WikipediaSearchResultItem[]>([]);
  const [selected, setSelected] = useState<WikipediaSearchResultItem | null>(
    null,
  );
  const [searching, setSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [iframeFailed, setIframeFailed] = useState(false);

  const blockLanguage =
    parseWikipediaLanguage(locationLanguage ?? "") ??
    resolveWikipediaLanguageFromFilePath(filePath);

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setSelected(null);
      setStatusMessage(null);
      setIframeFailed(false);
      setSearching(false);
    }
  }, [enabled]);

  useEffect(() => {
    setIframeFailed(false);
  }, [selected?.url]);

  async function handleSearch() {
    const trimmedName = symbolName.trim();
    if (!trimmedName) {
      setStatusMessage("Enter a symbol name before searching Wikipedia.");
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

    setSearching(true);
    setStatusMessage(null);
    setResults([]);
    setSelected(null);
    setIframeFailed(false);

    try {
      const response = await searchWikipediaForSymbol({
        data: {
          symbolName: trimmedName,
          language: blockLanguage,
        },
      });

      if (response.results.length === 0) {
        setStatusMessage("No Wikipedia articles found for this symbol name.");
        return;
      }

      setResults(response.results);
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Wikipedia search failed. Try again later.",
      );
    } finally {
      setSearching(false);
    }
  }

  function handleSelectResult(result: WikipediaSearchResultItem) {
    setSelected(result);
    setIframeFailed(false);
    setStatusMessage(null);
  }

  if (!enabled) {
    return null;
  }

  return (
    <Stack gap="sm">
      <Text size="sm" fw={500}>
        Wikipedia
      </Text>
      <Text size="xs" c="dimmed">
        Search Wikipedia for the new symbol, read an article, and copy relevant
        text into the definition field below.
      </Text>

      <Button
        variant="light"
        leftSection={<IconSearch size={16} />}
        onClick={() => void handleSearch()}
        loading={searching}
        disabled={!symbolName.trim()}
      >
        Search Wikipedia
      </Button>

      {statusMessage && (
        <Text size="xs" c="dimmed">
          {statusMessage}
        </Text>
      )}

      {results.length > 0 && (
        <Stack gap={4}>
          <Text size="xs" fw={600}>
            Results
          </Text>
          {results.map((result) => {
            const isSelected = selected?.url === result.url;
            return (
              <UnstyledButton
                key={result.url}
                onClick={() => handleSelectResult(result)}
              >
                <Paper
                  withBorder
                  p="xs"
                  bg={isSelected ? "blue.0" : undefined}
                >
                  <Text size="sm" fw={isSelected ? 600 : 500}>
                    {result.title}
                  </Text>
                </Paper>
              </UnstyledButton>
            );
          })}
        </Stack>
      )}

      {selected && (
        <Stack gap={4}>
          <Text size="xs" fw={600}>
            Selected article
          </Text>
          <Text size="sm">{selected.title}</Text>
          <Anchor href={selected.url} target="_blank" rel="noopener noreferrer" size="xs">
            {selected.url}
          </Anchor>

          {!iframeFailed && (
            <iframe
              title={selected.title}
              src={selected.url}
              style={{
                width: "100%",
                height: 280,
                border: "1px solid var(--mantine-color-gray-3)",
                borderRadius: "var(--mantine-radius-sm)",
              }}
              onError={() => setIframeFailed(true)}
            />
          )}

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

          {iframeFailed && (
            <Text size="xs" c="dimmed">
              This article could not be embedded. Use Open on Wikipedia to read
              and copy the text.
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}
