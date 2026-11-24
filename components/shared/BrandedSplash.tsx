import { useTranslations } from "next-intl";
import { ActivityLine } from "@/components/ui/ActivityLine";

/** A real route fallback: unmounted immediately when the destination is ready. */
export function BrandedSplash() {
  const ui = useTranslations("ui");
  return <div className="football-branded-splash" role="status" aria-live="polite">
    <div className="football-branded-splash__identity">
      <span className="football-branded-splash__mark" aria-hidden="true">RTG</span>
      <strong>Road to Glory</strong>
      <ActivityLine />
      <span className="football-branded-splash__label">{ui("loadingPage")}</span>
    </div>
  </div>;
}
