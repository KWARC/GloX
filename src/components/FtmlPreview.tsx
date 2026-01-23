import { useEffect, useRef } from "react";
import { initFloDown } from "@/lib/flodown-client";

export function FtmlPreview({ ftml }: { ftml: unknown }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fdRef = useRef<any>(null);

  useEffect(() => {
    if (!ftml) return;

    const container = containerRef.current;
    if (!container) return; // ⬅ narrows type for TS

    let disposed = false;

    (async () => {
      const floDown = await initFloDown();
      if (disposed) return;

      floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

      // destroy previous block
      if (fdRef.current) {
        fdRef.current = null;
        container.innerHTML = "";
      }

      // create fresh block
      const fd = floDown.FloDown.fromUri(
        "http://test?a=test&d=test&l=en"
      );

      fd.addElement(structuredClone(ftml));
      fd.mountTo(container);

      fdRef.current = fd;
    })();

    return () => {
      disposed = true;
    };
  }, [ftml]);

  return <div ref={containerRef} style={{ display: "contents" }} />;
}
