import { useTranslations } from "next-intl";
import { GameRouteLoading } from "@/components/shared/GameRouteLoading";

export default function PveTournamentLoading() {
  const ui = useTranslations("ui");
  return <GameRouteLoading title="Champions League" label={ui("loadingTournament")} layout="match" />;
}
