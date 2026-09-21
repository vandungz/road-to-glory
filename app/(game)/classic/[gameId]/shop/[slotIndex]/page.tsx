import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { ShopPageClient } from "@/features/wheel/components/ShopPageClient";
import { formatEuroThousands } from "@/lib/transfer-economy";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ShopInventoryEntry } from "@/lib/shop-catalog";
import type { StatSnapshot } from "@/types/domain";

interface Props {
  params: Promise<{ gameId: string; slotIndex: string }>;
  searchParams: Promise<{ season?: string; return?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gameId, slotIndex } = await params;
  const player = await prisma.careerPlayer.findUnique({
    where: { gameSessionId_slotIndex: { gameSessionId: gameId, slotIndex: Number(slotIndex) } },
    select: { name: true },
  });
  return { title: player ? `Cửa hàng — ${player.name} | Football Life` : "Cửa hàng | Football Life" };
}

export default async function ClassicShopPage({ params, searchParams }: Props) {
  const { gameId, slotIndex: slotIndexParam } = await params;
  const { season, return: returnAction } = await searchParams;
  const slotIndex = Number(slotIndexParam);
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 10) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const player = await prisma.careerPlayer.findUnique({
    where: { gameSessionId_slotIndex: { gameSessionId: gameId, slotIndex } },
    select: {
      id: true,
      name: true,
      position: true,
      statsTimeline: true,
      walletBalance: true,
      influenceScore: true,
      shopInventory: true,
      isRetired: true,
      currentAge: true,
      currentStep: true,
      checkpointVersion: true,
      revision: true,
      retireAge: true,
      gameSession: { select: { userId: true } },
    },
  });

  if (!player || player.gameSession.userId !== user.id || player.isRetired) notFound();
  if (
    player.checkpointVersion >= 2 &&
    !["idle", "transfer", "resolved"].includes(player.currentStep ?? "")
  ) notFound();

  const statsTimeline = player.statsTimeline as unknown as StatSnapshot[];
  const currentAge = player.currentAge ?? statsTimeline.at(-1)?.age;
  if (typeof currentAge !== "number") notFound();
  if (player.checkpointVersion >= 2 && currentAge >= player.retireAge) notFound();

  const requestedSeason = Number(season);
  const targetSeason = player.checkpointVersion >= 2 &&
    ["transfer", "resolved"].includes(player.currentStep ?? "")
    ? currentAge + 1
    : requestedSeason === currentAge + 1 ? requestedSeason : currentAge;
  const normalizedReturnAction = returnAction === "advance" && targetSeason === currentAge + 1
    ? "advance"
    : "start";
  const returnHref = `/classic/${gameId}/draft/${slotIndex}?shopReturn=${normalizedReturnAction}&shopAge=${currentAge}`;
  const inventory = (player.shopInventory as unknown as ShopInventoryEntry[]) ?? [];

  return (
    <AppShell
      className="football-shop-shell"
      backHref={`/classic/${gameId}/draft/${slotIndex}`}
      backLabel="Sự nghiệp"
      headerMeta={(
        <div className="football-shop-shell__header-meta">
          <span>
            <small>Cầu thủ</small>
            <strong>{player.name}</strong>
          </span>
          <span>
            <small>Vị trí</small>
            <strong>{player.position}</strong>
          </span>
          <span>
            <small>Số dư ví</small>
            <strong className="football-shop-shell__wallet">{formatEuroThousands(player.walletBalance)}</strong>
          </span>
        </div>
      )}
    >
      <ShopPageClient
        playerId={player.id}
        currentAge={currentAge}
        targetSeason={targetSeason}
        revision={player.revision}
        checkpointVersion={player.checkpointVersion}
        walletBalance={player.walletBalance}
        shopInventory={inventory}
        returnHref={returnHref}
      />
    </AppShell>
  );
}
