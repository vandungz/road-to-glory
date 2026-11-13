import { useTranslations } from "next-intl";
import { AppShell } from "@/components/shared/AppShell";
import { RouteLoading } from "@/components/ui/States";

export default function GameLoading() {
  const ui = useTranslations("ui");
  return <AppShell><RouteLoading title="Road to Glory" label={ui("loadingPage")} /></AppShell>;
}
