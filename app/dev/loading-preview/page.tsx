import { notFound } from "next/navigation";
import CareerLoading from "@/app/(game)/classic/[gameId]/draft/[slotIndex]/loading";
import QuickLoading from "@/app/(game)/quick/play/loading";
import PveLobbyLoading from "@/app/(game)/pve/loading";
import PveTournamentLoading from "@/app/(game)/pve/[gameId]/loading";
import { BrandedSplash } from "@/components/shared/BrandedSplash";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { GameRouteLoading } from "@/components/shared/GameRouteLoading";

async function ReadyAfterDelay() {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return <div data-testid="splash-ready">Road to Glory</div>;
}

export default async function LoadingPreview({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await searchParams;
  if (view === "splash") return <BrandedSplash />;
  if (view === "splash-transition") return <Suspense fallback={<BrandedSplash />}><ReadyAfterDelay /></Suspense>;
  if (view === "setup") {
    const ui = await getTranslations("ui");
    return <GameRouteLoading title={ui("createPlayer")} label={ui("loadingPlayerProfile")} layout="setup" />;
  }
  if (view === "quick") return <QuickLoading />;
  if (view === "records") return <PveLobbyLoading />;
  if (view === "match") return <PveTournamentLoading />;
  return <CareerLoading />;
}
