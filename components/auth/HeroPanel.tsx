"use client";

import { useAuthMotion } from "./AuthMotionContext";

const CAREER_TICKER = "Empoli 18t · Torino 20t · Coppa Italia 21t · Atalanta 22t · Vô địch Serie A 23t · Quả bóng vàng 23t · Hạng 3 Serie A 24t · Inter 27t · Champions League 27t · Euro 2032 · Giải nghệ 33t ·";

function HeroStat({ value, label, honour = false }: { value: string; label: string; honour?: boolean }) {
  return <div className={`football-auth-hero__stat${honour ? " football-auth-hero__stat--honour" : ""}`}><strong>{value}</strong><span>{label}</span></div>;
}

export function HeroPanel() {
  const { replayToken } = useAuthMotion();
  return (
    <section className="football-auth-hero" aria-labelledby="football-auth-hero-title">
      <div className="football-auth-hero__image" key={`image-${replayToken}`} aria-hidden="true" />
      <div className="football-auth-hero__scrim" key={`scrim-${replayToken}`} aria-hidden="true" />
      <div className="football-auth-hero__texture" aria-hidden="true" />
      <div className="football-auth-hero__content">
        <div className="football-auth-hero__wordmark" data-anim key={`wordmark-${replayToken}`}>
          <span>Road to Glory</span><i aria-hidden="true" /><small>Football Life</small>
        </div>
        <div className="football-auth-hero__message">
          <span className="football-auth-hero__eyebrow" data-anim key={`eyebrow-${replayToken}`}>Mười sáu mùa · một sự nghiệp</span>
          <h1 id="football-auth-hero-title" data-anim key={`title-${replayToken}`}>Không ai chọn được<br className="football-auth-hero__desktop-break" /> vận may của mình.</h1>
          <p data-anim key={`copy-${replayToken}`}>Chỉ chọn được cách sống với nó. Mười ba vòng quay tạo ra cầu thủ, rồi mười sáu mùa giải quyết định anh ta trở thành ai.</p>
          <div className="football-auth-hero__stats" data-anim key={`stats-${replayToken}`}>
            <HeroStat value="13" label="vòng quay tạo cầu thủ" />
            <HeroStat value="11" label="vị trí trong đội hình" />
            <HeroStat value="1" label="quả bóng vàng, nếu may" honour />
          </div>
        </div>
        <div className="football-auth-hero__ticker" aria-label="Ví dụ hành trình sự nghiệp">
          <div className="football-auth-hero__ticker-track" key={`ticker-${replayToken}`}>
            <span>{CAREER_TICKER}</span><span aria-hidden="true">{CAREER_TICKER}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
