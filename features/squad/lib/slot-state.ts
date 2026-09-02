import type { ClientSafePlayer } from "@/types/squad";

export type SlotState = "filled" | "active" | "empty" | "locked";

export function getSlotStateForIndex(
  slotIndex: number,
  player: ClientSafePlayer | undefined,
  inProgressSlots: number[],
  status: string | undefined,
): SlotState {
  if (player) return "filled";
  if (inProgressSlots.includes(slotIndex)) return "active";
  if (status === "completed") return "locked";
  return "empty";
}
