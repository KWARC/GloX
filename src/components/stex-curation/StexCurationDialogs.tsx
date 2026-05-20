import { SemanticPanel } from "@/components/semantic-panel/SemanticPanel";
import { ExtractedItem, PopupState } from "@/server/text-selection";
import { FileIdentity } from "@/serverFns/latex.server";
import { ComponentProps } from "react";
import { DefiniendumDialog } from "../DefiniendumDialog";
import { DefinitionIdentityDialog } from "../DefinitionFilePathDialog";
import { ReferenceSuggestionDialog } from "../ReferenceSuggestionDialog";
import { SelectionPopup } from "../SelectionPopup";
import { SymbolicRef } from "../SymbolicRef";

export type StexCurationDialogsProps = {
  identity: FileIdentity;
  metadata: {
    opened: boolean;
    definition: ExtractedItem | null;
    onClose: () => void;
  };
  sniffy: {
    opened: boolean;
    onClose: () => void;
    activeDefId: string | null;
    activeDefStatement: ComponentProps<
      typeof ReferenceSuggestionDialog
    >["definitionStatement"];
    activeDefText: string;
    suggestions: ComponentProps<
      typeof ReferenceSuggestionDialog
    >["suggestions"];
    catalog: ComponentProps<typeof ReferenceSuggestionDialog>["catalog"];
    loading: boolean;
    onAccept: ComponentProps<typeof ReferenceSuggestionDialog>["onAccept"];
  };
  selection: {
    popup: PopupState | null;
    onClose: () => void;
    onDefiniendum: () => void;
    onSymbolicRef: () => void;
  };
  semantic: {
    opened: boolean;
    onClose: () => void;
    definition: ComponentProps<typeof SemanticPanel>["definition"];
    onReplaceNode: ComponentProps<typeof SemanticPanel>["onReplaceNode"];
    onDeleteNode: ComponentProps<typeof SemanticPanel>["onDeleteNode"];
  };
  definiendum: {
    opened: boolean;
    extractedText: string | null;
    onSubmit: ComponentProps<typeof DefiniendumDialog>["onSubmit"];
    onClose: () => void;
  };
  symbolicRef: {
    mode: "SymbolicRef" | null;
    conceptUri: string;
    onClose: () => void;
    onSelect: ComponentProps<typeof SymbolicRef>["onSelect"];
  };
};

export function StexCurationDialogs({
  identity,
  metadata,
  sniffy,
  selection,
  semantic,
  definiendum,
  symbolicRef,
}: StexCurationDialogsProps) {
  return (
    <>
      <DefinitionIdentityDialog
        opened={metadata.opened}
        onClose={metadata.onClose}
        definition={metadata.definition}
        multipleDefinitions={!metadata.definition ? identity : undefined}
        invalidateKey={["definitionsByIdentity", identity]}
      />
      <ReferenceSuggestionDialog
        opened={sniffy.opened}
        onClose={sniffy.onClose}
        definitionId={sniffy.activeDefId ?? ""}
        definitionStatement={sniffy.activeDefStatement}
        definitionText={sniffy.activeDefText}
        suggestions={sniffy.suggestions}
        catalog={sniffy.catalog}
        loading={sniffy.loading}
        onAccept={sniffy.onAccept}
      />
      {selection.popup && (
        <SelectionPopup
          popup={selection.popup}
          onClose={selection.onClose}
          onDefiniendum={selection.onDefiniendum}
          onSymbolicRef={selection.onSymbolicRef}
        />
      )}
      {semantic.opened && (
        <SemanticPanel
          opened={semantic.opened}
          onClose={semantic.onClose}
          definition={semantic.definition}
          onReplaceNode={semantic.onReplaceNode}
          onDeleteNode={semantic.onDeleteNode}
        />
      )}

      <DefiniendumDialog
        opened={definiendum.opened}
        extractedText={definiendum.extractedText}
        onSubmit={definiendum.onSubmit}
        onClose={definiendum.onClose}
      />
      {symbolicRef.mode === "SymbolicRef" && (
        <SymbolicRef
          conceptUri={symbolicRef.conceptUri}
          onClose={symbolicRef.onClose}
          onSelect={symbolicRef.onSelect}
        />
      )}
    </>
  );
}
