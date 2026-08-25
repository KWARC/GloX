import { collectInlineUris } from "./collectInlineUris";
import {
  EMPTY_SNAPSHOT,
  type LabDebugSnapshot,
  type UriReplacement,
} from "./labTypes";
import type { FloDownLabDbSample } from "@/serverFns/flodownLab.server";
import { documentUri, documentUriFromGlox } from "@/lib/flodownUris";
import { mountStatementOnFloDown } from "@/lib/prepareFloDownStatement";

type FloDownBlock = {
  addElement: (node: unknown) => void;
  addSymbolDeclaration: (name: string) => string | undefined;
  mountTo: (node: HTMLElement) => void;
  getUri: () => string;
  getStex: () => string;
  getFtml: () => string;
  isModule: () => boolean;
  clear: () => void;
  clearText: () => void;
};

type FloDownLib = {
  FloDown: {
    fromUri: (uri: string) => FloDownBlock;
    fromPath: (
      archive: string,
      path: string | null | undefined,
      name: string,
      lang: unknown,
    ) => FloDownBlock | undefined;
  };
};

export type LabExperiment = {
  id: string;
  group: string;
  title: string;
  notes: string;
  usesDbRow?: boolean;
};

export const LAB_EXPERIMENTS: LabExperiment[] = [
  {
    id: "e1",
    group: "E1",
    title: "Clone test.html",
    notes: "Vendor sample shape on mathhub.info: fromUri, MathHub symref, addSymbolDeclaration, same-block definition.",
  },
  {
    id: "e2-unknown",
    group: "E2",
    title: "fromUri mathhub a=no/archive",
    notes: "http://mathhub.info?a=no/archive&d=unknown_document&l=en",
  },
  {
    id: "e2-mathhub-simple",
    group: "E2",
    title: "fromUri mathhub.info a=test d=test",
    notes: "http://mathhub.info?a=test&d=test&l=en",
  },
  {
    id: "e2-mathhub-smglom",
    group: "E2",
    title: "fromUri mathhub.info smglom + p=",
    notes: "http://mathhub.info?a=smglom/algebra&p=mod&d=Boolean-algebra&l=en",
  },
  {
    id: "e2-vendor-glox-numeric",
    group: "E2",
    title: "fromUri mathhub + GloX archive, d=33995",
    notes: "http://mathhub.info?a=courses/FAU/module-descriptions&p=modules&d=33995&l=de",
  },
  {
    id: "e2-vendor-glox-named",
    group: "E2",
    title: "fromUri mathhub + GloX archive, d=mod33995",
    notes: "http://mathhub.info?a=courses/FAU/module-descriptions&p=modules&d=mod33995&l=de",
  },
  {
    id: "e3-frompath-num-en",
    group: "E3",
    title: "fromPath lang=0 (English enum)",
    notes: "fromPath('test', null, 'test', 0)",
  },
  {
    id: "e3-frompath-str-en",
    group: "E3",
    title: "fromPath lang='English'",
    notes: "fromPath('test', null, 'test', 'English')",
  },
  {
    id: "e3-frompath-glox-de",
    group: "E3",
    title: "fromPath GloX archive lang=1 (German)",
    notes: "fromPath('courses/FAU/module-descriptions', 'modules', '33995', 1)",
  },
  {
    id: "e4-symdecl",
    group: "E4",
    title: "Local symbol via addSymbolDeclaration only",
    notes: "No concatenated futureRepo. Use returned URI in definiendum/symref/for_symbols.",
  },
  {
    id: "e5-same-fd",
    group: "E5",
    title: "Cross-block: definition + paragraph in one fd",
    notes: "GloX-shaped short-name statement rewritten only via addSymbolDeclaration.",
  },
  {
    id: "e5-two-visible",
    group: "E5",
    title: "Cross-block: two visible FloDown instances",
    notes: "Definition on fdB, paragraph on fdA. Second mount is visible.",
  },
  {
    id: "e5-hidden",
    group: "E5",
    title: "Cross-block: hidden second fd (current GloX pattern)",
    notes: "fdB mounted with display:none.",
  },
  {
    id: "e5-short-name",
    group: "E5",
    title: "Short name uri:'foobar' with no declaration",
    notes: "Expect Inline serde failure if FloDown requires a SymbolUri.",
  },
  {
    id: "e7-hover-same-fd",
    group: "E7",
    title: "Hover: def + symref on one visible fd",
    notes:
      "Control. Hover foobar. Expect popup: same fd called addSymbolDeclaration and addElement(definition).",
  },
  {
    id: "e7-hover-two-visible",
    group: "E7",
    title: "Hover: def on second visible fd (no hidden)",
    notes:
      "Paragraph on visible mount, definition on second mount. Hover works because those FloDown calls ran on the second fd.",
  },
  {
    id: "e7-hover-decl-only",
    group: "E7",
    title: "Hover: addSymbolDeclaration, no definition element",
    notes:
      "Expect no local popup. FloDown only resolves locally after declaration + definition addElement; otherwise it hits MathHub /content/fragment.",
  },
  {
    id: "e7-hover-known-uri",
    group: "E7",
    title: "Hover: constructed SymbolUri, no live definition",
    notes:
      "Expect no local popup. Constructed URI without addSymbolDeclaration + definition is a MathHub lookup.",
  },
  {
    id: "e8-triangle-same-fd",
    group: "E8",
    title: "Triangle: one declaration, two definitions, one fd",
    notes:
      "E-FTML-06. addSymbolDeclaration('triangle') once. English definiendum triangle + German definiendum Dreieck, both for_symbols/uri = that return value. No second declaration.",
  },
  {
    id: "e8-triangle-three-docs",
    group: "E8",
    title: "Triangle: en declares; de defines; third doc symrefs",
    notes:
      "Three documents: d=triangle l=en declares+defines; d=triangle l=de defines Dreieck with the EN URI (no addSymbolDeclaration); d=triangle-sum-of-angles l=en paragraph symrefs that URI. Contrast production minting a URI from the importing file.",
  },
  {
    id: "db-raw",
    group: "DB",
    title: "addElement selected DB statement verbatim",
    notes: "No URI rewrite. Shows whether persisted JSON is already FloDown-valid.",
    usesDbRow: true,
  },
  {
    id: "db-rewrite",
    group: "DB",
    title: "DB + rewrite (vendor documentUri + addSymbolDeclaration)",
    notes: "fromUri mathhub.info?a=&p=&d=&l=; rewrite short names before addElement. Does not write DB.",
    usesDbRow: true,
  },
];

const MATHHUB_BOOLEAN_URI =
  "http://mathhub.info?a=smglom/algebra&p=mod&m=Boolean-algebra&s=Boolean algebra";

const LAB_TEST_DOC = documentUri({
  archive: "test",
  name: "test",
  language: "en",
});

const MATHHUB_SYMREF = {
  type: "symref" as const,
  uri: MATHHUB_BOOLEAN_URI,
  content: ["Boolean algebras"],
};

function tinyParagraph() {
  return {
    type: "paragraph" as const,
    content: ["lab paragraph ", MATHHUB_SYMREF],
  };
}

function captureBlock(fd: FloDownBlock) {
  return {
    getUriAfterCreate: fd.getUri(),
    isModule: fd.isModule(),
    stex: fd.getStex(),
    ftml: fd.getFtml(),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function mountAndRetain(
  fd: FloDownBlock,
  mountEl: HTMLElement,
  retain: FloDownBlock[],
) {
  retain.push(fd);
  mountEl.innerHTML = "";
  fd.mountTo(mountEl);
}

export function runLabExperiment(params: {
  experimentId: string;
  floDown: FloDownLib;
  mountEl: HTMLElement;
  hiddenEl: HTMLElement;
  thirdEl: HTMLElement;
  retain: FloDownBlock[];
  dbSample: FloDownLabDbSample | null;
}): LabDebugSnapshot {
  const experiment = LAB_EXPERIMENTS.find((item) => item.id === params.experimentId);
  if (!experiment) {
    return { ...EMPTY_SNAPSHOT, error: `Unknown experiment ${params.experimentId}` };
  }

  const snapshot: LabDebugSnapshot = {
    ...EMPTY_SNAPSHOT,
    experimentId: experiment.id,
    experimentTitle: experiment.title,
    notes: experiment.notes,
    dbSample: params.dbSample,
    dbInlineUris: params.dbSample
      ? collectInlineUris(params.dbSample.statement)
      : [],
  };

  params.retain.length = 0;
  params.mountEl.innerHTML = "";
  params.hiddenEl.innerHTML = "";
  params.hiddenEl.style.display = "none";
  params.thirdEl.innerHTML = "";
  params.thirdEl.style.display = "none";

  try {
    runExperimentBody(experiment.id, params, snapshot);
    snapshot.ok = true;
  } catch (error) {
    snapshot.ok = false;
    snapshot.error = errorMessage(error);
  }

  return snapshot;
}

function runExperimentBody(
  id: string,
  params: {
    floDown: FloDownLib;
    mountEl: HTMLElement;
    hiddenEl: HTMLElement;
    thirdEl: HTMLElement;
    retain: FloDownBlock[];
    dbSample: FloDownLabDbSample | null;
  },
  snapshot: LabDebugSnapshot,
) {
  const { floDown, mountEl, retain } = params;

  if (id === "e1" || id === "e4-symdecl") {
    snapshot.documentUriCreated = LAB_TEST_DOC;
    const fd = floDown.FloDown.fromUri(LAB_TEST_DOC);
    mountAndRetain(fd, mountEl, retain);
    snapshot.getUriAfterCreate = fd.getUri();

    const localName = "foobar";
    const symbol = fd.addSymbolDeclaration(localName);
    snapshot.declaredSymbolUris.push({ name: localName, uri: symbol });

    const paragraph = {
      type: "paragraph",
      content: [
        "test: ",
        MATHHUB_SYMREF,
        " and local ",
        { type: "symref", uri: symbol, content: ["here"] },
      ],
    };
    const definition = {
      type: "definition",
      for_symbols: symbol ? [symbol] : [],
      content: [
        {
          type: "paragraph",
          content: [
            "A ",
            { type: "definiendum", uri: symbol, content: [localName] },
            " is ",
            { type: "definiens", uri: symbol, content: ["a lab symbol."] },
          ],
        },
      ],
    };
    snapshot.addElementPayload = [paragraph, definition];
    snapshot.replacedUris = [
      {
        from: localName,
        to: symbol ?? "(undefined)",
        reason: "addSymbolDeclaration return value",
      },
    ];
    fd.addElement(paragraph);
    fd.addElement({ type: "thematicbreak" });
    fd.addElement(definition);
    Object.assign(snapshot, captureBlock(fd));
    return;
  }

  if (id.startsWith("e2-")) {
    const uris: Record<string, string> = {
      "e2-unknown": documentUri({
        archive: "no/archive",
        name: "unknown_document",
        language: "en",
      }),
      "e2-mathhub-simple": documentUri({
        archive: "test",
        name: "test",
        language: "en",
      }),
      "e2-mathhub-smglom": documentUri({
        archive: "smglom/algebra",
        path: "mod",
        name: "Boolean-algebra",
        language: "en",
      }),
      "e2-vendor-glox-numeric": documentUri({
        archive: "courses/FAU/module-descriptions",
        path: "modules",
        name: "33995",
        language: "de",
      }),
      "e2-vendor-glox-named": documentUri({
        archive: "courses/FAU/module-descriptions",
        path: "modules",
        name: "mod33995",
        language: "de",
      }),
    };
    const uri = uris[id];
    snapshot.documentUriCreated = uri;
    const fd = floDown.FloDown.fromUri(uri);
    mountAndRetain(fd, mountEl, retain);
    snapshot.getUriAfterCreate = fd.getUri();
    snapshot.addElementPayload = tinyParagraph();
    fd.addElement(snapshot.addElementPayload);
    Object.assign(snapshot, captureBlock(fd));
    return;
  }

  if (id.startsWith("e3-")) {
    const args: Record<
      string,
      { archive: string; path: string | null; name: string; lang: unknown }
    > = {
      "e3-frompath-num-en": { archive: "test", path: null, name: "test", lang: 0 },
      "e3-frompath-str-en": {
        archive: "test",
        path: null,
        name: "test",
        lang: "English",
      },
      "e3-frompath-glox-de": {
        archive: "courses/FAU/module-descriptions",
        path: "modules",
        name: "33995",
        lang: 1,
      },
    };
    const chosen = args[id];
    snapshot.fromPathArgs = chosen;
    const fd = floDown.FloDown.fromPath(
      chosen.archive,
      chosen.path,
      chosen.name,
      chosen.lang,
    );
    if (!fd) {
      throw new Error("fromPath returned undefined");
    }
    mountAndRetain(fd, mountEl, retain);
    snapshot.documentUriCreated = "(fromPath)";
    snapshot.getUriAfterCreate = fd.getUri();
    snapshot.addElementPayload = tinyParagraph();
    fd.addElement(snapshot.addElementPayload);
    Object.assign(snapshot, captureBlock(fd));
    return;
  }

  if (id === "e5-short-name") {
    snapshot.documentUriCreated = LAB_TEST_DOC;
    const fd = floDown.FloDown.fromUri(LAB_TEST_DOC);
    mountAndRetain(fd, mountEl, retain);
    snapshot.getUriAfterCreate = fd.getUri();
    const payload = {
      type: "paragraph",
      content: [
        "short name ",
        { type: "symref", uri: "foobar", content: ["foobar"] },
      ],
    };
    snapshot.addElementPayload = payload;
    snapshot.replacedUris = [];
    fd.addElement(payload);
    Object.assign(snapshot, captureBlock(fd));
    return;
  }

  if (id === "e5-same-fd" || id === "e5-two-visible" || id === "e5-hidden") {
    runCrossBlock(id, params, snapshot);
    return;
  }

  if (id.startsWith("e7-hover-")) {
    runHoverExperiment(id, params, snapshot);
    return;
  }

  if (id.startsWith("e8-triangle-")) {
    runTriangleExperiment(id, params, snapshot);
    return;
  }

  if (id === "db-raw") {
    if (!params.dbSample) {
      throw new Error("Select a DB sample first");
    }
    const uri = documentUriFromGlox(params.dbSample);
    snapshot.documentUriCreated = uri;
    snapshot.replacedUris = [];
    const fd = floDown.FloDown.fromUri(uri);
    mountAndRetain(fd, mountEl, retain);
    snapshot.getUriAfterCreate = fd.getUri();
    snapshot.addElementPayload = params.dbSample.statement;
    addStatementBlocks(fd, params.dbSample.statement);
    Object.assign(snapshot, captureBlock(fd));
    return;
  }

  if (id === "db-rewrite") {
    if (!params.dbSample) {
      throw new Error("Select a DB sample first");
    }
    const uri = documentUriFromGlox(params.dbSample);
    snapshot.documentUriCreated = uri;
    const fd = floDown.FloDown.fromUri(uri);
    mountAndRetain(fd, mountEl, retain);
    snapshot.getUriAfterCreate = fd.getUri();
    const { replacements, statement: rewritten } = mountStatementOnFloDown(
      fd,
      params.dbSample.statement,
      {
        futureRepo: params.dbSample.futureRepo,
        filePath: params.dbSample.filePath,
        fileName: params.dbSample.fileName,
      },
    );
    snapshot.replacedUris = replacements;
    snapshot.declaredSymbolUris = replacements
      .filter((item) => item.reason === "addSymbolDeclaration")
      .map((item) => ({ name: item.from, uri: item.to }));
    snapshot.addElementPayload = rewritten;
    Object.assign(snapshot, captureBlock(fd));
    return;
  }

  throw new Error(`Unimplemented experiment ${id}`);
}

function addStatementBlocks(fd: FloDownBlock, statement: unknown) {
  if (Array.isArray(statement)) {
    for (const block of statement) {
      fd.addElement(block);
    }
    return;
  }
  if (statement && typeof statement === "object") {
    const record = statement as Record<string, unknown>;
    if (record.type === "root" && Array.isArray(record.content)) {
      for (const block of record.content) {
        fd.addElement(block);
      }
      return;
    }
    if (typeof record.type === "string") {
      fd.addElement(statement);
      return;
    }
    for (const value of Object.values(record)) {
      addStatementBlocks(fd, value);
    }
  }
}

function runCrossBlock(
  id: string,
  params: {
    floDown: FloDownLib;
    mountEl: HTMLElement;
    hiddenEl: HTMLElement;
    retain: FloDownBlock[];
    dbSample: FloDownLabDbSample | null;
  },
  snapshot: LabDebugSnapshot,
) {
  const { floDown, mountEl, hiddenEl, retain } = params;
  snapshot.documentUriCreated = LAB_TEST_DOC;

  const fdDef = floDown.FloDown.fromUri(
    documentUri({ archive: "test", name: "definition_block", language: "en" }),
  );
  const localName = "foobar";
  const symbol = fdDef.addSymbolDeclaration(localName);
  snapshot.declaredSymbolUris.push({ name: localName, uri: symbol });
  const replacements: UriReplacement[] = [
    {
      from: localName,
      to: symbol ?? "(undefined)",
      reason: "addSymbolDeclaration on definition fd",
    },
  ];
  snapshot.replacedUris = replacements;

  const definition = {
    type: "definition",
    for_symbols: symbol ? [symbol] : [],
    content: [
      {
        type: "paragraph",
        content: [
          "A ",
          { type: "definiendum", uri: symbol, content: [localName] },
          " is a lab symbol.",
        ],
      },
    ],
  };
  const paragraph = {
    type: "paragraph",
    content: [
      "See ",
      { type: "symref", uri: symbol, content: [localName] },
    ],
  };

  if (id === "e5-same-fd") {
    mountAndRetain(fdDef, mountEl, retain);
    snapshot.addElementPayload = [definition, paragraph];
    fdDef.addElement(definition);
    fdDef.addElement(paragraph);
    Object.assign(snapshot, captureBlock(fdDef));
    return;
  }

  const fdPara = floDown.FloDown.fromUri(
    documentUri({ archive: "test", name: "paragraph_block", language: "en" }),
  );
  retain.push(fdDef, fdPara);
  hiddenEl.innerHTML = "";
  mountEl.innerHTML = "";
  fdPara.mountTo(mountEl);
  fdDef.mountTo(hiddenEl);
  hiddenEl.style.display = id === "e5-hidden" ? "none" : "block";

  snapshot.addElementPayload = { definitionFd: definition, paragraphFd: paragraph };
  fdDef.addElement(definition);
  fdPara.addElement(paragraph);
  snapshot.getUriAfterCreate = `def=${fdDef.getUri()} para=${fdPara.getUri()}`;
  snapshot.isModule = fdDef.isModule();
  snapshot.stex = `--- def ---\n${fdDef.getStex()}\n--- para ---\n${fdPara.getStex()}`;
  snapshot.ftml = `--- def ---\n${fdDef.getFtml()}\n--- para ---\n${fdPara.getFtml()}`;
}

const HOVER_LOCAL_NAME = "foobar";
const HOVER_KNOWN_URI =
  "http://mathhub.info?a=test&p=mod&m=definition_block&s=foobar";

function localDefinition(symbol: string | undefined) {
  return {
    type: "definition" as const,
    for_symbols: symbol ? [symbol] : [],
    content: [
      {
        type: "paragraph" as const,
        content: [
          "A ",
          { type: "definiendum", uri: symbol, content: [HOVER_LOCAL_NAME] },
          " is a lab symbol for hover.",
        ],
      },
    ],
  };
}

function hoverParagraph(uri: string | undefined) {
  return {
    type: "paragraph" as const,
    content: [
      "Hover this local symref: ",
      { type: "symref", uri, content: [HOVER_LOCAL_NAME] },
    ],
  };
}

function runHoverExperiment(
  id: string,
  params: {
    floDown: FloDownLib;
    mountEl: HTMLElement;
    hiddenEl: HTMLElement;
    retain: FloDownBlock[];
  },
  snapshot: LabDebugSnapshot,
) {
  const { floDown, mountEl, hiddenEl, retain } = params;
  hiddenEl.style.display = "block";

  if (id === "e7-hover-same-fd") {
    const uri = documentUri({ archive: "test", name: "hover_same", language: "en" });
    snapshot.documentUriCreated = uri;
    const fd = floDown.FloDown.fromUri(uri);
    mountAndRetain(fd, mountEl, retain);
    const symbol = fd.addSymbolDeclaration(HOVER_LOCAL_NAME);
    snapshot.declaredSymbolUris.push({ name: HOVER_LOCAL_NAME, uri: symbol });
    snapshot.replacedUris = [
      {
        from: HOVER_LOCAL_NAME,
        to: symbol ?? "(undefined)",
        reason: "addSymbolDeclaration on same fd as definition + paragraph",
      },
    ];
    const definition = localDefinition(symbol);
    const paragraph = hoverParagraph(symbol);
    snapshot.addElementPayload = [paragraph, definition];
    fd.addElement(paragraph);
    fd.addElement({ type: "thematicbreak" });
    fd.addElement(definition);
    Object.assign(snapshot, captureBlock(fd));
    return;
  }

  if (id === "e7-hover-two-visible") {
    const defUri = documentUri({
      archive: "test",
      name: "hover_def",
      language: "en",
    });
    const paraUri = documentUri({
      archive: "test",
      name: "hover_para",
      language: "en",
    });
    snapshot.documentUriCreated = `${paraUri} + ${defUri}`;
    const fdDef = floDown.FloDown.fromUri(defUri);
    const fdPara = floDown.FloDown.fromUri(paraUri);
    const symbol = fdDef.addSymbolDeclaration(HOVER_LOCAL_NAME);
    snapshot.declaredSymbolUris.push({ name: HOVER_LOCAL_NAME, uri: symbol });
    snapshot.replacedUris = [
      {
        from: HOVER_LOCAL_NAME,
        to: symbol ?? "(undefined)",
        reason: "addSymbolDeclaration on definition fd; paragraph uses that URI",
      },
    ];
    retain.push(fdDef, fdPara);
    mountEl.innerHTML = "";
    hiddenEl.innerHTML = "";
    hiddenEl.style.display = "block";
    fdPara.mountTo(mountEl);
    fdDef.mountTo(hiddenEl);
    const definition = localDefinition(symbol);
    const paragraph = hoverParagraph(symbol);
    snapshot.addElementPayload = { definitionFd: definition, paragraphFd: paragraph };
    fdDef.addElement(definition);
    fdPara.addElement(paragraph);
    snapshot.getUriAfterCreate = `def=${fdDef.getUri()} para=${fdPara.getUri()}`;
    snapshot.stex = `--- def ---\n${fdDef.getStex()}\n--- para ---\n${fdPara.getStex()}`;
    snapshot.ftml = `--- def ---\n${fdDef.getFtml()}\n--- para ---\n${fdPara.getFtml()}`;
    return;
  }

  if (id === "e7-hover-decl-only") {
    const uri = documentUri({
      archive: "test",
      name: "hover_decl_only",
      language: "en",
    });
    snapshot.documentUriCreated = uri;
    const fd = floDown.FloDown.fromUri(uri);
    mountAndRetain(fd, mountEl, retain);
    const symbol = fd.addSymbolDeclaration(HOVER_LOCAL_NAME);
    snapshot.declaredSymbolUris.push({ name: HOVER_LOCAL_NAME, uri: symbol });
    snapshot.replacedUris = [
      {
        from: HOVER_LOCAL_NAME,
        to: symbol ?? "(undefined)",
        reason: "addSymbolDeclaration only — no definition element",
      },
    ];
    const paragraph = hoverParagraph(symbol);
    snapshot.addElementPayload = paragraph;
    fd.addElement(paragraph);
    Object.assign(snapshot, captureBlock(fd));
    return;
  }

  if (id === "e7-hover-known-uri") {
    const uri = documentUri({
      archive: "no/archive",
      name: "hover_known_uri",
      language: "en",
    });
    snapshot.documentUriCreated = uri;
    const fd = floDown.FloDown.fromUri(uri);
    mountAndRetain(fd, mountEl, retain);
    snapshot.replacedUris = [
      {
        from: HOVER_LOCAL_NAME,
        to: HOVER_KNOWN_URI,
        reason: "constructed SymbolUri, no addSymbolDeclaration, no definition fd",
      },
    ];
    const paragraph = hoverParagraph(HOVER_KNOWN_URI);
    snapshot.addElementPayload = paragraph;
    fd.addElement(paragraph);
    Object.assign(snapshot, captureBlock(fd));
    return;
  }

  throw new Error(`Unimplemented hover experiment ${id}`);
}

const TRIANGLE_EN_DOC = documentUri({
  archive: "smglom/geometry",
  path: "mod",
  name: "triangle",
  language: "en",
});
const TRIANGLE_DE_DOC = documentUri({
  archive: "smglom/geometry",
  path: "mod",
  name: "triangle",
  language: "de",
});
const TRIANGLE_REF_DOC = documentUri({
  archive: "smglom/geometry",
  path: "mod",
  name: "triangle-sum-of-angles",
  language: "en",
});

function triangleDefinition(symbol: string | undefined, verbalization: string, gloss: string) {
  return {
    type: "definition" as const,
    for_symbols: symbol ? [symbol] : [],
    content: [
      {
        type: "paragraph" as const,
        content: [
          { type: "definiendum", uri: symbol, content: [verbalization] },
          " ",
          gloss,
        ],
      },
    ],
  };
}

function triangleSymrefParagraph(symbol: string | undefined) {
  return {
    type: "paragraph" as const,
    content: [
      "Sum of angles of a ",
      { type: "symref", uri: symbol, content: ["triangle"] },
      " is 180 degree.",
    ],
  };
}

function runTriangleExperiment(
  id: string,
  params: {
    floDown: FloDownLib;
    mountEl: HTMLElement;
    hiddenEl: HTMLElement;
    thirdEl: HTMLElement;
    retain: FloDownBlock[];
  },
  snapshot: LabDebugSnapshot,
) {
  const { floDown, mountEl, hiddenEl, thirdEl, retain } = params;

  if (id === "e8-triangle-same-fd") {
    snapshot.documentUriCreated = TRIANGLE_EN_DOC;
    const fd = floDown.FloDown.fromUri(TRIANGLE_EN_DOC);
    mountAndRetain(fd, mountEl, retain);
    const symbol = fd.addSymbolDeclaration("triangle");
    snapshot.declaredSymbolUris.push({ name: "triangle", uri: symbol });
    snapshot.replacedUris = [
      {
        from: "triangle",
        to: symbol ?? "(undefined)",
        reason: "one addSymbolDeclaration; both definienda use this URI",
      },
    ];
    const enDef = triangleDefinition(
      symbol,
      "triangle",
      "is a polygon with three sides.",
    );
    const deDef = triangleDefinition(
      symbol,
      "Dreieck",
      "ist ein Polygon mit drei Seiten.",
    );
    snapshot.addElementPayload = [enDef, deDef];
    fd.addElement(enDef);
    fd.addElement({ type: "thematicbreak" });
    fd.addElement(deDef);
    Object.assign(snapshot, captureBlock(fd));
    return;
  }

  if (id === "e8-triangle-three-docs") {
    snapshot.documentUriCreated = `${TRIANGLE_EN_DOC} + ${TRIANGLE_DE_DOC} + ${TRIANGLE_REF_DOC}`;
    const fdEn = floDown.FloDown.fromUri(TRIANGLE_EN_DOC);
    const fdDe = floDown.FloDown.fromUri(TRIANGLE_DE_DOC);
    const fdRef = floDown.FloDown.fromUri(TRIANGLE_REF_DOC);
    const symbol = fdEn.addSymbolDeclaration("triangle");
    snapshot.declaredSymbolUris.push({ name: "triangle", uri: symbol });
    snapshot.replacedUris = [
      {
        from: "triangle",
        to: symbol ?? "(undefined)",
        reason:
          "declared only on l=en; de definiendum and third-doc symref reuse this URI (no addSymbolDeclaration on de or ref)",
      },
    ];
    retain.push(fdEn, fdDe, fdRef);
    mountEl.innerHTML = "";
    hiddenEl.innerHTML = "";
    thirdEl.innerHTML = "";
    hiddenEl.style.display = "block";
    thirdEl.style.display = "block";
    fdEn.mountTo(mountEl);
    fdDe.mountTo(hiddenEl);
    fdRef.mountTo(thirdEl);
    const enDef = triangleDefinition(
      symbol,
      "triangle",
      "is a polygon with three sides.",
    );
    const deDef = triangleDefinition(
      symbol,
      "Dreieck",
      "ist ein Polygon mit drei Seiten.",
    );
    const refPara = triangleSymrefParagraph(symbol);
    snapshot.addElementPayload = { en: enDef, de: deDef, ref: refPara };
    fdEn.addElement(enDef);
    fdDe.addElement(deDef);
    fdRef.addElement(refPara);
    snapshot.getUriAfterCreate = `en=${fdEn.getUri()} de=${fdDe.getUri()} ref=${fdRef.getUri()}`;
    snapshot.stex = `--- triangle.en ---\n${fdEn.getStex()}\n--- triangle.de (no second \\symdecl expected) ---\n${fdDe.getStex()}\n--- triangle-sum-of-angles (symref only) ---\n${fdRef.getStex()}`;
    snapshot.ftml = `--- en ---\n${fdEn.getFtml()}\n--- de ---\n${fdDe.getFtml()}\n--- ref ---\n${fdRef.getFtml()}`;
    return;
  }

  throw new Error(`Unimplemented triangle experiment ${id}`);
}
