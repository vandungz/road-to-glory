/**
 * Public transfer-economy facade.
 *
 * The implementation is split by policy boundary so callers keep the stable
 * import path while each pure module remains small and independently testable.
 */
export * from "./transfer-economy-core";
export * from "./transfer-economy-contracts";
export * from "./transfer-economy-approach";
