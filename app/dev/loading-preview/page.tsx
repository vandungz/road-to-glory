import { notFound } from "next/navigation";
import CareerLoading from "@/app/(game)/classic/[gameId]/draft/[slotIndex]/loading";
import QuickLoading from "@/app/(game)/quick/play/loading";
import PveLobbyLoading from "@/app/(game)/pve/loading";
import PveTournamentLoading from "@/app/(game)/pve/[gameId]/loading";

export default async function LoadingPreview({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await searchParams;
  if (view === "quick") return <QuickLoading />;
  if (view === "records") return <PveLobbyLoading />;
  if (view === "match") return <PveTournamentLoading />;
  return <CareerLoading />;
}
