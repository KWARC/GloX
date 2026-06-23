import fs from "node:fs";
import path from "node:path";
import PDFParser from "pdf2json";
import { fromPath } from "pdf2pic";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const TARGET_IMAGE_WIDTH = 1200;

type PdfPageSize = {
  width: number;
  height: number;
};

type PdfParserPage = {
  Width?: number;
  Height?: number;
};

type PdfParserData = {
  Pages?: PdfParserPage[];
};

type PdfParserError = Error | { parserError: Error };

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

function getBaseName(filename: string): string {
  return safeName(filename).replace(/\.[^/.]+$/, "");
}

export function getPdfPath(filename: string): string {
  return path.join(UPLOADS_DIR, safeName(filename));
}

export function getPageImagesDir(filename: string): string {
  return path.join(UPLOADS_DIR, getBaseName(filename));
}

export function getPageImagePath(filename: string, pageNumber: number): string {
  return path.join(getPageImagesDir(filename), `page-${pageNumber}.jpg`);
}

export function savePdfToDisk(buffer: Buffer, filename: string): string {
  ensureDir(UPLOADS_DIR);

  const pdfPath = getPdfPath(filename);

  if (!fs.existsSync(pdfPath)) {
    fs.writeFileSync(pdfPath, buffer);
  }

  return pdfPath;
}

async function getPdfPageSizes(pdfPath: string): Promise<PdfPageSize[]> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(undefined, true);
    let finished = false;

    const originalWarn = console.warn;
    console.warn = (...args: [unknown, ...unknown[]]) => {
      const msg = String(args[0] ?? "");
      if (
        msg.includes("Unsupported: field.type") ||
        msg.includes("NOT valid form element") ||
        msg.includes("Setting up fake worker")
      ) {
        return;
      }

      originalWarn(...args);
    };

    const cleanup = () => {
      console.warn = originalWarn;
    };

    const timeout = setTimeout(() => {
      if (finished) return;

      finished = true;
      cleanup();
      parser.destroy();
      reject(new Error("PDF page size parsing timeout"));
    }, 30000);

    parser.on("pdfParser_dataError", (err: PdfParserError) => {
      if (finished) return;

      finished = true;
      clearTimeout(timeout);
      cleanup();
      reject(err instanceof Error ? err : err.parserError);
    });

    parser.on("pdfParser_dataReady", (pdfData: PdfParserData) => {
      if (finished) return;

      finished = true;
      clearTimeout(timeout);
      cleanup();

      if (!pdfData.Pages?.length) {
        reject(new Error("Invalid PDF"));
        return;
      }

      const pageSizes = pdfData.Pages.map((page, index) => {
        if (!page.Width || !page.Height) {
          throw new Error(`Missing size metadata for page ${index + 1}`);
        }

        return {
          width: page.Width,
          height: page.Height,
        };
      });

      resolve(pageSizes);
    });

    parser.loadPDF(pdfPath);
  });
}

function getRenderSize(pageSize: PdfPageSize): PdfPageSize {
  const aspectRatio = pageSize.height / pageSize.width;

  return {
    width: TARGET_IMAGE_WIDTH,
    height: Math.max(1, Math.round(TARGET_IMAGE_WIDTH * aspectRatio)),
  };
}

export async function convertPdfToImages(
  filename: string,
  pageCount: number,
): Promise<void> {
  const imagesDir = getPageImagesDir(filename);
  const pdfPath = getPdfPath(filename);

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found: ${pdfPath}`);
  }

  ensureDir(imagesDir);

  const allExist = Array.from({ length: pageCount }, (_, i) => i + 1).every(
    (n) => fs.existsSync(getPageImagePath(filename, n)),
  );

  if (allExist) return;
  const pageSizes = await getPdfPageSizes(pdfPath);

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const finalPath = getPageImagePath(filename, pageNumber);

    if (fs.existsSync(finalPath)) continue;

    const pageSize = pageSizes[pageNumber - 1];
    if (!pageSize) {
      throw new Error(`Missing size metadata for page ${pageNumber}`);
    }

    const renderSize = getRenderSize(pageSize);
    const converter = fromPath(pdfPath, {
      density: 150,
      saveFilename: "page",
      savePath: imagesDir,
      format: "jpg",
      width: renderSize.width,
      height: renderSize.height,
    });

    const result = await converter(pageNumber, { responseType: "image" });

    if (!result?.path) {
      throw new Error(`Failed to generate image for page ${pageNumber}`);
    }

    const generated = path.join(imagesDir, `page.${pageNumber}.jpg`);

    if (generated !== finalPath && fs.existsSync(generated)) {
      fs.renameSync(generated, finalPath);
    }

    if (!fs.existsSync(finalPath)) {
      throw new Error(`Image missing after conversion for page ${pageNumber}`);
    }
  }
}
