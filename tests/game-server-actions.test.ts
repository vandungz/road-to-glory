import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { resolve } from "node:path";
import { createInitialState } from "../features/quick-mode/lib/quick-initial-state";
const load = createRequire(resolve("tests/game-server-actions.test.ts"));
const originals = new Map<string, NodeModule | undefined>();
function stub(path: string, exports: object) { const id = load.resolve(path); originals.set(id, load.cache[id]); const m = new Module(id); m.exports = exports; m.loaded = true; load.cache[id] = m; }
async function main() {
    let signedIn = false, limited = false;
    const keys: string[] = [];
    try {
        stub("next/headers", { headers: async () => new Headers({ "x-real-ip": "127.0.0.1" }) });
        stub("next/cache", { unstable_cache: (fn: unknown) => fn });
        stub("../lib/auth/guards", { requireAuthenticatedUser: async () => { if (!signedIn)
                throw new Error("Unauthenticated"); return { id: "fixture-owner" }; } });
        stub("../lib/prisma", { prisma: { league: { findMany: async () => [] }, club: { findMany: async () => [] } } });
        stub("../lib/rate-limit", { checkRateLimit: async (key: string) => { keys.push(key); if (limited)
                throw new Error("Limited"); } });
        const quick = load("../actions/quick-mode.actions") as typeof import("../actions/quick-mode.actions");
        const preview = load("../actions/wheel-preview.actions") as typeof import("../actions/wheel-preview.actions");
        const transfer = load("../actions/transfer-display.actions") as typeof import("../actions/transfer-display.actions");
        const initial = createInitialState();
        const view = await quick.prepareQuickWheelAction(initial);
        assert.equal(view.activeWheel?.key, "debut-age", "Quick remains playable without authentication");
        assert.ok(keys.includes("quick:127.0.0.1"));
        const setup = { step: 1, position: "ST", draft: { nationality: "England" } };
        await assert.rejects(preview.getSetupWheelPreviewAction(setup), /Unauthenticated/);
        const fee = { kind: "fee", baseFee: 1000, buyout: 500, prestige: 3, tier: 1 };
        await assert.rejects(transfer.getTransferDisplayBatchAction([fee]), /Unauthenticated/);
        signedIn = true;
        const items = await preview.getSetupWheelPreviewAction(setup);
        assert.ok(items.length > 0);
        assert.ok(items.every(item => !("weight" in item)), "Draft display does not expose internal pool weights");
        const prices = await transfer.getTransferDisplayBatchAction([fee, { kind: "wage", wage: 1000, prestige: 3, tier: 1, apps: 30 }]);
        assert.equal(prices[0].kind, "fee");
        assert.equal(prices[1].kind, "wage");
        assert.ok(!JSON.stringify(prices).includes("acceptChanceModifier"));
        assert.ok(keys.includes("transfer-display:fixture-owner"));
        const before = keys.length;
        await assert.rejects(quick.spinQuickWheelAction({ ...initial, player: { ...initial.player, stats: { pac: Infinity } } }));
        await assert.rejects(transfer.getTransferDisplayBatchAction(Array(31).fill(fee)));
        assert.equal(keys.length, before, "Malformed inputs stop before quota/provider work");
        limited = true;
        await assert.rejects(quick.spinQuickWheelAction(initial), /Limited/);
        assert.equal(initial.setupStep, 0);
        console.log("Game actions: guest Quick, authenticated previews, bounded batches, rate limits and display-only DTOs passed.");
    }
    finally {
        for (const [id, original] of originals) {
            if (original)
                load.cache[id] = original;
            else
                delete load.cache[id];
        }
    }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
