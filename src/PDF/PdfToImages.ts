import fs from "node:fs";
import path from "node:path";
import { fromPath } from "pdf2pic";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

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
  return path.join(UPLOADS_DIR, getBaseName(filename)); // <-- FIX
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

export async function convertPdfToImages(
  filename: string,
  pageCount: number,
): Promise<void> {
  const imagesDir = getPageImagesDir(filename);
  const pdfPath = getPdfPath(filename);

  ensureDir(imagesDir);

  const allExist = Array.from({ length: pageCount }, (_, i) => i + 1).every(
    (n) => fs.existsSync(getPageImagePath(filename, n)),
  );

  if (allExist) return;

  const converter = fromPath(pdfPath, {
    density: 150,
    saveFilename: "page",
    savePath: imagesDir,
    format: "jpg",
    width: 1200,
    height: 500,
  });

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const finalPath = getPageImagePath(filename, pageNumber);

    if (fs.existsSync(finalPath)) continue;

    const result = await converter(pageNumber, { responseType: "image" });

    if (!result?.path) throw new Error(`Failed page ${pageNumber}`);

    const generated = path.join(imagesDir, `page.${pageNumber}.jpg`);

    if (generated !== finalPath && fs.existsSync(generated)) {
      fs.renameSync(generated, finalPath);
    }

    if (!fs.existsSync(finalPath)) {
      throw new Error(`Missing page ${pageNumber}`);
    }
  }
}
