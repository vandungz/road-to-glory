"use client";

import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, type HTMLAttributes } from "react";
import { OverlayScrollbars } from "overlayscrollbars";

export const ScrollArea = forwardRef<HTMLElement, HTMLAttributes<HTMLElement> & { as?: "div" | "aside" | "main" | "section" }>(({ as = "div", children, ...props }, ref) => {
  const element = useRef<HTMLElement>(null);
  useImperativeHandle(ref, () => element.current!);
  useEffect(() => {
    const viewport = element.current;
    if (!viewport || matchMedia("(forced-colors: active)").matches) return;
    const css = getComputedStyle(viewport);
    const instance = OverlayScrollbars({ target: viewport, elements: { viewport } }, {
      overflow: { x: /auto|scroll/.test(css.overflowX) ? "scroll" : "hidden", y: "scroll" },
      scrollbars: { theme: "football-scrollbar", autoHide: "never", visibility: "auto", dragScroll: true },
    });
    return () => instance.destroy();
  }, []);
  return createElement(as, { ...props, ref: element }, children);
});
ScrollArea.displayName = "ScrollArea";
