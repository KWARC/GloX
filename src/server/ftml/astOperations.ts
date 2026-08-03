export type { TextLocation } from "@/server/ftml/statementContent";
export {
  extractTextContent,
  findAllTextOccurrences,
  pathTraversesSemanticNode,
  replaceTextWithNode,
} from "@/server/ftml/statementContent";

export function cloneAst<T>(ast: T): T {
  return structuredClone(ast);
}
