export function injectProvenance(
  stexSource: string,
  provenance?: {
    documentName: string;
    pageNumber: number;
  }[],
) {
  if (!stexSource || !provenance?.length) return stexSource;

  const unique = Array.from(
    new Map(
      provenance.map((p) => [`${p.documentName}-${p.pageNumber}`, p]),
    ).values(),
  );

  const lines = unique.map(
    (p) =>
      `%%% The content of this file was extracted from ${p.documentName}(page ${p.pageNumber}) using Glox`,
  );

  return `${stexSource.trim()}

${lines.join("\n")}
`;
}
