import { useEffect, useRef } from "react";
import { initFloDown } from "@/lib/flodown-client";

interface FtmlData {
  ftml: unknown;
  localSymbols?: { name: string }[]; // ✅ fixed
  requiresModule?: boolean;
}

function replaceLocalUris(node: any, map: Map<string, string>): any {
  if (Array.isArray(node)) {
    return node.map((n) => replaceLocalUris(n, map));
  }
  if (node && typeof node === "object") {
    const copy = { ...node };

    if (typeof copy.uri === "string" && copy.uri.startsWith("LOCAL:")) {
      const name = copy.uri.slice("LOCAL:".length);
      copy.uri = map.get(name) ?? copy.uri;
    }

    if (Array.isArray(copy.for_symbols)) {
      copy.for_symbols = copy.for_symbols.map((u: string) =>
        u.startsWith("LOCAL:") ? (map.get(u.slice(6)) ?? u) : u,
      );
    }

    if (copy.content) {
      copy.content = replaceLocalUris(copy.content, map);
    }

    return copy;
  }
  return node;
}

export function FtmlPreview({ data }: { data: FtmlData }) {
  const ref = useRef<HTMLDivElement>(null);
  const fdRef = useRef<any>(null);

  useEffect(() => {
    if (!data?.ftml || !ref.current) return;

    let disposed = false;

    initFloDown().then((floDown) => {
      if (disposed) return;

      floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

      // 🔴 IMPORTANT: clear old block
      if (fdRef.current) {
        fdRef.current = null;
        ref.current!.innerHTML = "";
      }

      const fd = floDown.FloDown.fromUri(
        data.requiresModule
          ? "http://test?a=test&d=test&l=en"
          : "http://test?a=test&d=test&l=en",
      );

      const uriMap = new Map<string, string>();

      for (const sym of data.localSymbols ?? []) {
        const uri = fd.addSymbolDeclaration(sym.name);
        uriMap.set(sym.name, uri);
      }

      const resolvedFtml = replaceLocalUris(structuredClone(data.ftml), uriMap);

      fd.addElement(resolvedFtml);
      fd.mountTo(ref.current!);

      // 🔴 KEEP ALIVE
      fdRef.current = fd;
    });

    return () => {
      disposed = true;
    };
  }, [data]);

  return <div ref={ref} style={{ display: "contents" }} />;
}
