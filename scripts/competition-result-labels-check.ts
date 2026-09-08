import assert from "node:assert/strict";
import { getCompetitionResultLabel } from "@/features/wheel/lib/competition-result-labels";

assert.equal(getCompetitionResultLabel("Quarter-Finals", "Chờ quay"), "Tứ kết");
assert.equal(getCompetitionResultLabel("Round of 16", "Chờ quay"), "Vòng 1/8");
assert.equal(getCompetitionResultLabel("Round of 32", "Chờ quay"), "Vòng 1/16");
assert.equal(getCompetitionResultLabel("Group Stage", "Chờ quay"), "Vòng bảng");
assert.equal(getCompetitionResultLabel("Chờ quay", "Chưa có kết quả"), "Chưa có kết quả");
assert.equal(getCompetitionResultLabel("custom-result", "Chờ quay"), "custom-result");

console.log("competition-result-labels-check: passed");
