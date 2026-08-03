import { queryClient } from "@/queryClient";
import { injectProvenance } from "@/server/ftml/addProvenanceData";
import { generateStexFromFtml } from "@/server/ftml/generateStexFromFtml";
import { ExtractedItem } from "@/server/text-selection";
import { getCombinedFloDownBlockFtml } from "@/serverFns/floDownBlockAggregate.server";
import { getFloDownBlockProvenance } from "@/serverFns/floDownBlockProvenance.server";
import { updateFloDownBlocksStatusByIdentity } from "@/serverFns/floDownBlockStatus.server";
import {
  deleteFloDownBlock,
  updateFloDownBlock,
} from "@/serverFns/extractFloDownBlock.server";
import {
  FileIdentity,
  saveLatexDraft,
  saveLatexFinal,
} from "@/serverFns/latex.server";
import { FtmlStatement } from "@/types/ftml.types";
import { useState } from "react";

type FloDownBlockProvenance = Awaited<ReturnType<typeof getFloDownBlockProvenance>>;

export function useStexCurationActions(
  identity: FileIdentity,
  floDownBlockIds: string[],
  provenance: FloDownBlockProvenance | undefined,
) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [floDownBlockMetaEditOpen, setFloDownBlockMetaEditOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState("");
  const [floDownBlockMetaTarget, setFloDownBlockMetaTarget] =
    useState<ExtractedItem | null>(null);
  const [latexOpen, setLatexOpen] = useState(false);
  const [latexCode, setLatexCode] = useState("");

  function handleEditFloDownBlockMeta(item: ExtractedItem) {
    setFloDownBlockMetaTarget(item);
    setFloDownBlockMetaEditOpen(true);
  }

  function handleOpenMetadataForIdentity() {
    setFloDownBlockMetaTarget(null);
    setFloDownBlockMetaEditOpen(true);
  }

  function handleCloseFloDownBlockMeta() {
    setFloDownBlockMetaEditOpen(false);
    setFloDownBlockMetaTarget(null);
  }

  async function handleDownload() {
    try {
      const ftmlAst = await getCombinedFloDownBlockFtml({
        data: {
          floDownBlockIds,
          documentId: identity.documentId,
          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: identity.fileName,
          language: identity.language,
        },
      });

      if (!ftmlAst) {
        alert("No FTML found.");
        return;
      }

      let stex = await generateStexFromFtml(
        ftmlAst,
        identity.futureRepo,
        identity.filePath,
        identity.fileName,
      );
      stex = injectProvenance(stex ?? "", provenance);

      if (!stex) {
        alert("LaTeX generation failed.");
        return;
      }

      const blob = new Blob([stex], {
        type: "application/x-tex",
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${identity.fileName}.${identity.language}.tex`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while downloading.");
    }
  }

  async function handleDelete(id: string) {
    await deleteFloDownBlock({ data: { id } });
    queryClient.setQueryData<{ floDownBlocks: ExtractedItem[] }>(
      ["floDownBlocksByIdentity", identity],
      (current) =>
        current
          ? {
              ...current,
              floDownBlocks: current.floDownBlocks.filter(
                (definition) => definition.id !== id,
              ),
            }
          : current,
    );
    await queryClient.invalidateQueries({
      queryKey: ["floDownBlocksByIdentity"],
    });
    await queryClient.invalidateQueries({ queryKey: ["fileIdentities"] });
  }

  async function handleUpdate(id: string, statement: FtmlStatement) {
    await updateFloDownBlock({ data: { id, statement } });
    setEditingId(null);
    await queryClient.invalidateQueries({
      queryKey: ["floDownBlocksByIdentity", identity],
    });
  }

  function handleToggleEdit(id: string) {
    setEditingId((prev) => (prev === id ? null : id));
  }

  async function handleOpenLatexPreview() {
    try {
      const ftmlAst = await getCombinedFloDownBlockFtml({
        data: {
          floDownBlockIds,
          documentId: identity.documentId,
          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: identity.fileName,
          language: identity.language,
        },
      });

      if (!ftmlAst) {
        alert("No FTML found");
        return;
      }

      let stex = await generateStexFromFtml(
        ftmlAst,
        identity.futureRepo,
        identity.filePath,
        identity.fileName,
      );
      stex = injectProvenance(stex ?? "", provenance);

      setLatexCode(stex);
      setLatexOpen(true);
    } catch (e) {
      console.error(e);
      alert("Failed to load LaTeX preview");
    }
  }

  async function handleSaveLatexDraft() {
    await saveLatexDraft({
      data: {
        latex: latexCode,
        floDownBlockIds,
        documentId: identity.documentId,
        futureRepo: identity.futureRepo,
        filePath: identity.filePath,
        fileName: identity.fileName,
        language: identity.language,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["floDownBlocksByIdentity", identity],
    });

    setLatexOpen(false);
  }

  async function handleSaveLatexFinal() {
    await saveLatexFinal({
      data: {
        latex: latexCode,
        floDownBlockIds,
        documentId: identity.documentId,
        futureRepo: identity.futureRepo,
        filePath: identity.filePath,
        fileName: identity.fileName,
        language: identity.language,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["floDownBlocksByIdentity", identity],
    });

    await queryClient.invalidateQueries({
      queryKey: [
        "logical-paragraph-status",
        identity.documentId,
        identity.futureRepo,
        identity.filePath,
        identity.fileName,
        identity.language,
      ],
    });

    setLatexOpen(false);
  }

  async function handleStatusChange(
    status: "EXTRACTED" | "FINALIZED_IN_FILE" | "SUBMITTED_TO_MATHHUB",
  ) {
    await updateFloDownBlocksStatusByIdentity({
      data: {
        identity,
        status,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: [
        "logical-paragraph-status",
        identity.documentId,
        identity.futureRepo,
        identity.filePath,
        identity.fileName,
        identity.language,
      ],
    });
  }

  async function handleConfirmDiscard() {
    await updateFloDownBlocksStatusByIdentity({
      data: {
        identity,
        status: "DISCARDED",
        discardedReason: discardReason,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: [
        "logical-paragraph-status",
        identity.documentId,
        identity.futureRepo,
        identity.filePath,
        identity.fileName,
        identity.language,
      ],
    });

    setDiscardOpen(false);
  }

  return {
    editingId,
    floDownBlockMetaEditOpen,
    discardOpen,
    discardReason,
    setDiscardOpen,
    setDiscardReason,
    floDownBlockMetaTarget,
    latexOpen,
    latexCode,
    setLatexOpen,
    setLatexCode,
    handleEditFloDownBlockMeta,
    handleOpenMetadataForIdentity,
    handleCloseFloDownBlockMeta,
    handleDownload,
    handleDelete,
    handleUpdate,
    handleToggleEdit,
    handleOpenLatexPreview,
    handleSaveLatexDraft,
    handleSaveLatexFinal,
    handleStatusChange,
    handleConfirmDiscard,
  };
}
