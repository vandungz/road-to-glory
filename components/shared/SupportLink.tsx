import { useTranslations } from "next-intl";
import { Heart, ExternalLink } from "lucide-react";

export const SUPPORT_URL = "https://ko-fi.com/justinnguyen29";

export function SupportLink({ iconOnly = false }: { iconOnly?: boolean }) {
  const t = useTranslations("support");
  return <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" className={iconOnly ? "football-icon-button football-support-link" : "football-support-link"} aria-label={iconOnly ? t("open") : undefined}>
    {iconOnly ? <Heart size={18} strokeWidth={1.7} aria-hidden="true" /> : <>{t("label")}<ExternalLink size={14} aria-hidden="true" /><span className="sr-only">{t("newTab")}</span></>}
  </a>;
}
