import { useTranslations } from "next-intl";
import { AppShell } from "@/components/shared/AppShell";
import { RouteLoading } from "@/components/ui/States";

export default function PveTournamentLoading() {
  const ui = useTranslations("ui");
  return <AppShell backHref="/pve" backLabel="pve"><RouteLoading title="Champions League" label={ui("loadingTournament")} layout="match" /></AppShell>;
}
