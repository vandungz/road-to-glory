import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const ui = await getTranslations("ui");
  return { title: ui("signIn") + " | Football Life" };
}

interface Props {
  searchParams: Promise<{ error?: string; next?: string; verify?: string }>;
}

function getSafeNextPath(next?: string) {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  try {
    const base = new URL("https://football-life.invalid");
    const destination = new URL(next, base);
    if (destination.origin !== base.origin || destination.pathname.startsWith("//")) return "/";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, next, verify } = await searchParams;
  return <LoginForm initialError={error} nextPath={getSafeNextPath(next)} initialVerification={verify === "1"} />;
}
