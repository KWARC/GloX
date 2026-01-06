import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

export type ExtractedPage = {
  pageNumber: number;
  text: string;
};

export async function extractPdfPages(
  buffer: Buffer
): Promise<ExtractedPage[]> {
  const uint8Array = new Uint8Array(buffer);

  const loadingTask = pdfjs.getDocument({
    data: uint8Array,
    disableWorker: true,
  });

  const pdf = await loadingTask.promise;

  const pages: ExtractedPage[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const text = content.items
      .map((item: any) => item.str)
      .join(" ")
      .trim();

    pages.push({
      pageNumber: pageNum,
      text,
    });
  }

  return pages;
}
