import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { SupportLink } from "@/components/shared/SupportLink";

export function InformationSettings() {
  const t = useTranslations("support");
  return <section className="football-settings-section football-information-settings">
    <h2>{t("information")}</h2>
    <nav aria-label={t("policies")}>
      <Link href="/privacy"><span>{t("privacy")}</span><ArrowUpRight size={18} aria-hidden="true" /></Link>
      <Link href="/terms"><span>{t("terms")}</span><ArrowUpRight size={18} aria-hidden="true" /></Link>
    </nav>
    <div className="football-information-support"><h3>{t("heading")}</h3><p>{t("description")}</p><SupportLink /></div>
  </section>;
}
