"use client";

import { useEffect, useState, type ReactNode, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { UserRound, ShieldCheck, Volume2, Languages, Info } from "lucide-react";

const tabs = ["profile", "security", "audio", "language", "information"] as const;
type Tab = typeof tabs[number];
const icons = [UserRound, ShieldCheck, Volume2, Languages, Info];
function currentTab(): Tab {
  const value = new URLSearchParams(window.location.search).get("tab") ?? window.location.hash.slice(1);
  return tabs.includes(value as Tab) ? value as Tab : "profile";
}

export function SettingsTabs({ panels }: { panels: Record<Tab, ReactNode> }) {
  const t = useTranslations("accountSettings");
  const [active, setActive] = useState<Tab>("profile");
  useEffect(() => {
    const sync = () => setActive(currentTab());
    sync(); window.addEventListener("popstate", sync); window.addEventListener("hashchange", sync);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("hashchange", sync); };
  }, []);
  function select(tab: Tab) {
    const url = new URL(window.location.href); url.searchParams.set("tab", tab); url.hash = "";
    window.history.pushState(null, "", url); setActive(tab);
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowDown" ? (index + 1) % tabs.length : event.key === "ArrowUp" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); select(tabs[next]); document.getElementById(`settings-tab-${tabs[next]}`)?.focus();
  }
  return <div className="football-settings-layout">
    <div className="football-settings-nav" role="tablist" aria-label={t("title")} aria-orientation="vertical" data-guide="settings-navigation">
      {tabs.map((tab, index) => { const Icon = icons[index]; return <button key={tab} id={`settings-tab-${tab}`} role="tab" type="button" aria-selected={active === tab} aria-controls={`settings-panel-${tab}`} tabIndex={active === tab ? 0 : -1} onKeyDown={(event) => navigate(event, index)} onClick={() => select(tab)}><Icon size={18} aria-hidden="true" />{t(tab)}</button>; })}
    </div>
    <div className="football-settings-content" data-guide="settings-content">
      {tabs.map((tab) => <div key={tab} id={`settings-panel-${tab}`} role="tabpanel" aria-labelledby={`settings-tab-${tab}`} hidden={active !== tab} tabIndex={0}>{panels[tab]}</div>)}
    </div>
  </div>;
}
