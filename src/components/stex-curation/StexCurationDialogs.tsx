import { SemanticPanel } from "@/components/semantic-panel/SemanticPanel";
import { ExtractedItem, PopupState } from "@/server/text-selection";
import type { CreatedSymbolTarget } from "@/serverFns/createFloDownBlockWithDeclaredSymbol.server";
import { FileIdentity } from "@/serverFns/latex.server";
import { ComponentProps, Dispatch, SetStateAction } from "react";
import { CreateSymbolDefiniendumDialog } from "../CreateSymbolDefiniendumDialog";
import { DefiniendumDialog } from "../DefiniendumDialog";
import { FloDownBlockIdentityDialog } from "../FloDownBlockFilePathDialog";
import { ExtractTextDialog } from "../ExtractTextDialog";
import { ReferenceSuggestionDialog } from "../ReferenceSuggestionDialog";
import { SelectionPopup } from "../SelectionPopup";
import { SymbolicRef } from "../SymbolicRef";

export type StexCurationDialogsProps = {
  identity: FileIdentity;
  metadata: {
    opened: boolean;
    floDownBlock: ExtractedItem | null;
    onClose: () => void;
  };
  sniffy: {
    opened: boolean;
    onClose: () => void;
    activeFloDownBlockId: string | null;
    activeFloDownBlockStatement: ComponentProps<
      typeof ReferenceSuggestionDialog
    >["floDownBlockStatement"];
    activeDeclaredSymbolsInfo?: unknown;
    activeFloDownBlockText: string;
    suggestions: ComponentProps<
      typeof ReferenceSuggestionDialog
    >["suggestions"];
    catalog: ComponentProps<typeof ReferenceSuggestionDialog>["catalog"];
    loading: boolean;
    catalogError: string | null;
    onRetryCatalog: () => Promise<void>;
    onAccept: ComponentProps<typeof ReferenceSuggestionDialog>["onAccept"];
  };
  selection: {
    popup: PopupState | null;
    onClose: () => void;
    onDefiniendum: () => void;
    onSymbolicRef: () => void;
    allowDefiniendum?: boolean;
  };
  semantic: {
    opened: boolean;
    onClose: () => void;
    floDownBlock: ComponentProps<typeof SemanticPanel>["floDownBlock"];
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
    hidden?: boolean;
    onClose: () => void;
    onSelect: ComponentProps<typeof SymbolicRef>["onSelect"];
    onCreateSymbol?: ComponentProps<typeof SymbolicRef>["onCreateSymbol"];
  };
  extraction: {
    opened: boolean;
    initialText: string;
    paragraphFileName: string;
    blockType: ComponentProps<typeof ExtractTextDialog>["blockType"];
    symbolName: string;
    setParagraphFileName: (value: string) => void;
    setBlockType: ComponentProps<typeof ExtractTextDialog>["setBlockType"];
    setSymbolName: Dispatch<SetStateAction<string>>;
    filePath: string;
    onClose: () => void;
    onSubmit: ComponentProps<typeof ExtractTextDialog>["onSubmit"];
    createSymbolFlow?: boolean;
  };
  createdSymbolDefiniendum: {
    opened: boolean;
    target: CreatedSymbolTarget | null;
    onClose: () => void;
    onConfirm: ComponentProps<
      typeof CreateSymbolDefiniendumDialog
    >["onConfirm"];
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
  extraction,
  createdSymbolDefiniendum,
}: StexCurationDialogsProps) {
  return (
    <>
      <FloDownBlockIdentityDialog
        opened={metadata.opened}
        onClose={metadata.onClose}
        floDownBlock={metadata.floDownBlock}
        multipleDefinitions={!metadata.floDownBlock ? identity : undefined}
        invalidateKey={["floDownBlocksByIdentity", identity]}
      />
      <ReferenceSuggestionDialog
        opened={sniffy.opened}
        onClose={sniffy.onClose}
        floDownBlockId={sniffy.activeFloDownBlockId ?? ""}
        floDownBlockStatement={sniffy.activeFloDownBlockStatement}
        declaredSymbolsInfo={sniffy.activeDeclaredSymbolsInfo}
        originalText={sniffy.activeFloDownBlockText}
        suggestions={sniffy.suggestions}
        catalog={sniffy.catalog}
        loading={sniffy.loading}
        catalogError={sniffy.catalogError}
        onRetryCatalog={sniffy.onRetryCatalog}
        onAccept={sniffy.onAccept}
      />
      {selection.popup && (
        <SelectionPopup
          popup={selection.popup}
          onClose={selection.onClose}
          onDefiniendum={
            selection.allowDefiniendum ? selection.onDefiniendum : undefined
          }
          onSymbolicRef={selection.onSymbolicRef}
        />
      )}
      {semantic.opened && (
        <SemanticPanel
          opened={semantic.opened}
          onClose={semantic.onClose}
          floDownBlock={semantic.floDownBlock}
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
      <ExtractTextDialog
        opened={extraction.opened}
        initialText={extraction.initialText}
        paragraphFileName={extraction.paragraphFileName}
        blockType={extraction.blockType}
        mode="symbol-target"
        symbolName={extraction.symbolName}
        createSymbolFlow={extraction.createSymbolFlow}
        setParagraphFileName={extraction.setParagraphFileName}
        setBlockType={extraction.setBlockType}
        setSymbolName={extraction.setSymbolName}
        filePath={extraction.filePath}
        onClose={extraction.onClose}
        onSubmit={extraction.onSubmit}
      />
      <CreateSymbolDefiniendumDialog
        opened={createdSymbolDefiniendum.opened}
        target={createdSymbolDefiniendum.target}
        onClose={createdSymbolDefiniendum.onClose}
        onConfirm={createdSymbolDefiniendum.onConfirm}
      />
      {symbolicRef.mode === "SymbolicRef" && !symbolicRef.hidden && (
        <SymbolicRef
          conceptUri={symbolicRef.conceptUri}
          onClose={symbolicRef.onClose}
          onSelect={symbolicRef.onSelect}
          onCreateSymbol={symbolicRef.onCreateSymbol}
        />
      )}
    </>
  );
}
