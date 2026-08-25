import { floDownUriReplacementsForMove } from "@/lib/floDownUriReplacements";
import { parseDeclaredSymbolsInfo } from "@/server/declaredSymbolsInfo";
import { queryClient } from "@/queryClient";
import { ExtractedItem } from "@/server/text-selection";
import {
  findFloDownBlocksByIdentity,
  updateFloDownBlockFilePath,
  updateFloDownBlocksFilePath,
} from "@/serverFns/extractFloDownBlock.server";
import { FileIdentity } from "@/serverFns/latex.server";
import { Button, Modal, Stack, TextInput } from "@mantine/core";
import type { QueryKey } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface Props {
  opened: boolean;
  onClose: () => void;
  floDownBlock: ExtractedItem | null;
  multipleDefinitions?: FileIdentity;
  invalidateKey: QueryKey;
}

export function FloDownBlockIdentityDialog({
  opened,
  onClose,
  floDownBlock,
  invalidateKey,
  multipleDefinitions: multipleDefinitions,
}: Props) {
  const [futureRepo, setFutureRepo] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [language, setLanguage] = useState("");

  useEffect(() => {
    if (floDownBlock) {
      setFutureRepo(floDownBlock.futureRepo);
      setFilePath(floDownBlock.filePath);
      setFileName(floDownBlock.fileName);
      setLanguage(floDownBlock.language);
    } else if (multipleDefinitions) {
      setFutureRepo(multipleDefinitions.futureRepo);
      setFilePath(multipleDefinitions.filePath);
      setFileName(multipleDefinitions.fileName);
      setLanguage(multipleDefinitions.language);
    }
  }, [floDownBlock, multipleDefinitions]);

  async function handleSave() {
    try {
      const target = {
        futureRepo: futureRepo.trim(),
        filePath: filePath.trim(),
        fileName: fileName.trim(),
        language: language.trim(),
      };
      if (multipleDefinitions) {
        const blocks = await findFloDownBlocksByIdentity({ data: multipleDefinitions });
        const uriReplacements = await floDownUriReplacementsForMove(
          blocks.flatMap((block) =>
            parseDeclaredSymbolsInfo(block.declaredSymbolsInfo).map((item) => ({
              symbolName: item.symbolName,
              symbolUri: item.symbolUri,
              fileName: block.fileName,
            })),
          ),
          target,
        );
        await updateFloDownBlocksFilePath({
          data: {
            identity: multipleDefinitions,
            ...target,
            uriReplacements,
          },
        });
      } else if (floDownBlock) {
        const uriReplacements = await floDownUriReplacementsForMove(
          parseDeclaredSymbolsInfo(floDownBlock.declaredSymbolsInfo).map((item) => ({
            symbolName: item.symbolName,
            symbolUri: item.symbolUri,
            fileName: floDownBlock.fileName,
          })),
          target,
        );
        await updateFloDownBlockFilePath({
          data: {
            id: floDownBlock.id,
            ...target,
            uriReplacements,
          },
        });
      }

      await queryClient.invalidateQueries({ queryKey: invalidateKey });
      onClose();
    } catch (e: any) {
      alert(e.message || "Failed to move definitions");
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Move Content File Path"
      centered
    >
      <Stack>
        <TextInput
          label="Future Repo"
          placeholder="e.g. smglom/algebra"
          value={futureRepo}
          onChange={(e) => setFutureRepo(e.currentTarget.value)}
        />
        <TextInput
          label="File Path"
          placeholder="e.g. mod"
          value={filePath}
          onChange={(e) => setFilePath(e.currentTarget.value)}
        />
        <TextInput
          label="File Name"
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
