import { initFloDown } from "@/lib/flodown-client";
import {
  collectLocalSymbols,
  replaceLocalUris,
} from "@/server/ftml/normalizeFtml";
import { normalizeToRoot } from "@/types/ftml.types";
import { useEffect, useRef, useState } from "react";

interface FtmlPreviewProps {
  ftmlAst: any;
  editable?: boolean;
  interactive?: boolean;
}

export function FtmlPreview({
  ftmlAst,
  editable = false,
  interactive = true,
}: FtmlPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const floDownRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    let disposed = false;

    initFloDown().then((floDown) => {
      if (disposed || !containerRef.current) return;

      floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

      const fd = floDown.FloDown.fromUri("http://temp?a=temp&d=temp&l=en");
      fd.mountTo(containerRef.current);

      floDownRef.current = fd;
      setIsInitialized(true);

      (window as any).__FLODOWNS = (window as any).__FLODOWNS || [];
      (window as any).__FLODOWNS.push(fd);
    });

    return () => {
      disposed = true;
      if (floDownRef.current) {
        floDownRef.current.clear();
        floDownRef.current = null;
      }
      setIsInitialized(false);
    };
  }, []);

  useEffect(() => {
    if (!isInitialized || !floDownRef.current || !ftmlAst) return;

    const fd = floDownRef.current;

    fd.clearText();

    const normalized = normalizeToRoot(ftmlAst);
    const symbols = collectLocalSymbols(normalized);

    const uriMap = new Map<string, string>();
    for (const name of symbols) {
      uriMap.set(name, fd.addSymbolDeclaration(name));
    }

    const resolved = replaceLocalUris(structuredClone(normalized), uriMap);

    for (const element of resolved.content) {
      fd.addElement(element);
    }
  }, [ftmlAst, isInitialized]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    if (!interactive) {
      const stopEvent = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
      };

      const events = [
        "mousedown",
        "mouseup",
        "click",
        "dblclick",
        "mousemove",
        "mouseover",
        "mouseout",
        "mouseenter",
        "mouseleave",
        "contextmenu",
        "touchstart",
        "touchend",
        "touchmove",
      ];

      events.forEach((eventName) => {
        container.addEventListener(eventName, stopEvent, true);
      });

      return () => {
        events.forEach((eventName) => {
          container.removeEventListener(eventName, stopEvent, true);
        });
      };
    }
  }, [interactive]);

  return (
    <div
      ref={containerRef}
      style={{
        userSelect: interactive ? (editable ? "text" : "auto") : "none",
        cursor: interactive ? (editable ? "text" : "auto") : "default",
        pointerEvents: interactive ? "auto" : "none",
        opacity: interactive ? 1 : 0.7,
      }}
    />
  );
}
