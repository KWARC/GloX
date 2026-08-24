import { describe, expect, it } from "vitest";
import {
  mountStatementOnFloDown,
  rewriteStatementForFloDown,
} from "./prepareFloDownStatement";

describe("rewriteStatementForFloDown", () => {
  it("declares short names and strips extra fields on rewrite", () => {
    const declared: string[] = [];
    const { statement, replacements } = rewriteStatementForFloDown(
      {
        type: "paragraph",
        content: [
          {
            type: "symref",
            uri: "Group",
            content: ["Group"],
          },
        ],
      },
      {
        addSymbolDeclaration: (name) => {
          declared.push(name);
          return `http://mathhub.info?a=a&p=p&m=m&s=${name}`;
        },
      },
      { futureRepo: "a", filePath: "p", fileName: "m" },
    );

    expect(declared).toEqual(["Group"]);
    expect(replacements).toEqual([
      {
        from: "Group",
        to: "http://mathhub.info?a=a&p=p&m=m&s=Group",
        reason: "addSymbolDeclaration",
      },
    ]);
    expect(statement).toMatchObject({
      type: "paragraph",
      content: [
        {
          type: "symref",
          uri: "http://mathhub.info?a=a&p=p&m=m&s=Group",
        },
      ],
    });
  });

  it("converts paragraph definiendum to symref", () => {
    const { statement } = rewriteStatementForFloDown(
      {
        type: "paragraph",
        content: [
          { type: "definiendum", uri: "Foo", content: ["Foo"], symdecl: true },
        ],
      },
      { addSymbolDeclaration: (name) => `http://mathhub.info?s=${name}` },
      { futureRepo: "a", filePath: "p", fileName: "m" },
    );
    expect(statement).toMatchObject({
      type: "paragraph",
      content: [{ type: "symref", uri: "http://mathhub.info?s=Foo" }],
    });
  });

  it("defaults for_symbols on definition nodes missing the field", () => {
    const { statement } = rewriteStatementForFloDown(
      {
        type: "definition",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "definiendum",
                uri: "Foo",
                content: ["Foo"],
              },
            ],
          },
        ],
      },
      { addSymbolDeclaration: (name) => `http://mathhub.info?s=${name}` },
      { futureRepo: "a", filePath: "p", fileName: "m" },
    );
    expect(statement).toMatchObject({
      type: "definition",
      for_symbols: ["http://mathhub.info?s=Foo"],
    });
  });

  it("uses empty for_symbols when a definition has no definiendum", () => {
    const { statement } = rewriteStatementForFloDown(
      {
        type: "definition",
        content: [{ type: "paragraph", content: ["plain text"] }],
      },
      { addSymbolDeclaration: (name) => `http://mathhub.info?s=${name}` },
      { futureRepo: "a", filePath: "p", fileName: "m" },
    );
    expect(statement).toMatchObject({
      type: "definition",
      for_symbols: [],
    });
  });

  it("rewrites legacy ppp-style definition missing for_symbols", () => {
    const { statement } = rewriteStatementForFloDown(
      {
        type: "definition",
        content: [
          {
            type: "paragraph",
            content: ["he LNM is a truncated extraction fragment."],
          },
        ],
      },
      { addSymbolDeclaration: (name) => `http://mathhub.info?s=${name}` },
      {
        futureRepo: "smglom/software",
        filePath: "mod",
        fileName: "ppp",
      },
    );
    expect(statement).toMatchObject({
      type: "definition",
      for_symbols: [],
    });
  });

  it("rewrites legacy def3-style definition with definiendum but no for_symbols", () => {
    const { statement } = rewriteStatementForFloDown(
      {
        type: "definition",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "definiendum",
                uri: "production bottlenecks",
                content: ["production bottlenecks"],
              },
              " occur when capacity is exceeded.",
            ],
          },
        ],
      },
      {
        addSymbolDeclaration: (name) =>
          `http://mathhub.info?a=smglom/software&p=mod&m=def3&s=${encodeURIComponent(name)}`,
      },
      {
        futureRepo: "smglom/software",
        filePath: "mod",
        fileName: "def3",
      },
    );
    expect(statement).toMatchObject({
      type: "definition",
      for_symbols: [
        "http://mathhub.info?a=smglom/software&p=mod&m=def3&s=production%20bottlenecks",
      ],
    });
  });

  it("reuses knownUris without declaring on the current document", () => {
    const declared: string[] = [];
    const known = new Map([
      [
        "triangle",
        "http://mathhub.info?a=smglom/geometry&p=mod&m=triangle&s=triangle",
      ],
    ]);
    const { statement, replacements } = rewriteStatementForFloDown(
      {
        type: "paragraph",
        content: [
          {
            type: "symref",
            uri: "triangle",
            content: ["triangle"],
          },
        ],
      },
      {
        addSymbolDeclaration: (name) => {
          declared.push(name);
          return `http://mathhub.info?a=courses/FAU/module-descriptions&p=mod&m=wrong&s=${name}`;
        },
      },
      {
        futureRepo: "courses/FAU/module-descriptions",
        filePath: "mod",
        fileName: "triangle-sum-of-angles",
      },
      { knownUris: known },
    );

    expect(declared).toEqual([]);
    expect(replacements).toEqual([
      {
        from: "triangle",
        to: "http://mathhub.info?a=smglom/geometry&p=mod&m=triangle&s=triangle",
        reason: "knownUriMap",
      },
    ]);
    expect(statement).toMatchObject({
      type: "paragraph",
      content: [
        {
          type: "symref",
          uri: "http://mathhub.info?a=smglom/geometry&p=mod&m=triangle&s=triangle",
        },
      ],
    });
  });

  it("mountStatementOnFloDown rewrites and calls addElement", () => {
    const elements: unknown[] = [];
    const { replacements } = mountStatementOnFloDown(
      {
        addSymbolDeclaration: (name) => `http://mathhub.info?s=${name}`,
        addElement: (node) => {
          elements.push(node);
        },
      },
      {
        type: "paragraph",
        content: [{ type: "symref", uri: "Group", content: ["Group"] }],
      },
      { futureRepo: "a", filePath: "p", fileName: "m" },
    );
    expect(replacements).toHaveLength(1);
    expect(elements).toHaveLength(1);
    expect(elements[0]).toMatchObject({
      type: "paragraph",
      content: [{ type: "symref", uri: "http://mathhub.info?s=Group" }],
    });
  });
});
