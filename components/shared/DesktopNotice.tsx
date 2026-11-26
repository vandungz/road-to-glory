"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Copy, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/** The running game remains mounted while a narrower window shows this notice. */
export function DesktopNotice() {
  const t = useTranslations("desktopNotice");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "fallback">("idle");
  const [url, setUrl] = useState("");
  async function copyLink() {
    const current = new URL(window.location.href);
    current.search = ""; current.hash = "";
    setUrl(current.href);
    try { await navigator.clipboard.writeText(current.href); setCopyState("copied"); }
    catch { setCopyState("fallback"); }
  }
  return <section className="football-desktop-notice" aria-labelledby="desktop-notice-title">
    <Link href="/" className="football-desktop-notice__brand">Road to Glory</Link>
    <div className="football-desktop-notice__body">
      <Monitor size={32} strokeWidth={1.5} aria-hidden="true" />
      <h1 id="desktop-notice-title">{t("title")}</h1>
      <p>{t("reason")}</p>
      <dl><div><dt>{t("computer")}</dt><dd>{t("widen")}</dd></div><div><dt>{t("phone")}</dt><dd>{t("openOnComputer")}</dd></div></dl>
      <Button onClick={copyLink} variant="outline" data-audio-silent>{copyState === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{t(copyState === "copied" ? "copied" : "copy")}</Button>
      {copyState === "fallback" && <label className="football-desktop-notice__fallback">{t("copyManually")}<input value={url} readOnly onFocus={(event) => event.currentTarget.select()} /></label>}
      <span role="status" className="sr-only">{copyState === "copied" ? t("copied") : ""}</span>
    </div>
    <p className="football-desktop-notice__footer">{t("automaticReturn")}</p>
  </section>;
}
