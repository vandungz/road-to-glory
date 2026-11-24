import { cookies, headers } from "next/headers";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import vi from "./messages/vi.json";
import en from "./messages/en.json";
import { localeCookie, locales } from "./locale";

export default getRequestConfig(async ({ locale: override }) => {
  const preference = (await cookies()).get(localeCookie)?.value;
  const pageLocale = (await headers()).get("x-football-landing-locale");
  const candidate = override ?? pageLocale ?? preference;
  const locale = hasLocale(locales, candidate) ? candidate : "vi";
  return { locale, timeZone: "UTC", messages: locale === "en" ? en : vi };
});
