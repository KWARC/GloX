import prisma from "@/lib/prisma";
import { requireAdminOrCurator } from "@/server/auth/requireAdminOrCurator";
import {
  parseDeclaredSymbolsInfo,
  setDeclarationConfirmation,
} from "@/server/declaredSymbolsInfo";
import { createServerFn } from "@tanstack/react-start";

export const confirmSymbolNotDuplicate = createServerFn({ method: "POST" })
  .inputValidator((data: { symbolId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAdminOrCurator();

    const symbolUri = data.symbolId.trim();
    const blocks = await prisma.floDownBlock.findMany({
      where: { status: { not: "DISCARDED" } },
      select: { id: true, declaredSymbolsInfo: true },
    });
    const owner = blocks.find((block) =>
      parseDeclaredSymbolsInfo(block.declaredSymbolsInfo).some(
        (item) => item.symbolUri === symbolUri,
      ),
    );
    if (!owner) throw new Error("Symbol not found");

    const next = setDeclarationConfirmation(
      parseDeclaredSymbolsInfo(owner.declaredSymbolsInfo),
      symbolUri,
      {
        hasConfirmed: true,
        confirmedById: user.id,
        confirmedBy: user.displayName,
      },
    );

    return prisma.floDownBlock.update({
      where: { id: owner.id },
      data: { declaredSymbolsInfo: next },
    });
  });

export const undoSymbolConfirmation = createServerFn({ method: "POST" })
  .inputValidator((data: { symbolId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminOrCurator();
    const symbolUri = data.symbolId.trim();
    const blocks = await prisma.floDownBlock.findMany({
      where: { status: { not: "DISCARDED" } },
      select: { id: true, declaredSymbolsInfo: true },
    });
    const owner = blocks.find((block) =>
      parseDeclaredSymbolsInfo(block.declaredSymbolsInfo).some(
        (item) => item.symbolUri === symbolUri,
      ),
    );
    if (!owner) throw new Error("Symbol not found");

    const next = setDeclarationConfirmation(
      parseDeclaredSymbolsInfo(owner.declaredSymbolsInfo),
      symbolUri,
      {
        hasConfirmed: false,
        confirmedById: null,
        confirmedBy: null,
      },
    );

    return prisma.floDownBlock.update({
      where: { id: owner.id },
      data: { declaredSymbolsInfo: next },
    });
  });
