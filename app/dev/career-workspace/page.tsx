import { notFound } from "next/navigation";
import { CareerWorkspacePreview } from "./CareerWorkspacePreview";

export default async function CareerWorkspacePage({ searchParams }: { searchParams: Promise<{ step?: string; clubs?: string; portrait?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { step, clubs, portrait } = await searchParams;
  return <CareerWorkspacePreview cup={step === "cup" || step === "chain"} transfer={step === "transfer"} manyClubs={clubs === "many"} showPortrait={portrait === "true"} reactionStep={step} />;
}
