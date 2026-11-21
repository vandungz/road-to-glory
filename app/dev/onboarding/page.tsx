import { notFound } from "next/navigation";
import { OnboardingPreview } from "./preview";

export default async function OnboardingPreviewPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <OnboardingPreview view={(await searchParams).view} />;
}
