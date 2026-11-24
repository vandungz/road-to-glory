import { useTranslations } from "next-intl";
import { GameRouteLoading } from "@/components/shared/GameRouteLoading";

export default function CareerLoading() {
  const ui = useTranslations("ui");
  return <GameRouteLoading title={ui("career")} label={ui("loadingPlayerProfile")} layout="career" />;
}
