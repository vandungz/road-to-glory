import { getFlagUrl } from "@/features/squad/lib/nation-flags";

export function NationFlag({ nationality }: { nationality: string }) {
  const src = getFlagUrl(nationality);
  if (!src) return <span className="football-nation-flag__fallback">{nationality.slice(0, 3)}</span>;
  // The catalog already supplies external flag assets; fixed dimensions prevent layout shifts.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="football-nation-flag" src={src} alt={nationality} width={28} height={20} />;
}
