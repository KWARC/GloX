import { createServerFn } from "@tanstack/react-start";
import { uploadDocument } from "../api/documents/document.service";
import type { UploadDocumentResult } from "../api/documents/document.types";
import { getSessionUser } from "../server/authSession";

export const uploadPdf = createServerFn({ method: "POST" }).handler(
  async (ctx: any): Promise<UploadDocumentResult> => {
    const formData = ctx.data || (await ctx.request?.formData());
    console.log("Received formData:", formData);
    if (!formData) {
      throw new Error("No form data received");
    }

    const file = formData.get("file") as File;
    const userId = getSessionUser();
    if (!userId) {
      throw new Error("User not logged in");
    }
    console.log("Extracted file:", file);
    if (!file) {
      throw new Error("No file provided");
    }
    console.log("Uploading document:", file.name);
    return uploadDocument({ file, userId });
  }
);