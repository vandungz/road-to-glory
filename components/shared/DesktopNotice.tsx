import { useTranslations } from "next-intl";
import { Monitor } from "lucide-react";
import Link from "next/link";

/** CSS keeps a running career mounted if its window is temporarily narrowed. */
export function DesktopNotice() {
  const ui = useTranslations("ui");
  return (
    <section className="football-desktop-notice" aria-labelledby="desktop-notice-title">
      <Link href="/" className="football-desktop-notice__brand">Road to Glory</Link>
      <div className="football-desktop-notice__body">
        <Monitor size={56} strokeWidth={1.5} aria-hidden="true" />
        <h1 id="desktop-notice-title">{ui("playOnDesktop")}</h1>
        <p>{ui("openFootballLifeOnAComputerOrWidenYourBrowserWindowToContinue")}</p>
        <span>{ui("minimumWindowWidth1024Px")}</span>
      </div>
      <p className="football-desktop-notice__footer">Football Life / Road to Glory</p>
    </section>
  );
}
