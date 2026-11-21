import { notFound } from "next/navigation";
import { TrophyCabinetPreview } from "./preview";

export default async function Page({ searchParams }: { searchParams: Promise<{ empty?: string; few?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { empty, few } = await searchParams;
  return <TrophyCabinetPreview count={empty ? 0 : few ? 1 : 14} />;
}
