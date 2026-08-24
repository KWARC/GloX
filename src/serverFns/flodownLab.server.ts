import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";

export type FloDownLabDbSample = {
  kind: "floDownBlock" | "moduleDescription";
  id: string;
  label: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
  declaredSymbols: string[];
  statement: object;
};

async function labUserOrNone() {
  const userRes = await currentUser();
  if (!userRes.loggedIn) return null;
  const role = userRes.user.role;
  if (role !== "ADMIN" && role !== "CURATOR") return null;
  return { userId: userRes.user.id, role };
}

/** Recent rows for the FloDown lab debug pane. Admin sees all; Curator sees own. Guests get none. */
export const listFloDownLabSamples = createServerFn({ method: "POST" }).handler(
  async (): Promise<FloDownLabDbSample[]> => {
    const labUser = await labUserOrNone();
    if (!labUser) return [];
    const { userId, role } = labUser;
    const ownOnly = role !== "ADMIN" ? { createdById: userId } : {};

    const [blocks, modules] = await Promise.all([
      prisma.floDownBlock.findMany({
        where: ownOnly,
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true,
          originalText: true,
          statement: true,
          declaredSymbols: true,
          futureRepo: true,
          filePath: true,
          fileName: true,
          language: true,
          moduleDescriptionId: true,
        },
      }),
      prisma.moduleDescription.findMany({
        where: ownOnly,
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          id: true,
          moduleId: true,
          titleStatement: true,
          inhaltStatement: true,
          lernzieleStatement: true,
          futureRepo: true,
          modulesFilePath: true,
          language: true,
        },
      }),
    ]);

    const blockSamples: FloDownLabDbSample[] = blocks.map((block) => ({
      kind: "floDownBlock",
      id: block.id,
      label: `${block.fileName} (${block.originalText.slice(0, 40)})`,
      futureRepo: block.futureRepo,
      filePath: block.filePath,
      fileName: block.fileName,
      language: block.language,
      declaredSymbols: block.declaredSymbols,
      statement: block.statement as object,
    }));

    const moduleSamples: FloDownLabDbSample[] = modules.map((mod) => ({
      kind: "moduleDescription",
      id: mod.id,
      label: `module ${mod.moduleId}`,
      futureRepo: mod.futureRepo,
      filePath: mod.modulesFilePath,
      fileName: mod.moduleId,
      language: mod.language,
      declaredSymbols: [],
      statement: {
        titleStatement: mod.titleStatement as object,
        inhaltStatement: mod.inhaltStatement as object,
        lernzieleStatement: mod.lernzieleStatement as object,
      },
    }));

    return [...moduleSamples, ...blockSamples];
  },
);
