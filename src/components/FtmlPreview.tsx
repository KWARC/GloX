import { initFloDown } from "@/lib/flodown-client";
import {
  collectLocalSymbols,
  replaceLocalUris,
} from "@/server/ftml/normalizeFtml";
import { useEffect, useRef } from "react";

interface FtmlData {
  ftml: any;
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

      if (fdRef.current) {
        fdRef.current = null;
        ref.current!.innerHTML = "";
      }

      const fd = floDown.FloDown.fromUri("http://test?a=test&d=test&l=en");

      // 1️⃣ discover symbols from BOTH defininame + definiendum
      const symbols = collectLocalSymbols(data.ftml);

      // 2️⃣ declare symbols once
      const uriMap = new Map<string, string>();
      for (const name of symbols) {
        const uri = fd.addSymbolDeclaration(name);
        uriMap.set(name, uri);
      }

      // 3️⃣ normalize FTML
      const resolved = replaceLocalUris(structuredClone(data.ftml), uriMap);

      // 4️⃣ add elements
      if (Array.isArray(resolved)) {
        for (const el of resolved) fd.addElement(el);
      } else if (resolved.type === "root") {
        for (const el of resolved.content ?? []) fd.addElement(el);
      } else {
        fd.addElement(resolved);
      }

      fd.mountTo(ref.current!);
      fdRef.current = fd;
    });

    return () => {
      disposed = true;
    };
  }, [data]);

  return <div ref={ref} style={{ display: "contents" }} />;
}
