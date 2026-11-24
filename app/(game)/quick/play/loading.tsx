import { useTranslations } from "next-intl";
import { GameRouteLoading } from "@/components/shared/GameRouteLoading";

export default function QuickLoading() {
  const ui = useTranslations("ui");
  return <GameRouteLoading title="Quick Mode" label={ui("openingYourRun")} layout="quick" />;
}
