import type { FloDownLabDbSample } from "@/serverFns/flodownLab.server";

export type UriReplacement = {
  from: string;
  to: string;
  reason: string;
};

export type LabDebugSnapshot = {
  experimentId: string;
  experimentTitle: string;
  notes: string;
  ok: boolean;
  error: string | null;
  documentUriCreated: string | null;
  fromPathArgs: {
    archive: string;
    path: string | null;
    name: string;
    lang: unknown;
  } | null;
  getUriAfterCreate: string | null;
  declaredSymbolUris: { name: string; uri: string | undefined }[];
  isModule: boolean | null;
  addElementPayload: unknown;
  dbInlineUris: string[];
  replacedUris: UriReplacement[];
  stex: string | null;
  ftml: string | null;
  dbSample: FloDownLabDbSample | null;
};

export const EMPTY_SNAPSHOT: LabDebugSnapshot = {
  experimentId: "",
  experimentTitle: "",
  notes: "",
  ok: false,
  error: null,
  documentUriCreated: null,
  fromPathArgs: null,
  getUriAfterCreate: null,
  declaredSymbolUris: [],
  isModule: null,
  addElementPayload: null,
  dbInlineUris: [],
  replacedUris: [],
  stex: null,
  ftml: null,
  dbSample: null,
};
