import { queryClient } from "@/queryClient";
import { buildStaticCatalog } from "@/server/symbolic-suggestions";
import { ExtractedItem } from "@/server/text-selection";
import { getDefinitionProvenance } from "@/serverFns/definitionProvenance.server";
import { getDefinitionFileStatus } from "@/serverFns/definitionStatus.server";
import {
  FileIdentity,
  getDefinitionsByIdentity,
} from "@/serverFns/latex.server";
import { listStaticSymbolicCatalog } from "@/serverFns/symbolicCatalog.server";
import {
  FtmlNode,
  FtmlRoot,
  isDefiniendumNode,
  isNode,
  normalizeToRoot,
} from "@/types/ftml.types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export const STATUS_CONFIG = {
  SUBMITTED_TO_MATHHUB: {
    color: "teal",
    label: "Submitted to MathHub",
    actionLabel: "Unsubmit from MathHub",
    actionColor: "green" as const,
    nextStatus: "FINALIZED_IN_FILE" as const,
  },
  FINALIZED_IN_FILE: {
    color: "blue",
    label: "Finalized",
    actionLabel: "Submit to MathHub",
    actionColor: "blue" as const,
    nextStatus: "SUBMITTED_TO_MATHHUB" as const,
  },
  EXTRACTED: {
    color: "gray",
    label: "Extracted",
  },
  DISCARDED: {
    color: "red",
    label: "Discarded",
  },
} as const;

export type StexStatus = keyof typeof STATUS_CONFIG;
export type DefinitionSymbolSummary = {
  definitionId: string;
  symbols: string[];
};

export function useStexCurationData(identity: FileIdentity) {
  const { data, isLoading } = useQuery({
    queryKey: ["definitionsByIdentity", identity],
    queryFn: () =>
      getDefinitionsByIdentity({
        data: identity,
      }),
  });

  const definitions = data?.definitions ?? [];
  const definitionIds = definitions.map((d) => d.id);

  const { data: provenance } = useQuery({
    queryKey: ["definition-provenance", definitionIds],
    queryFn: () =>
      getDefinitionProvenance({
        data: {
          definitionIds,
          documentId: identity.documentId,
          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: identity.fileName,
          language: identity.language,
        },
      }),
    enabled: definitionIds.length > 0,
  });

  const { data: definitionStatus } = useQuery({
    queryKey: [
      "definition-status",
      identity.documentId,
      identity.futureRepo,
      identity.filePath,
      identity.fileName,
      identity.language,
    ],
    queryFn: () =>
      getDefinitionFileStatus({
        data: identity,
      }),
  });

  const { data: staticCatalog = [] } = useQuery({
    queryKey: ["static-symbolic-catalog"],
    queryFn: () => listStaticSymbolicCatalog(),
  });

  const sniffyCatalog = useMemo(
    () => buildStaticCatalog(staticCatalog),
    [staticCatalog],
  );

  const definitionSymbolSummaries = buildDefinitionSymbolSummaries(definitions);

  const actualSymbols = Array.from(
    new Set(
      definitions.flatMap((def) => extractSymbolsFromStatement(def.statement)),
    ),
  );

  const status = (definitionStatus?.status ?? "EXTRACTED") as StexStatus;
  const statusConf = STATUS_CONFIG[status] ?? STATUS_CONFIG.EXTRACTED;
  const discardReasonFromServer = definitionStatus?.discardedReason ?? null;

  return {
    data,
    definitions,
    isLoading,
    definitionIds,
    provenance,
    definitionStatus,
    sniffyCatalog,
    definitionSymbolSummaries,
    actualSymbols,
    status,
    statusConf,
    discardReasonFromServer,
  };
}

export async function refetchDefinitionsByIdentity(identity: FileIdentity) {
  const updatedData = await queryClient.fetchQuery({
    queryKey: ["definitionsByIdentity", identity],
    queryFn: () =>
      getDefinitionsByIdentity({
        data: identity,
      }),
  });
  return updatedData.definitions;
}

export function extractSymbolsFromStatement(statement: FtmlRoot): string[] {
  const root = normalizeToRoot(statement);
  const symbols: string[] = [];
  const seen = new Set<string>();

  function walk(node: FtmlNode) {
    if (isDefiniendumNode(node) && node.symdecl === true) {
      const label = (node.content ?? [])
        .filter((c): c is string => typeof c === "string")
        .join("");

      if (label && !seen.has(label)) {
        seen.add(label);
        symbols.push(label);
      }
    }

    if (node.content) {
      for (const child of node.content) {
        if (isNode(child)) {
          walk(child);
        }
      }
    }
  }

  for (const node of root.content) {
    walk(node);
  }

  return symbols;
}

export function buildDefinitionSymbolSummaries(
  definitions: ExtractedItem[],
): DefinitionSymbolSummary[] {
  return definitions.map((definition) => ({
    definitionId: definition.id,
    symbols: extractSymbolsFromStatement(definition.statement),
  }));
}
