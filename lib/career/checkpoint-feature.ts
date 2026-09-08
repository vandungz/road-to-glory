/**
 * Rollout switch for newly created careers. Existing V2 careers are never
 * downgraded by this flag; their persisted checkpointVersion remains the
 * source of truth on resume.
 */
export function isCheckpointV2EnabledForNewCareer(): boolean {
  const value = process.env.CHECKPOINT_V2?.trim().toLowerCase();
  return value !== "false" && value !== "0" && value !== "off";
}
