import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  console.log("PDFJS: getDocument start");

  // 🔴 REQUIRED: convert Buffer → Uint8Array
  const uint8Array = new Uint8Array(buffer);

  const loadingTask = pdfjs.getDocument({
    data: uint8Array,
    disableWorker: true,
  });

  const pdf = await loadingTask.promise;

  console.log("PDFJS: loaded, pages =", pdf.numPages);

  let text = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    text +=
      content.items
        .map((item: any) => item.str)
        .join(" ") + "\n";
  }

  console.log("PDFJS: extraction done");

  return text.trim();
}
