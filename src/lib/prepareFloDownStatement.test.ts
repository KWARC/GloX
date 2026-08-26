import { describe, expect, it } from "vitest";
import {
  mountStatementOnFloDown,
  registerSymbolDeclarations,
  rewriteStatementForFloDown,
} from "./prepareFloDownStatement";

const GROUP_URI = "http://mathhub.info?a=a&p=p&m=m&s=Group";
const FOO_URI = "http://mathhub.info?s=Foo";

describe("rewriteStatementForFloDown", () => {
  it("passes stored HTTP symbol URIs through without declaring", () => {
    const statement = rewriteStatementForFloDown({
      type: "paragraph",
      content: [
        {
          type: "symref",
          uri: GROUP_URI,
          content: ["Group"],
        },
      ],
    });
    expect(statement).toEqual({
      type: "paragraph",
      content: [
        {
          type: "symref",
          uri: GROUP_URI,
          content: ["Group"],
        },
      ],
    });
  });

  it("leaves leftover short names unchanged (version history; not rewritten)", () => {
    expect(
      rewriteStatementForFloDown({
        type: "paragraph",
        content: [{ type: "symref", uri: "Group", content: ["Group"] }],
      }),
    ).toMatchObject({
      content: [{ type: "symref", uri: "Group", content: ["Group"] }],
    });
  });

  it("converts paragraph definiendum to symref without changing uri", () => {
    const statement = rewriteStatementForFloDown({
      type: "paragraph",
      content: [
        { type: "definiendum", uri: FOO_URI, content: ["Foo"], symdecl: true },
      ],
    });
    expect(statement).toEqual({
      type: "paragraph",
      content: [{ type: "symref", uri: FOO_URI, content: ["Foo"] }],
    });
  });

  it("defaults for_symbols on definition nodes missing the field", () => {
    const statement = rewriteStatementForFloDown({
      type: "definition",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "definiendum",
              uri: FOO_URI,
              content: ["Foo"],
            },
          ],
        },
      ],
    });
    expect(statement).toMatchObject({
      type: "definition",
      for_symbols: [FOO_URI],
    });
  });

  it("uses empty for_symbols when a definition has no definiendum", () => {
    const statement = rewriteStatementForFloDown({
      type: "definition",
      content: [{ type: "paragraph", content: ["plain text"] }],
    });
    expect(statement).toMatchObject({
      type: "definition",
      for_symbols: [],
    });
  });

  it("mountStatementOnFloDown rewrites shape and calls addElement", () => {
    const elements: unknown[] = [];
    const rewritten = mountStatementOnFloDown(
      {
        addElement: (node) => {
          elements.push(node);
        },
      },
      {
        type: "paragraph",
        content: [{ type: "symref", uri: GROUP_URI, content: ["Group"] }],
      },
    );
    expect(elements).toHaveLength(1);
    expect(elements[0]).toEqual(rewritten);
    expect(elements[0]).toMatchObject({
      type: "paragraph",
      content: [{ type: "symref", uri: GROUP_URI, content: ["Group"] }],
    });
  });
});

describe("registerSymbolDeclarations", () => {
  it("calls addSymbolDeclaration with unique trimmed names", () => {
    const names: string[] = [];
    registerSymbolDeclarations(
      {
        addSymbolDeclaration: (name) => {
          names.push(name);
          return `uri:${name}`;
        },
      },
      [" triangle ", "triangle", "angle", ""],
    );
    expect(names).toEqual(["triangle", "angle"]);
  });
});
