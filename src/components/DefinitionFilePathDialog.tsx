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
  bulkDefinition?: FileIdentity; 
  invalidateKey: QueryKey;
}

export function DefinitionIdentityDialog({
  opened,
  onClose,
  definition,
  invalidateKey,
  bulkDefinition,
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
    } else if (bulkDefinition) {
      setFutureRepo(bulkDefinition.futureRepo);
      setFilePath(bulkDefinition.filePath);
      setFileName(bulkDefinition.fileName);
      setLanguage(bulkDefinition.language);
    }
  }, [definition, bulkDefinition]);

  async function handleSave() {
    if (bulkDefinition) {
      await updateDefinitionsFilePath({
        data: {
          identity: bulkDefinition,
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
          label="Archive"
          placeholder="e.g. smglom/algebra"
          value={futureRepo}
          onChange={(e) => setFutureRepo(e.currentTarget.value)}
        />
        <TextInput
          label="Module Path"
          placeholder="e.g. mod"
          value={filePath}
          onChange={(e) => setFilePath(e.currentTarget.value)}
        />
        <TextInput
          label="Module"
          placeholder="e.g. group-theory"
          value={fileName}
          onChange={(e) => setFileName(e.currentTarget.value)}
        />
        <TextInput
          label="Language"
          placeholder="e.g. en, de, fr"
          value={language}
          onChange={(e) => setLanguage(e.currentTarget.value)}
        />
        <Button onClick={handleSave}>Save</Button>
      </Stack>
    </Modal>
  );
}
