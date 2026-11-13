import { useTranslations } from "next-intl";
import { AppShell } from "@/components/shared/AppShell";
import { RouteLoading } from "@/components/ui/States";

export default function QuickLoading() {
  const ui = useTranslations("ui");
  return <AppShell backHref="/quick" backLabel="setup"><RouteLoading title="Quick Mode" label={ui("openingYourRun")} layout="quick" /></AppShell>;
}
