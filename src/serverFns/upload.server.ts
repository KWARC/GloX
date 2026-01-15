import { uploadDocument } from "@/server/document/document.service";
import { createServerFn } from "@tanstack/react-start";
import { getSessionUser } from "@/server/auth/authSession";
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

    const userId = getSessionUser();
    if (!userId) {
      throw new Error("User not logged in");
    }

    console.log("Uploading document:", file.name);

    return uploadDocument({ file, userId });
  });
