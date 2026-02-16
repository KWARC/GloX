import { requireUserId } from "@/server/auth/requireUser";
import { uploadDocument } from "@/server/document/document.service";
import type { UploadDocumentResult } from "@/server/document/document.types";
import { createServerFn } from "@tanstack/react-start";

export const uploadPdf = createServerFn({ method: "POST" })
  .inputValidator((data: FormData) => data)
  .handler(async ({ data }): Promise<UploadDocumentResult> => {
    const userId = requireUserId();

    if (!(data instanceof FormData)) {
      throw new Error("Invalid upload payload");
    }

    const file = data.get("file");

    if (!(file instanceof File)) {
      throw new Error("No file provided");
    }

    console.log("Uploading:", file.name);

    return uploadDocument({ file, userId });
  });
