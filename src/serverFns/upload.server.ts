import { uploadDocument } from "@/server/document/document.service";
import { createServerFn } from "@tanstack/react-start";
import { requireUserId } from "@/server/auth/authSession";
import type { UploadDocumentResult } from "@/server/document/document.types";

export const uploadPdf = createServerFn({ method: "POST" })
  .inputValidator((data: FormData) => data)
  .handler(async ({ data }): Promise<UploadDocumentResult> => {
    if (!(data instanceof FormData)) {
      throw new Error("Invalid upload payload");
    }

    const file = data.get("file");
    if (!(file instanceof File)) {
      throw new Error("No file provided");
    }

    const userId = requireUserId();

    console.log("Uploading document:", file.name, "for user", userId);

    return uploadDocument({ file, userId });
  });
