import { queryClient } from "@/queryClient";
import { ExtractedItem } from "@/server/text-selection";
import {
  updateDefinitionFilePath,
  updateDefinitionsFilePath,
} from "@/serverFns/extractDefinition.server";
import { FileIdentity } from "@/serverFns/latex.server";
import { Button, Modal, Stack, TextInput } from "@mantine/core";
import type { QueryKey } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface Props {
  opened: boolean;
  onClose: () => void;
  definition: ExtractedItem | null;
  bulkIdentity?: FileIdentity;
  invalidateKey: QueryKey;
}

export function DefinitionIdentityDialog({
  opened,
  onClose,
  definition,
  invalidateKey,
  bulkIdentity,
}: Props) {
  const [futureRepo, setFutureRepo] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [language, setLanguage] = useState("");

  useEffect(() => {
    if (definition) {
      setFutureRepo(definition.futureRepo);
      setFilePath(definition.filePath);
      setFileName(definition.fileName);
      setLanguage(definition.language);
    } else if (bulkIdentity) {
      setFutureRepo(bulkIdentity.futureRepo);
      setFilePath(bulkIdentity.filePath);
      setFileName(bulkIdentity.fileName);
      setLanguage(bulkIdentity.language);
    }
  }, [definition, bulkIdentity]);

  async function handleSave() {
    if (bulkIdentity) {
      await updateDefinitionsFilePath({
        data: {
          identity: bulkIdentity,
          futureRepo: futureRepo.trim(),
          filePath: filePath.trim(),
          fileName: fileName.trim(),
          language: language.trim(),
        },
      });
    } else if (definition) {
      await updateDefinitionFilePath({
        data: {
          id: definition.id,
          futureRepo: futureRepo.trim(),
          filePath: filePath.trim(),
          fileName: fileName.trim(),
          language: language.trim(),
        },
      });
    }

    await queryClient.invalidateQueries({ queryKey: invalidateKey });

    onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Move Definition File Path"
      centered
    >
      <Stack>
        <TextInput
          label="Future Repo"
          value={futureRepo}
          onChange={(e) => setFutureRepo(e.currentTarget.value)}
        />

        <TextInput
          label="File Path"
          value={filePath}
          onChange={(e) => setFilePath(e.currentTarget.value)}
        />

        <TextInput
          label="File Name"
          value={fileName}
          onChange={(e) => setFileName(e.currentTarget.value)}
        />

        <TextInput
          label="Language"
          value={language}
          onChange={(e) => setLanguage(e.currentTarget.value)}
        />

        <Button onClick={handleSave}>Save</Button>
      </Stack>
    </Modal>
  );
}
