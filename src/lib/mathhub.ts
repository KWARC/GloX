export function normalizeMathHubPreviewUrl(uri: string): string {
  try {
    const url = new URL(uri);

    if (url.protocol === "http:" && url.hostname.endsWith("mathhub.info")) {
      url.protocol = "https:";
      return url.toString();
    }

    return uri;
  } catch {
    return uri;
  }
}
