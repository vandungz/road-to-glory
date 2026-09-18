import type { Prisma } from "@/app/generated/prisma/client";
import type { WageDealOption } from "@/lib/salary-negotiation";

export type TransferOfferKind = "transfer" | "free_agent" | "renewal";

export type TransferNegotiationState = {
  clubId: string;
  offerKind: TransferOfferKind;
  status: "active" | "cancelled" | "completed";
  failedWageMask: number;
  marketCommandId: string | null;
};

export type TransferWorkflowState = {
  workflowId: string | null;
  status: "idle" | "selected" | "completed";
  selectedClubId: string | null;
  selectedOfferKind: TransferOfferKind | null;
  selectedMarketCommandId: string | null;
  version: number;
  negotiations: TransferNegotiationState[];
};

const wageOptionBits: Record<WageDealOption, number> = {
  lower: 1,
  standard: 2,
  higher: 4,
};

function isOfferKind(value: unknown): value is TransferOfferKind {
  return value === "transfer" || value === "free_agent" || value === "renewal";
}

function emptyWorkflowState(): TransferWorkflowState {
  return {
    workflowId: null,
    status: "idle",
    selectedClubId: null,
    selectedOfferKind: null,
    selectedMarketCommandId: null,
    version: 0,
    negotiations: [],
  };
}

function normalizeWorkflowStatus(value: string): TransferWorkflowState["status"] {
  return value === "selected" || value === "completed" ? value : "idle";
}

function normalizeNegotiationStatus(value: string): TransferNegotiationState["status"] {
  return value === "cancelled" || value === "completed" ? value : "active";
}

export async function loadTransferWorkflowState(
  tx: Prisma.TransactionClient,
  playerId: string,
  seasonId: string,
): Promise<TransferWorkflowState> {
  const workflow = await tx.careerTransferWorkflow.findUnique({
    where: { seasonId },
    select: {
      id: true,
      careerPlayerId: true,
      status: true,
      selectedClubId: true,
      selectedOfferKind: true,
      version: true,
      negotiations: {
        select: {
          clubId: true,
          offerKind: true,
          status: true,
          failedWageMask: true,
          marketCommandId: true,
        },
      },
    },
  });
  if (!workflow || workflow.careerPlayerId !== playerId) return emptyWorkflowState();

  const selectedOfferKind = isOfferKind(workflow.selectedOfferKind)
    ? workflow.selectedOfferKind
    : null;
  const selectedNegotiation = workflow.negotiations.find((row) =>
    row.clubId === workflow.selectedClubId && row.offerKind === selectedOfferKind,
  );
  return {
    workflowId: workflow.id,
    status: normalizeWorkflowStatus(workflow.status),
    selectedClubId: workflow.selectedClubId,
    selectedOfferKind,
    selectedMarketCommandId: selectedNegotiation?.marketCommandId ?? null,
    version: workflow.version,
    negotiations: workflow.negotiations
      .filter((row): row is typeof row & { offerKind: TransferOfferKind } => isOfferKind(row.offerKind))
      .map((row) => ({
        clubId: row.clubId,
        offerKind: row.offerKind,
        status: normalizeNegotiationStatus(row.status),
        failedWageMask: row.failedWageMask,
        marketCommandId: row.marketCommandId,
      })),
  };
}

export function wageOptionMask(option: WageDealOption): number {
  return wageOptionBits[option];
}

export function wageOptionsFromMask(mask: number): WageDealOption[] {
  return (Object.keys(wageOptionBits) as WageDealOption[])
    .filter((option) => (mask & wageOptionBits[option]) !== 0);
}

export function failedWageOptionsFromWorkflow(
  state: TransferWorkflowState,
  clubId: string,
): WageDealOption[] {
  const mask = state.negotiations.find((row) => row.clubId === clubId)?.failedWageMask ?? 0;
  return wageOptionsFromMask(mask);
}

export function cancelledClubIdsFromWorkflow(state: TransferWorkflowState): Set<string> {
  return new Set(
    state.negotiations
      .filter((row) => row.status === "cancelled")
      .map((row) => row.clubId),
  );
}

export function isClubCancelledInWorkflow(state: TransferWorkflowState, clubId: string): boolean {
  return state.negotiations.some((row) => row.clubId === clubId && row.status === "cancelled");
}

async function ensureWorkflow(
  tx: Prisma.TransactionClient,
  playerId: string,
  seasonId: string,
): Promise<{ id: string }> {
  return tx.careerTransferWorkflow.upsert({
    where: { seasonId },
    create: { careerPlayerId: playerId, seasonId },
    update: {},
    select: { id: true },
  });
}

/** Serializes transfer completion attempts for one season without locking other careers. */
export async function lockTransferWorkflow(
  tx: Prisma.TransactionClient,
  playerId: string,
  seasonId: string,
): Promise<TransferWorkflowState> {
  const workflow = await ensureWorkflow(tx, playerId, seasonId);
  await tx.$queryRaw`SELECT "id" FROM "career_transfer_workflows" WHERE "id" = ${workflow.id} FOR UPDATE`;
  return loadTransferWorkflowState(tx, playerId, seasonId);
}

export async function persistTransferOfferSelection(
  tx: Prisma.TransactionClient,
  params: {
    playerId: string;
    seasonId: string;
    clubId: string | null;
    offerKind?: TransferOfferKind | null;
    marketCommandId?: string | null;
  },
): Promise<void> {
  await tx.careerTransferWorkflow.upsert({
    where: { seasonId: params.seasonId },
    create: {
      careerPlayerId: params.playerId,
      seasonId: params.seasonId,
      status: params.clubId ? "selected" : "idle",
      selectedClubId: params.clubId,
      selectedOfferKind: params.clubId ? params.offerKind ?? null : null,
      version: 0,
    },
    update: {
      status: params.clubId ? "selected" : "idle",
      selectedClubId: params.clubId,
      selectedOfferKind: params.clubId ? params.offerKind ?? null : null,
      version: { increment: 1 },
    },
  });

  if (!params.clubId || !params.offerKind) return;
  const workflow = await ensureWorkflow(tx, params.playerId, params.seasonId);
  await tx.careerTransferNegotiation.upsert({
    where: {
      careerPlayerId_seasonId_clubId_offerKind: {
        careerPlayerId: params.playerId,
        seasonId: params.seasonId,
        clubId: params.clubId,
        offerKind: params.offerKind,
      },
    },
    create: {
      careerPlayerId: params.playerId,
      seasonId: params.seasonId,
      workflowId: workflow.id,
      clubId: params.clubId,
      offerKind: params.offerKind,
      marketCommandId: params.marketCommandId ?? null,
    },
    update: {
      workflowId: workflow.id,
      marketCommandId: params.marketCommandId ?? undefined,
    },
  });
}

export async function recordTransferWageFailure(
  tx: Prisma.TransactionClient,
  params: {
    playerId: string;
    seasonId: string;
    clubId: string;
    offerKind: TransferOfferKind;
    wageOption: WageDealOption;
    marketCommandId?: string | null;
  },
): Promise<{ failedWageOptions: WageDealOption[]; cancelled: boolean }> {
  const workflow = await ensureWorkflow(tx, params.playerId, params.seasonId);
  const marketCommandId = params.marketCommandId ?? (
    params.offerKind === "transfer" || params.offerKind === "free_agent"
      ? (await tx.careerCommand.findUnique({
          where: {
            careerPlayerId_idempotencyKey: {
              careerPlayerId: params.playerId,
              idempotencyKey: `transfer:${params.playerId}:${params.seasonId}:market:yes`,
            },
          },
          select: { id: true },
        }))?.id ?? null
      : null
  );
  await tx.careerTransferNegotiation.upsert({
    where: {
      careerPlayerId_seasonId_clubId_offerKind: {
        careerPlayerId: params.playerId,
        seasonId: params.seasonId,
        clubId: params.clubId,
        offerKind: params.offerKind,
      },
    },
    create: {
      careerPlayerId: params.playerId,
      seasonId: params.seasonId,
      workflowId: workflow.id,
      clubId: params.clubId,
      offerKind: params.offerKind,
      marketCommandId,
    },
    update: {
      workflowId: workflow.id,
      marketCommandId: marketCommandId ?? undefined,
    },
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await tx.careerTransferNegotiation.findUniqueOrThrow({
      where: {
        careerPlayerId_seasonId_clubId_offerKind: {
          careerPlayerId: params.playerId,
          seasonId: params.seasonId,
          clubId: params.clubId,
          offerKind: params.offerKind,
        },
      },
      select: { id: true, failedWageMask: true },
    });
    const nextMask = current.failedWageMask | wageOptionMask(params.wageOption);
    const cancelled = wageOptionsFromMask(nextMask).length >= 2;
    const updated = await tx.careerTransferNegotiation.updateMany({
      where: { id: current.id, failedWageMask: current.failedWageMask },
      data: { failedWageMask: nextMask, status: cancelled ? "cancelled" : "active" },
    });
    if (updated.count !== 1) continue;

    if (cancelled) {
      await tx.careerTransferWorkflow.updateMany({
        where: { seasonId: params.seasonId, selectedClubId: params.clubId },
        data: { status: "idle", selectedClubId: null, selectedOfferKind: null, version: { increment: 1 } },
      });
    } else {
      await tx.careerTransferWorkflow.updateMany({
        where: {
          id: workflow.id,
          OR: [{ selectedClubId: null }, { selectedClubId: params.clubId }],
        },
        data: {
          status: "selected",
          selectedClubId: params.clubId,
          selectedOfferKind: params.offerKind,
          version: { increment: 1 },
        },
      });
    }
    return { failedWageOptions: wageOptionsFromMask(nextMask), cancelled };
  }
  throw new Error("Không thể cập nhật trạng thái đàm phán lương đồng thời");
}

export async function completeTransferWorkflow(
  tx: Prisma.TransactionClient,
  params: { playerId: string; seasonId: string; clubId: string | null; offerKind: TransferOfferKind },
): Promise<void> {
  const workflow = await ensureWorkflow(tx, params.playerId, params.seasonId);
  await tx.careerTransferWorkflow.update({
    where: { id: workflow.id },
    data: {
      status: "completed",
      selectedClubId: null,
      selectedOfferKind: null,
      version: { increment: 1 },
    },
  });
  if (!params.clubId) return;
  await tx.careerTransferNegotiation.updateMany({
    where: {
      careerPlayerId: params.playerId,
      seasonId: params.seasonId,
      clubId: params.clubId,
      offerKind: params.offerKind,
    },
    data: { status: "completed" },
  });
}
