export type UnifiedSymbolicReference =
  | {
      source: "MATHHUB";
      uri: string;
    }
  | {
      source: "DB";
      symbolName: string;
      symbolUri?: string;
      futureRepo: string;
      filePath: string;
      fileName: string;
      language: string;
    };
