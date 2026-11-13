import Image from "next/image";
import dimensions from "@/public/media/editorial/dimensions.json";

export const EDITORIAL_ASSETS = [
  "heritage-run", "air-control", "volley-control", "pitch-overview",
  "free-kick", "match-duel", "heritage-touch", "contract-signing", "ballon-dor-trophy",
] as const;

export type EditorialAsset = typeof EDITORIAL_ASSETS[number];

const DISPLAY_VARIANTS: Partial<Record<EditorialAsset, string>> = {
  "pitch-overview": "pitch-overview-action",
  "free-kick": "free-kick-clean",
  "contract-signing": "contract-signing",
  "ballon-dor-trophy": "ballon-dor-trophy",
};

export function EditorialRail({ asset }: { asset: EditorialAsset }) {
  return <aside className="football-editorial-rail" aria-hidden="true"><EditorialArt asset={asset} /></aside>;
}

/** Decorative editorial reference, never a fictional player's assigned face. */
export function EditorialArt({ asset, className = "", priority = false }: {
  asset: EditorialAsset;
  className?: string;
  priority?: boolean;
}) {
  return <Image src={`/media/editorial/${DISPLAY_VARIANTS[asset] ?? `${asset}-trimmed`}.webp`} alt="" aria-hidden="true"
    width={dimensions[asset].width} height={dimensions[asset].height} unoptimized priority={priority}
    className={`football-editorial-art ${className}`} />;
}
