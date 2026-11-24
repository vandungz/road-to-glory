import { useTranslations } from "next-intl";
import { GameRouteLoading } from "@/components/shared/GameRouteLoading";

export default function PveLobbyLoading() {
  const ui = useTranslations("ui");
  return <GameRouteLoading title="PvE Tournament" label={ui("loadingEligibleSquads")} layout="lobby" />;
}
