import { useState } from "react";
import { Badge, Button, Group, Loader, Text } from "@mantine/core";
import { getLlmDefiniendaSuggestions } from "@/serverFns/getLlmDefiniendaSuggestions.server";

interface SuggestedDefiniendaProps {
  item: {
    id: string;
    statement: unknown;
    pageNumber: number;

    definienda?: {
      text: string[];
      label: string;
    }[];

    definitionSymbols?: {
      symbol: {
        symbolName: string;
      };
    }[];
  };
}

export function SuggestedDefinienda({ item }: SuggestedDefiniendaProps) {
  const [suggestedDefinienda, setSuggestedDefinienda] = useState<
    {
      text: string[];
      label: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRequestedSuggestions, setHasRequestedSuggestions] = useState(false);

  const displayedDefinienda =
    suggestedDefinienda.length > 0
      ? suggestedDefinienda
      : hasRequestedSuggestions
        ? []
        : item.definienda || [];

  const hasDefiniendaBadges =
    displayedDefinienda.length > 0 &&
    (suggestedDefinienda.length > 0 || !!item.definienda?.length);

  async function handleSuggestDefinienda() {
    setSuggestedDefinienda([]);
    setError(null);
    setLoading(true);

    try {
      const res = await getLlmDefiniendaSuggestions({
        data: {
          definitionText: JSON.stringify(item.statement),
          definitionId: item.id,
          documentPageId: item.id,
          pageNumber: item.pageNumber,
        },
      });

      setSuggestedDefinienda(res.definienda ?? []);
      setHasRequestedSuggestions(true);
    } catch (e) {
      console.error("Definienda suggestion failed", e);
      setError("Definienda suggestion failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {item.definitionSymbols && item.definitionSymbols.length > 0 && (
        <Group gap={6} mt={10} wrap="wrap">
          {item.definitionSymbols.map((item, index) => (
            <Badge
              key={`${item.symbol.symbolName}-${index}`}
              size="sm"
              radius="sm"
              variant="light"
              color="violet"
            >
              {item.symbol.symbolName}
            </Badge>
          ))}
        </Group>
      )}

      {hasDefiniendaBadges && (
        <Group gap={6} mt="xs">
          {displayedDefinienda.map((item, index) => (
            <Badge
              key={`${Array.isArray(item.text) ? item.text.join("-") : item.text}-${index}`}
              size="xs"
              radius="sm"
              variant="light"
              color="pink"
            >
              {Array.isArray(item.text) ? item.text.join(", ") : item.text}
            </Badge>
          ))}
        </Group>
      )}

      {hasRequestedSuggestions && !loading && !error && !hasDefiniendaBadges && (
        <Text size="xs" c="dimmed" mt="xs">
          No definienda suggestions found
        </Text>
      )}

      {error && (
        <Text size="xs" c="red" mt="xs">
          {error}
        </Text>
      )}

      <Group justify="flex-end" mt="xs">
        <Button
          size="xs"
          variant="light"
          color="pink"
          disabled={loading}
          leftSection={loading ? <Loader size={12} color="pink" /> : null}
          onClick={handleSuggestDefinienda}
        >
          {loading ? "Suggesting..." : "Suggest Definienda"}
        </Button>
      </Group>
    </>
  );
}
