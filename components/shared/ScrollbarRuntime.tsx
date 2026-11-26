"use client";

import { useEffect } from "react";
import { OverlayScrollbars } from "overlayscrollbars";

/** The document scrollbar; nested viewports mount through the shared ScrollArea. */
export function ScrollbarRuntime() {
  useEffect(() => {
    if (matchMedia("(forced-colors: active)").matches) return;
    const instance = OverlayScrollbars({ target: document.body, elements: { viewport: document.body } }, {
      overflow: { x: "hidden", y: "scroll" },
      scrollbars: { theme: "football-scrollbar", autoHide: "never", visibility: "auto", dragScroll: true },
    });
    return () => instance.destroy();
  }, []);
  return null;
}
