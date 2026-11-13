import { cookies } from "next/headers";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import vi from "./messages/vi.json";
import en from "./messages/en.json";
import { localeCookie, locales } from "./locale";

export default getRequestConfig(async () => {
  const preference = (await cookies()).get(localeCookie)?.value;
  const locale = hasLocale(locales, preference) ? preference : "vi";
  return { locale, timeZone: "UTC", messages: locale === "en" ? en : vi };
});
