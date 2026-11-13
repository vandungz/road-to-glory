import { useTranslations } from "next-intl";
import { EditorialArt } from "@/components/shared/EditorialArt";

export function HeroPanel() {
  const ui = useTranslations("ui");
  return (
    <section className="football-auth-hero" aria-labelledby="football-auth-hero-title">
      <div className="football-auth-hero__content">
        <div className="football-auth-hero__wordmark">
          <span>Road to Glory</span><i aria-hidden="true" /><small>Football Life</small>
        </div>
        <div className="football-auth-hero__message">
          <h1 id="football-auth-hero-title">{ui("yourSquad")}<br />{ui("yourCareer")}</h1>
          <p>{ui("draftPlayersAndBuildYourSquadSeasonBySeason")}</p>
        </div>
        <EditorialArt asset="pitch-overview" className="football-editorial-art--auth" priority />
      </div>
    </section>
  );
}
