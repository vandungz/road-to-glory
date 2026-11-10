import { EditorialArt } from "@/components/shared/EditorialArt";

export function HeroPanel() {
  return (
    <section className="football-auth-hero" aria-labelledby="football-auth-hero-title">
      <div className="football-auth-hero__content">
        <div className="football-auth-hero__wordmark">
          <span>Road to Glory</span><i aria-hidden="true" /><small>Football Life</small>
        </div>
        <div className="football-auth-hero__message">
          <h1 id="football-auth-hero-title">Đội hình của bạn.<br />Sự nghiệp của bạn.</h1>
          <p>Draft cầu thủ, xây đội hình qua từng mùa giải.</p>
        </div>
        <EditorialArt asset="pitch-overview" className="football-editorial-art--auth" priority />
      </div>
    </section>
  );
}
