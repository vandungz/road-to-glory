"use client";

import { CircleHelp } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { IconButton } from "@/components/ui/IconButton";
import { usePageGuide } from "./GuideProvider";
import { PageHelpModal } from "./PageHelpModal";
import { browserGuideStorage, markGuideSeen } from "./guide-storage";
import type { GuideId } from "./guides";

export function HelpButton({ showLabel = false }: { showLabel?: boolean }) {
  const guide = usePageGuide();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // A persistent provider may still hold the previous page while a new server header hydrates.
  if (!mounted || !guide?.page) return null;
  return <PageHelpControl key={`${pathname}:${guide.page.id}:${guide.page.paused}`} id={guide.page.id} paused={guide.page.paused} stopTour={guide.stop} showLabel={showLabel} />;
}

function PageHelpControl({ id, paused, stopTour, showLabel }: { id: GuideId; paused: boolean; stopTour: () => void; showLabel: boolean }) {
  const t = useTranslations("onboarding");
  const [open, setOpen] = useState(false);
  return <>
    <IconButton className={`football-guide-help${showLabel ? " football-guide-help--labelled" : ""}`} aria-label={t("help")} disabled={paused} onClick={() => {
      stopTour();
      markGuideSeen(id, browserGuideStorage());
      setOpen(true);
    }}>
      <CircleHelp size={18} strokeWidth={1.7} aria-hidden="true" />
      {showLabel && <span>{t("helpShort")}</span>}
    </IconButton>
  <PageHelpModal id={id} open={open} onClose={() => setOpen(false)} /></>;
}
