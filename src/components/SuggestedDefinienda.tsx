import { useState } from "react";
import { Badge, Button, Group } from "@mantine/core";
import { getLlmDefiniendaSuggestions } from "@/serverFns/getLlmDefiniendaSuggestions.server";

interface SuggestedDefiniendaProps {
  item: {
    id: string;
    statement: unknown;
    originalText: string;
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

      {(suggestedDefinienda.length > 0 || item.definienda?.length) && (
        <Group gap={6} mt="xs">
          {(suggestedDefinienda.length > 0 ? suggestedDefinienda : item.definienda || []).map(
            (item, index) => (
              <Badge
                key={`${Array.isArray(item.text) ? item.text.join("-") : item.text}-${index}`}
                size="xs"
                radius="sm"
                variant="light"
                color="violet"
              >
                {Array.isArray(item.text) ? item.text.join(", ") : item.text}
              </Badge>
            ),
          )}
        </Group>
      )}

      <Group justify="flex-end" mt="xs">
        <Button
          size="xs"
          variant="light"
          color="violet"
          onClick={async () => {
            try {
              const res = await getLlmDefiniendaSuggestions({
                data: {
                  definitionText: JSON.stringify(item.statement),
                  definitionId: item.id,
                  documentPageId: item.id,
                  pageNumber: item.pageNumber,
                },
              });

              console.log("LLM RESPONSE:", res);

              setSuggestedDefinienda(res.definienda || []);
            } catch (e) {
              console.error("Definienda suggestion failed", e);
            }
          }}
        >
          Suggest Definienda
        </Button>
      </Group>
    </>
  );
}
