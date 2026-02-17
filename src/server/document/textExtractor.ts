import PDFParser from "pdf2json";

export type ExtractedPage = {
  pageNumber: number;
  text: string;
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function extractPdfPages(
  buffer: Buffer,
): Promise<ExtractedPage[]> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(undefined, true);

    let finished = false;

    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
      const message = String(args[0] ?? "");

      if (
        message.includes("Unsupported: field.type") ||
        message.includes("NOT valid form element") ||
        message.includes("Setting up fake worker")
      ) {
        return;
      }

      originalWarn(...args);
    };

    const cleanup = () => {
      console.warn = originalWarn;
    };

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        parser.destroy();
        reject(new Error("PDF parsing timeout (30s)"));
      }
    }, 30000);

    parser.on("pdfParser_dataError", (err: any) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      cleanup();
      reject(err?.parserError ?? err);
    });

    parser.on("pdfParser_dataReady", (pdfData: any) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      cleanup();

      try {
        if (!pdfData?.Pages) {
          return reject(new Error("Invalid PDF structure"));
        }

        const pages: ExtractedPage[] = pdfData.Pages.map(
          (page: any, index: number) => {
            const text = (page.Texts ?? [])
              .flatMap((t: any) =>
                (t.R ?? []).map((r: any) => (r.T ? safeDecode(r.T) : "")),
              )
              .join(" ")
              .trim();

            return {
              pageNumber: index + 1,
              text,
            };
          },
        );

        resolve(pages);
      } catch (e) {
        reject(e);
      }
    });

    try {
      parser.parseBuffer(buffer);
    } catch (e) {
      clearTimeout(timeout);
      cleanup();
      reject(e);
    }
  });
}
