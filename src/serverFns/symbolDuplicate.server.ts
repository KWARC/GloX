import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";

export const confirmSymbolNotDuplicate = createServerFn({ method: "POST" })
  .inputValidator((data: { symbolId: string }) => data)
  .handler(async ({ data }) => {
    const user = await currentUser();

    return prisma.symbol.update({
      where: { id: data.symbolId },
      data: {
        hasConfirmed: true,
        confirmedById: user.user?.id,
      },
    });
  });

export const undoSymbolConfirmation = createServerFn({ method: "POST" })
  .inputValidator((data: { symbolId: string }) => data)
  .handler(async ({ data }) => {
    return prisma.symbol.update({
      where: { id: data.symbolId },
      data: {
        hasConfirmed: false,
        confirmedById: null,
      },
    });
  });
