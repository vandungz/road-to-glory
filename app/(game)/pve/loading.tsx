import { useTranslations } from "next-intl";
import { AppShell } from "@/components/shared/AppShell";
import { RouteLoading } from "@/components/ui/States";

export default function PveLobbyLoading() {
  const ui = useTranslations("ui");
  return <AppShell><RouteLoading title="PvE Tournament" label={ui("loadingEligibleSquads")} layout="records" /></AppShell>;
}
