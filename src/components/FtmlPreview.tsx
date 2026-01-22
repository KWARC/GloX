import { useEffect, useRef } from "react";
import { initFloDown } from "@/lib/flodown-client";

export function FtmlPreview({ ftml }: { ftml: unknown }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ftml || !containerRef.current) return;

    let fd: any | null = null;
    let cancelled = false;

    (async () => {
      const floDown = await initFloDown();
      if (cancelled) return;

      floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

      const fd = floDown.FloDown.fromUri("http://test?a=test&d=test&l=en");

      fd.addElement(ftml);
      fd.mountTo(containerRef.current);
    })();

    return () => {
      cancelled = true;
      fd?.clear();
    };
  }, [ftml]);

  return <div ref={containerRef} style={{ display: "contents" }} />;
}
