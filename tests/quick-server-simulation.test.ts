import assert from "node:assert/strict";
import { createInitialState } from "../features/quick-mode/lib/quick-initial-state";
import { getQuickModeOptions } from "../features/quick-mode/lib/quick-mode-options";
import { getQuickView, spinQuickMode } from "../features/quick-mode/services/quick-simulation.service";
import { quickStateSchema } from "../features/quick-mode/contracts/quick-input";
const { leagues, clubs } = getQuickModeOptions();
for (const position of ["GK", "ST", "CM"] as const) {
    for (const draw of [0.1, 0.5, 0.9]) {
        let state = createInitialState();
        state.player = { ...state.player, name: "Fixture", position };
        for (let turn = 0; state.phase !== "complete"; turn++) {
            assert.ok(turn < 350, "Career must terminate");
            quickStateSchema.parse(state);
            const before = JSON.stringify(state);
            const old = getQuickView(state, leagues, clubs);
            const result = spinQuickMode(state, leagues, clubs, () => draw);
            assert.equal(JSON.stringify(state), before, "Simulation must not mutate its input");
            assert.ok(result.targetIndex >= 0 && result.targetIndex < (old.activeWheel?.items.length ?? 0));
            state = result.view.state;
        }
        quickStateSchema.parse(state);
        assert.equal(state.clubs.reduce((total, club) => total + club.seasons, 0), state.player.careerLength);
        assert.ok((state.finale.cleanSheets ?? 0) <= (state.finale.appearances ?? 0));
    }
}
assert.equal(quickStateSchema.safeParse({ ...createInitialState(), clubs: Array(50).fill({}) }).success, false);
assert.equal(quickStateSchema.safeParse({ ...createInitialState(), setupStep: Infinity }).success, false);
console.log("Quick server simulation: nine full careers, immutable transitions, saved-state validation and bounded totals passed.");
