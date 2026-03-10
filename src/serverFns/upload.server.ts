import { requireUserId } from "@/server/auth/requireUser";
import { uploadDocument } from "@/server/document/document.service";
import type { UploadDocumentResult } from "@/server/document/document.types";
import { createServerFn } from "@tanstack/react-start";

export const uploadPdf = createServerFn({ method: "POST" })
  .inputValidator((data: FormData) => data)
  .handler(async ({ data }): Promise<UploadDocumentResult> => {
    const userId = requireUserId();

    const file = data.get("file");
    const futureRepo = data.get("futureRepo") as string;
    const filePath = data.get("filePath") as string;
    const language = data.get("language") as string;

    if (!(file instanceof File)) {
      throw new Error("No file provided");
    }

    return uploadDocument({
      file,
      userId,
      futureRepo,
      filePath,
      language,
    });
  });
