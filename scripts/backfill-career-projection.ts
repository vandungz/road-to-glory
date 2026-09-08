import { prisma } from "@/lib/prisma";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function latestTimelineAge(value: unknown): number | null {
  const timeline = Array.isArray(value) ? value : [];
  const latest = asRecord(timeline.at(-1));
  return typeof latest.age === "number" ? latest.age : null;
}

async function main() {
  const candidates = await prisma.careerPlayer.findMany({
    where: {
      checkpointVersion: 1,
      currentAge: null,
      currentStep: null,
      currentWheel: null,
    },
    select: {
      id: true,
      isRetired: true,
      statsTimeline: true,
    },
    orderBy: { id: "asc" },
  });

  const updates = candidates.flatMap((player) => {
    const currentAge = latestTimelineAge(player.statsTimeline);
    if (currentAge === null) return [];
    return [{
      id: player.id,
      currentAge,
      currentStep: player.isRetired ? "retired" : "idle",
      currentWheel: "career",
    }];
  });

  console.table({
    mode: process.argv.includes("--apply") ? "apply" : "dry-run",
    candidates: candidates.length,
    safeUpdates: updates.length,
    skippedWithoutTimelineAge: candidates.length - updates.length,
  });

  if (!process.argv.includes("--apply")) {
    console.log("Dry-run only. No database rows were changed.");
    return;
  }
  if (process.env.CAREER_BACKFILL_CONFIRM !== "I_UNDERSTAND_LEGACY_PROJECTION") {
    throw new Error(
      "Refusing to write. Set CAREER_BACKFILL_CONFIRM=I_UNDERSTAND_LEGACY_PROJECTION to apply.",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    let updated = 0;
    for (const candidate of updates) {
      const row = await tx.careerPlayer.updateMany({
        where: {
          id: candidate.id,
          checkpointVersion: 1,
          currentAge: null,
          currentStep: null,
          currentWheel: null,
        },
        data: {
          currentAge: candidate.currentAge,
          currentStep: candidate.currentStep,
          currentWheel: candidate.currentWheel,
        },
      });
      updated += row.count;
    }
    return updated;
  });

  console.log(`Backfill updated ${result} legacy projection row(s).`);
  console.log("checkpointVersion remains 1; no season/checkpoint was fabricated.");
}

main()
  .catch((error) => {
    console.error("Career projection backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
