import { notFound } from "next/navigation";
import { CareerWorkspacePreview } from "./CareerWorkspacePreview";

export default async function CareerWorkspacePage({ searchParams }: { searchParams: Promise<{ step?: string; clubs?: string; portrait?: string; result?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { step, clubs, portrait, result } = await searchParams;
  return <CareerWorkspacePreview cup={step === "cup" || step === "chain"} transfer={step === "transfer"} manyClubs={clubs === "many"} showPortrait={portrait === "true"} reactionStep={step} initialResult={result === "national" || result === "league" ? result : undefined} />;
}
