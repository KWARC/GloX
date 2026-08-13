/** PDF extract rows always have documentId; module definition rows have moduleDescriptionId. */

export const documentFloDownBlockWhere = {
  documentId: { not: null },
} as const;

export function moduleDefinitionWhere(moduleDescriptionId: string) {
  return {
    moduleDescriptionId,
    documentId: null,
  } as const;
}
