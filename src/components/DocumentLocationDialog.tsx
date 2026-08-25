import { floDownUriReplacementsForMove } from "@/lib/floDownUriReplacements";
import { queryClient } from "@/queryClient";
import { MyDocument } from "@/queries/document";
import {
  moveDocumentLocation,
  previewDocumentLocationMove,
} from "@/serverFns/documentLocation.server";
import { Alert, Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export function DocumentLocationDialog({
  document,
  opened,
  onClose,
}: {
  document: MyDocument | null;
  opened: boolean;
  onClose: () => void;
}) {
  const [futureRepo, setFutureRepo] = useState("");
  const [filePath, setFilePath] = useState("");
  const [language, setLanguage] = useState("");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewDocumentLocationMove>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPreview(null);
    setError(null);
    setFutureRepo(document?.futureRepo ?? "");
    setFilePath(document?.filePath ?? "");
    setLanguage(document?.language ?? "");
    onClose();
  };

  useEffect(() => {
    if (!opened || !document) return;
    setFutureRepo(document.futureRepo);
    setFilePath(document.filePath);
    setLanguage(document.language);
    setPreview(null);
    setError(null);
  }, [opened, document]);

  async function handleReview() {
    if (!document) return;
    setLoading(true);
    try {
      setPreview(await previewDocumentLocationMove({
        data: { documentId: document.id, futureRepo, filePath, language },
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not review the move");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!document || !preview) return;
    setLoading(true);
    try {
      const uriReplacements = await floDownUriReplacementsForMove(
        preview.declarations,
        { futureRepo, filePath, language },
      );
      await moveDocumentLocation({
        data: { documentId: document.id, futureRepo, filePath, language, uriReplacements },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["documents"] }),
        queryClient.invalidateQueries({ queryKey: ["document", document.id] }),
        queryClient.invalidateQueries({ queryKey: ["floDownBlocks", document.id] }),
        queryClient.invalidateQueries({ queryKey: ["floDownBlocksByIdentity"] }),
        queryClient.invalidateQueries({ queryKey: ["fileIdentities"] }),
        queryClient.invalidateQueries({ queryKey: ["symbol-search-db"] }),
        queryClient.invalidateQueries({ queryKey: ["logical-paragraph-status"] }),
      ]);
      reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not move the PDF location");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal opened={opened} onClose={reset} title="Move File location" centered>
      <Stack>
        <Text size="sm" c="dimmed">Move this PDF and all extracted content to a new repository location. Content filenames stay unchanged.</Text>
        <TextInput label="Future Repo" value={futureRepo} onChange={(event) => { setFutureRepo(event.currentTarget.value); setPreview(null); }} />
        <TextInput label="File Path" value={filePath} onChange={(event) => { setFilePath(event.currentTarget.value); setPreview(null); }} />
        <TextInput label="Language" placeholder="e.g. en" value={language} onChange={(event) => { setLanguage(event.currentTarget.value); setPreview(null); }} />
        {error && <Alert color="red" icon={<IconAlertTriangle size={16} />}>{error}</Alert>}
        {preview && <>
          <Text size="sm">{preview.contentCount} content item{preview.contentCount === 1 ? "" : "s"} and {preview.symbolCount} declared symbol{preview.symbolCount === 1 ? "" : "s"} will move from <b>[{preview.source.futureRepo}] [{preview.source.filePath}] [{preview.source.language}]</b> to <b>[{preview.target.futureRepo}] [{preview.target.filePath}] [{preview.target.language}]</b>.</Text>
          {preview.conflicts.length > 0 && <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            Cannot move because the destination already has: {preview.conflicts.map((conflict) => `${conflict.symbolName} (${conflict.fileName}.${conflict.language})`).join(", ")}.
          </Alert>}
          {!preview.canMove && preview.conflicts.length === 0 && <Alert color="yellow">The PDF is already at this location.</Alert>}
        </>}
        <Group justify="flex-end">
          <Button variant="default" onClick={reset} disabled={loading}>Cancel</Button>
          {!preview ? (
            <Button onClick={handleReview} loading={loading} disabled={!futureRepo.trim() || !filePath.trim() || !language.trim()}>Review move</Button>
          ) : (
            <Button onClick={handleConfirm} loading={loading} disabled={!preview.canMove}>Move location</Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
