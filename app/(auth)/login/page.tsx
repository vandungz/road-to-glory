import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập | Football Life",
};

interface Props {
  searchParams: Promise<{ error?: string; next?: string }>;
}

function getSafeNextPath(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  try {
    const base = new URL("https://football-life.invalid");
    const destination = new URL(next, base);
    if (destination.origin !== base.origin) return "/";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, next } = await searchParams;
  return <LoginForm initialError={error} nextPath={getSafeNextPath(next)} />;
}
