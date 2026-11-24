import { AuthLayoutClient } from "@/components/auth/AuthLayoutClient";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
