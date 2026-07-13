import { queryClient } from "@/queryClient";
import { injectProvenance } from "@/server/ftml/addProvenanceData";
import { generateStexFromFtml } from "@/server/ftml/generateStexFromFtml";
import { ExtractedItem } from "@/server/text-selection";
import { getCombinedDefinitionFtml } from "@/serverFns/definitionAggregate.server";
import { getDefinitionProvenance } from "@/serverFns/definitionProvenance.server";
import { updateDefinitionsStatusByIdentity } from "@/serverFns/definitionStatus.server";
import {
  deleteDefinition,
  updateDefinition,
} from "@/serverFns/extractDefinition.server";
import {
  FileIdentity,
  saveLatexDraft,
  saveLatexFinal,
} from "@/serverFns/latex.server";
import { FtmlStatement } from "@/types/ftml.types";
import { useState } from "react";

type DefinitionProvenance = Awaited<ReturnType<typeof getDefinitionProvenance>>;

export function useStexCurationActions(
  identity: FileIdentity,
  definitionIds: string[],
  provenance: DefinitionProvenance | undefined,
) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [definitionMetaEditOpen, setDefinitionMetaEditOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState("");
  const [definitionMetaTarget, setDefinitionMetaTarget] =
    useState<ExtractedItem | null>(null);
  const [latexOpen, setLatexOpen] = useState(false);
  const [latexCode, setLatexCode] = useState("");

  function handleEditDefinitionMeta(item: ExtractedItem) {
    setDefinitionMetaTarget(item);
    setDefinitionMetaEditOpen(true);
  }

  function handleOpenMetadataForIdentity() {
    setDefinitionMetaTarget(null);
    setDefinitionMetaEditOpen(true);
  }

  function handleCloseDefinitionMeta() {
    setDefinitionMetaEditOpen(false);
    setDefinitionMetaTarget(null);
  }

  async function handleDownload() {
    try {
      const ftmlAst = await getCombinedDefinitionFtml({
        data: {
          definitionIds,
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
    await deleteDefinition({ data: { id } });
    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });
  }

  async function handleUpdate(id: string, statement: FtmlStatement) {
    await updateDefinition({ data: { id, statement } });
    setEditingId(null);
    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });
  }

  function handleToggleEdit(id: string) {
    setEditingId((prev) => (prev === id ? null : id));
  }

  async function handleOpenLatexPreview() {
    try {
      const ftmlAst = await getCombinedDefinitionFtml({
        data: {
          definitionIds,
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
        definitionIds,
        documentId: identity.documentId,
        futureRepo: identity.futureRepo,
        filePath: identity.filePath,
        fileName: identity.fileName,
        language: identity.language,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });

    setLatexOpen(false);
  }

  async function handleSaveLatexFinal() {
    await saveLatexFinal({
      data: {
        latex: latexCode,
        definitionIds,
        documentId: identity.documentId,
        futureRepo: identity.futureRepo,
        filePath: identity.filePath,
        fileName: identity.fileName,
        language: identity.language,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });

    await queryClient.invalidateQueries({
      queryKey: [
        "definition-status",
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
    await updateDefinitionsStatusByIdentity({
      data: {
        identity,
        status,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: [
        "definition-status",
        identity.documentId,
        identity.futureRepo,
        identity.filePath,
        identity.fileName,
        identity.language,
      ],
    });
  }

  async function handleConfirmDiscard() {
    await updateDefinitionsStatusByIdentity({
      data: {
        identity,
        status: "DISCARDED",
        discardedReason: discardReason,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: [
        "definition-status",
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
    definitionMetaEditOpen,
    discardOpen,
    discardReason,
    setDiscardOpen,
    setDiscardReason,
    definitionMetaTarget,
    latexOpen,
    latexCode,
    setLatexOpen,
    setLatexCode,
    handleEditDefinitionMeta,
    handleOpenMetadataForIdentity,
    handleCloseDefinitionMeta,
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
