import { myDocumentsQuery } from "@/queries/document";
import { uploadPdf } from "@/serverFns/upload.server";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const MODULE_DESCRIPTION_REPO = "courses/FAU";
const MODULE_DESCRIPTION_PATH = "module-description";

export function useDocumentUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingDocumentId, setExistingDocumentId] = useState<string | null>(
    null,
  );
  const [futureRepo, setFutureRepo] = useState("");
  const [filePath, setFilePath] = useState("");
  const [language, setLanguage] = useState("en");
  const [moduleDescription, setModuleDescription] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!moduleDescription) return;
    setFutureRepo(MODULE_DESCRIPTION_REPO);
    setFilePath(MODULE_DESCRIPTION_PATH);
  }, [moduleDescription]);

  const reset = () => {
    setFile(null);
    setLoading(false);
    setError(null);
    setExistingDocumentId(null);
    setFutureRepo("");
    setFilePath("");
    setLanguage("en");
    setModuleDescription(false);
  };

  const selectFile = (nextFile: File | null) => {
    setFile(nextFile);
    setError(null);
    setExistingDocumentId(null);
  };

  const upload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setExistingDocumentId(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("futureRepo", futureRepo);
      formData.append("filePath", filePath);
      formData.append("language", language);
      formData.append("moduleDescription", String(moduleDescription));

      const result = await uploadPdf({ data: formData });

      if (result?.documentId && result.status === "OK") {
        queryClient.invalidateQueries({ queryKey: myDocumentsQuery.queryKey });
        reset();
        navigate({
          to: "/files/$documentId",
          params: { documentId: result.documentId },
        });
        return;
      }

      if (result?.documentId && result.status === "DUPLICATE") {
        setExistingDocumentId(result.documentId);
        return;
      }

      setError("Upload failed. Please try again.");
    } catch (uploadError) {
      console.error(uploadError);
      setError("An error occurred during upload.");
    } finally {
      setLoading(false);
    }
  };

  const openExisting = () => {
    if (!existingDocumentId) return;

    reset();
    navigate({
      to: "/files/$documentId",
      params: { documentId: existingDocumentId },
    });
  };

  return {
    canUpload: !loading && !!file && !!futureRepo && !!filePath && !!language,
    error,
    existingDocumentId,
    file,
    filePath,
    futureRepo,
    language,
    loading,
    moduleDescription,
    openExisting,
    reset,
    selectFile,
    setFilePath,
    setFutureRepo,
    setLanguage,
    setModuleDescription,
    upload,
  };
}
