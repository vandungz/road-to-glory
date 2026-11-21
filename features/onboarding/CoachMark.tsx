"use client";

import { CircleHelp } from "lucide-react";
import { useId } from "react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import type { GuideTarget } from "./guides";

/** Inline explanations reuse the same copy as the page tour. */
export function CoachMark({ target }: { target: GuideTarget }) {
  const t = useTranslations("onboarding");
  const descriptionId = useId();
  return <Tooltip descriptionId={descriptionId} label={t(`steps.${target}.description`)}>
    <IconButton className="football-coach-mark" aria-label={t(`steps.${target}.title`)} aria-describedby={descriptionId}>
      <CircleHelp size={15} aria-hidden="true" />
    </IconButton>
  </Tooltip>;
}
