import { zipSync, strToU8 } from "fflate";
import { parseDocumentUri } from "@/lib/flodownUris";

export const MODULE_DESCRIPTIONS_TEX_ZIP_FILE_NAME = "module-descriptions-latex.zip";

export type TexZipFile = {
  fileName: string;
  tex: string;
  uri: string;
};

export type TexZipEntry = {
  zipPath: string;
  content: string;
};

/** Zip path: `{a}/{p}/{fileName}` from a FloDown document URI. */
export function texZipPathFromDocumentUri(uri: string, fileName: string): string {
  const { archive, path } = parseDocumentUri(uri);
  const segments = [archive];
  if (path?.trim()) {
    segments.push(path.trim());
  }
  segments.push(fileName);
  return segments.join("/");
}

export function buildTexZipEntries(files: readonly TexZipFile[]): TexZipEntry[] {
  return files.map((file) => ({
    zipPath: texZipPathFromDocumentUri(file.uri, file.fileName),
    content: file.tex,
  }));
}

export function createTexZipBlob(entries: readonly TexZipEntry[]): Blob {
  const zipData: Record<string, Uint8Array> = {};
  for (const entry of entries) {
    zipData[entry.zipPath] = strToU8(entry.content);
  }
  const zipped = zipSync(zipData);
  return new Blob([zipped], { type: "application/zip" });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function defaultTexZipFileName(files: readonly TexZipFile[]): string {
  if (files.length === 0) {
    return "tex-export.zip";
  }
  const { name } = parseDocumentUri(files[0].uri);
  return `${name}-latex.zip`;
}

export function downloadTexFilesAsZip(
  files: readonly TexZipFile[],
  zipFileName?: string,
): void {
  const entries = buildTexZipEntries(files);
  const blob = createTexZipBlob(entries);
  downloadBlob(blob, zipFileName ?? defaultTexZipFileName(files));
}
