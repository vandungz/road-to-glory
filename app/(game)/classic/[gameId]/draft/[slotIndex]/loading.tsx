import { useTranslations } from "next-intl";
import { AppShell } from "@/components/shared/AppShell";
import { RouteLoading } from "@/components/ui/States";

export default function CareerLoading() {
  const ui = useTranslations("ui");
  return <AppShell backHref="/classic" backLabel="squads"><RouteLoading title={ui("career")} label={ui("loadingPlayerProfile")} layout="career" /></AppShell>;
}
