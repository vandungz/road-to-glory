import { useTranslations } from "next-intl";

export function AudioAttribution() {
  const t = useTranslations("audio");
  return <div className="football-audio-attribution">
    <h3>{t("attributionTitle")}</h3>
    <p><a href="https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1600018">Floating Cities</a>, <a href="https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1100844">Cipher</a>, Kevin MacLeod (incompetech.com). <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. {t("musicEdits")}</p>
    <p>{t("soundCredits")} <a href="https://kenney.nl/support">Kenney</a>, <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0</a>.</p>
  </div>;
}
