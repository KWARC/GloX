import { queryClient } from "@/queryClient";
import { buildStaticCatalog } from "@/server/symbolic-suggestions";
import { resolveDeclaredSymbolNames } from "@/server/floDownBlockDeletion";
import { ExtractedItem } from "@/server/text-selection";
import { getFloDownBlockProvenance } from "@/serverFns/floDownBlockProvenance.server";
import { getFloDownBlockFileStatus } from "@/serverFns/floDownBlockStatus.server";
import {
  FileIdentity,
  getFloDownBlocksByIdentity,
} from "@/serverFns/latex.server";
import { listStaticSymbolicCatalog } from "@/serverFns/symbolicCatalog.server";
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
export type FloDownBlockSymbolSummary = {
  floDownBlockId: string;
  symbols: string[];
};

export function useStexCurationData(identity: FileIdentity) {
  const { data, isLoading } = useQuery({
    queryKey: ["floDownBlocksByIdentity", identity],
    queryFn: () =>
      getFloDownBlocksByIdentity({
        data: identity,
      }),
  });

  const floDownBlocks = data?.floDownBlocks ?? [];
  const floDownBlockIds = floDownBlocks.map((d) => d.id);

  const { data: provenance } = useQuery({
    queryKey: ["logical-paragraph-provenance", floDownBlockIds],
    queryFn: () =>
      getFloDownBlockProvenance({
        data: {
          floDownBlockIds,
          documentId: identity.documentId,
          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: identity.fileName,
          language: identity.language,
        },
      }),
    enabled: floDownBlockIds.length > 0,
  });

  const { data: floDownBlockStatus } = useQuery({
    queryKey: [
      "logical-paragraph-status",
      identity.documentId,
      identity.futureRepo,
      identity.filePath,
      identity.fileName,
      identity.language,
    ],
    queryFn: () =>
      getFloDownBlockFileStatus({
        data: identity,
      }),
  });

  const {
    data: staticCatalogData,
    isLoading: staticCatalogLoading,
    error: staticCatalogQueryError,
    refetch: refetchStaticCatalog,
  } = useQuery({
    queryKey: ["static-symbolic-catalog"],
    queryFn: () => listStaticSymbolicCatalog(),
  });

  const retryStaticCatalog = async () => {
    await refetchStaticCatalog();
  };

  const staticCatalog = staticCatalogData ?? [];
  const staticCatalogError =
    staticCatalogData === undefined && !staticCatalogLoading
      ? staticCatalogQueryError
      : null;

  const sniffyCatalog = useMemo(
    () => buildStaticCatalog(staticCatalog),
    [staticCatalog],
  );

  const floDownBlockSymbolSummaries = buildFloDownBlockSymbolSummaries(floDownBlocks);

  const actualSymbols = Array.from(
    new Set(
      floDownBlocks.flatMap((def) =>
        resolveDeclaredSymbolNames(def.statement, def.declaredSymbols),
      ),
    ),
  );

  const status = (floDownBlockStatus?.status ?? "EXTRACTED") as StexStatus;
  const statusConf = STATUS_CONFIG[status] ?? STATUS_CONFIG.EXTRACTED;
  const discardReasonFromServer = floDownBlockStatus?.discardedReason ?? null;

  return {
    data,
    floDownBlocks,
    isLoading,
    floDownBlockIds,
    provenance,
    floDownBlockStatus,
    sniffyCatalog,
    staticCatalogLoading,
    staticCatalogError,
    retryStaticCatalog,
    floDownBlockSymbolSummaries,
    actualSymbols,
    status,
    statusConf,
    discardReasonFromServer,
  };
}

export async function refetchFloDownBlocksByIdentity(identity: FileIdentity) {
  const updatedData = await queryClient.fetchQuery({
    queryKey: ["floDownBlocksByIdentity", identity],
    queryFn: () =>
      getFloDownBlocksByIdentity({
        data: identity,
      }),
  });
  return updatedData.floDownBlocks;
}

export function buildFloDownBlockSymbolSummaries(
  floDownBlocks: ExtractedItem[],
): FloDownBlockSymbolSummary[] {
  return floDownBlocks.map((floDownBlock) => ({
    floDownBlockId: floDownBlock.id,
    symbols: resolveDeclaredSymbolNames(
      floDownBlock.statement,
      floDownBlock.declaredSymbols,
    ),
  }));
}
