export async function uploadPdfApi(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("UPLOAD_FAILED");
  return res.json();
}
