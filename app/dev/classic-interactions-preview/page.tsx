import { notFound } from "next/navigation";
import { ClassicInteractionsPreview } from "./preview";

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await searchParams;
  return <ClassicInteractionsPreview view={view} />;
}
