import { notFound } from "next/navigation";
import { DesignPreview } from "./DesignPreview";

export default async function DesignPreviewPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await searchParams;
  return <DesignPreview initialTab={view} />;
}
