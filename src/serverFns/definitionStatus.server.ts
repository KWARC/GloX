import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";
import { FileIdentity } from "./latex.server";

export const updateDefinitionsStatusByIdentity = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: {
      identity: FileIdentity;
      status:
        | "EXTRACTED"
        | "FINALIZED_IN_FILE"
        | "SUBMITTED_TO_MATHHUB"
        | "DISCARDED";
      discardedReason?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await currentUser();
    if (!user.loggedIn) throw new Error("Unauthorized");

    await prisma.definition.updateMany({
      where: {
        documentId: data.identity.documentId,
        futureRepo: data.identity.futureRepo,
        filePath: data.identity.filePath,
        fileName: data.identity.fileName,
        language: data.identity.language,
      },
      data: {
        status: data.status,
        discardedReason: data.discardedReason ?? null,
      },
    });

    return { success: true };
  });

export const getDefinitionFileStatus = createServerFn({ method: "POST" })
  .inputValidator((data: FileIdentity) => data)
  .handler(async ({ data }) => {
    const result = await prisma.definition.findFirst({
      where: {
        documentId: data.documentId,
        futureRepo: data.futureRepo,
        filePath: data.filePath,
        fileName: data.fileName,
        language: data.language,
      },
      select: {
        status: true,
        discardedReason: true,
      },
    });

    return (
      result ?? {
        status: "EXTRACTED",
        discardedReason: null,
      }
    );
  });
