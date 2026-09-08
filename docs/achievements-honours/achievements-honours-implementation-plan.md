# Implementation Plan — Danh hiệu, thành tích và Award Simulator

> Trạng thái: READY FOR IMPLEMENTATION  
> SoT nguồn: [achievements-honours-sot.md](achievements-honours-sot.md)  
> Ngày lập kế hoạch: 2026-09-08  
> Phạm vi: triển khai một batch hoàn chỉnh FE–BE–DB; sau khi code xong sẽ chạy system test, sau đó bàn giao checklist manual test cho owner.

## 0. Mục tiêu và nguyên tắc khóa

Mục tiêu của batch này là thay toàn bộ cơ chế danh hiệu/thành tích hiện tại bằng một pipeline có nguồn sự thật duy nhất, simulator sinh kết quả award có tính cạnh tranh và UI có thể hiển thị ranking list theo từng mùa.

Các nguyên tắc không được phá vỡ:

1. CareerHonour là record canonical cho danh hiệu/thành tích mà career player đạt được.
2. CareerAwardRankingSnapshot là snapshot canonical cho danh sách ứng viên/xếp hạng của từng award có ranking.
3. Candidate được simulator tạo trong phạm vi career-season hiện tại; không truy vấn dữ liệu từ các career khác.
4. Simulator không phát award bằng magic number rải trong code. Mọi award dùng award config/model có version, scope và evidence.
5. Golden Boot và Vua kiến tạo chỉ đọc league stats.
6. Best XI là selection theo slot/vị trí; Best Player là một ranking tổng thể độc lập.
7. Ballon d'Or và các award khác dùng cùng pipeline candidate → scoring → resolution → snapshot, nhưng mỗi award có scoring model riêng.
8. Không có đồng thắng giải. Khi bằng chỉ số, random resolution chọn một winner duy nhất, lưu weight và kết quả; retry không re-roll.
9. Client chỉ hiển thị và gửi command hợp lệ; client không được quyết định award, score, candidate, honour hoặc ranking.
10. Mọi season close, refresh, resume, retry, retire và archive đều phải đọc được cùng một kết quả canonical.

## 1. Phạm vi triển khai trong một batch

### Bao gồm

- Prisma schema và migration cho award records/ranking snapshots.
- Pure simulator sinh candidate universe và award ranking.
- Award-specific resolver cho:
  - League Golden Boot.
  - League Top Assist / Vua kiến tạo.
  - League Golden Glove.
  - League Best Defender.
  - League Best XI.
  - League Best Player.
  - Ballon d'Or.
  - Team trophies theo kết quả season.
- Tích hợp vào V2 season stats commit, Ballon wheels và season close.
- Adapter/bảo vệ legacy path.
- Backfill dữ liệu cũ có evidence; đánh dấu dữ liệu không thể xác minh.
- Read model/query cho archive và UI.
- UI ranking list, award detail, season recap, trophy cabinet, career archive.
- Unit, contract, integration, database, concurrency/idempotency và browser/system tests.
- Cập nhật SoT và tài liệu historical link.

### Không bao gồm

- Dữ liệu ranking global dùng chung giữa nhiều career.
- Kết nối dữ liệu cầu thủ thực tế bên ngoài hệ thống.
- Match engine hoặc mô phỏng từng trận.
- Thay đổi transfer economy, growth model hoặc influence formula ngoài phần cần chuyển nguồn đọc achievement.
- Đồng thắng giải.

## 2. Kiến trúc target

~~~text
Season wheel outcomes
  + player season stats
  + career/club/league context
        │
        ▼
Award Simulator (pure, server-owned)
  ├─ generate local candidate universe
  ├─ calculate award-specific features
  ├─ filter eligibility
  ├─ calculate score/weight
  ├─ resolve winner/rank/random tie
  └─ produce evidence + model version
        │
        ├─ CareerAwardRankingSnapshot
        ├─ CareerHonour
        ├─ CareerEvent narrative
        └─ SeasonHistory public projection
        │
        ▼
Shared CareerHonours read model
        │
        ├─ Season recap
        ├─ Ballon d'Or result/ranking page
        ├─ Trophy cabinet
        ├─ Career archive
        └─ Influence/retirement summary
~~~

### Ownership

- features/season/services/award-simulator.service.ts: pure candidate generation/scoring/resolution.
- features/career/services/award-persistence.service.ts: transaction, upsert, idempotency, projection.
- Prisma tables: durable authority.
- CareerPlayer.achievements: derived compatibility cache, không nhận trực tiếp từ client.
- seasonHistory: public projection, không phải audit source.
- UI: chỉ query/read model, không tính award.

Không đặt award logic trong React hook, modal, Server Component hoặc action input parser.

## 3. Database model và migration

### 3.1 CareerHonour

Tạo model riêng, liên kết tới CareerPlayer và CareerSeason.

Các field chính:

- id UUID.
- careerPlayerId FK.
- seasonId FK.
- age, seasonLabel.
- category: team_trophy | individual_award | ballon_dor.
- awardKey: ví dụ league_golden_boot, league_top_assist, league_best_xi, league_player_of_season, ballon_dor.
- scope: league | domestic_cup | continental | national_team | club | career | unknown.
- scopeKey: league/competition/club key khi có.
- awardInstanceKey: non-null deterministic identity dùng cho idempotency.
- slotKey: bắt buộc với Best XI slot.
- rank, result, label.
- clubId, clubName, leagueId.
- metrics JSON: evidence được chuẩn hóa.
- modelVersion, resolutionVersion.
- source: season_simulation | ballon_dor_wheel | legacy_backfill.
- timestamps.

Constraint/index:

- Unique (careerPlayerId, awardInstanceKey).
- Index (careerPlayerId, seasonId).
- Index (careerPlayerId, awardKey, scope, seasonId).
- FK cascade theo lifecycle của career; không để orphan record.
- Validate range rank 1..10 cho Ballon d'Or ở service và migration/data check.
- awardInstanceKey encode scope/award/slot để không phụ thuộc nullable unique column.

### 3.2 CareerAwardRankingSnapshot

Tạo model header cho bảng ranking của một award trong một career-season.

Các field chính:

- id UUID.
- careerPlayerId, seasonId.
- snapshotKey: non-null unique key theo season + scope + award.
- awardKey, scope, scopeKey.
- modelVersion, resolutionVersion.
- status: generated | resolved | superseded.
- entries JSON bounded, tối đa theo config; mỗi entry gồm:
  - candidateKey.
  - rank.
  - name, clubName, position.
  - isCareerPlayer.
  - metrics.
  - score hoặc weight đã chuẩn hóa.
  - result.
- resolution JSON: seed/weight/result metadata cần cho replay audit, không expose secret.
- timestamps.

Lý do dùng bounded JSON cho entries: ranking snapshot được đọc cùng nhau, các candidate không có lifecycle độc lập và không cần query cross-season theo từng candidate. Nếu sau này analytics cần query candidate-level, có thể tách child table mà không đổi contract read model.

Constraint/index:

- Unique snapshotKey.
- Index (careerPlayerId, seasonId).
- Index (careerPlayerId, awardKey, scope).
- Không cho snapshot candidate từ career khác.

### 3.3 Migration rollout

Trong cùng implementation batch nhưng theo thứ tự expand/contract:

1. Add tables, FKs, indexes và compatible enums/strings.
2. Deploy domain types/validators có thể đọc trạng thái chưa có record.
3. Deploy simulator + persistence dual-read:
   - write canonical records;
   - maintain achievements derived cache trong thời gian tương thích.
4. Backfill historical data idempotently.
5. Chuyển toàn bộ UI/read model sang canonical query.
6. Chặn legacy client award writes.
7. Giữ achievements JSON chỉ như cache tương thích; không xóa trong batch này nếu còn consumer.
8. Xác minh rồi mới lập follow-up riêng để loại bỏ JSON legacy.

Không chạy backfill một lần không giới hạn. Script phải batch, resumable, log số row inserted/skipped/ambiguous/failed và cho phép rerun an toàn.

## 4. Award simulator

### 4.1 Input/output contract

Tạo shared contract/Zod schema cho:

~~~text
AwardSimulationInput {
  careerPlayerId;
  seasonId;
  seasonContext;
  playerSeasonStats;
  competitionStats;
  playerContext;
  awardConfigVersion;
  randomSource;
}

AwardSimulationResult {
  rankings: CareerAwardRankingSnapshotInput[];
  honourCandidates: CareerHonourInput[];
  ballonDor: {
    evaluation;
    nominationWeight;
    rankWeights;
    candidateSnapshotKey;
  };
  modelVersion;
}
~~~

Pure service không import React/Next.js/Prisma. Persistence service mới nhận output và ghi DB.

### 4.2 Candidate universe của từng career

Simulator dựng candidate universe riêng cho season hiện tại:

- Player của người chơi là một candidate thật trong universe.
- Candidate khác do simulator generate, không lấy từ career khác.
- Candidate phải có context hợp lý: position, age band, club/league strength, appearances, role stats, rating, team success.
- Candidate generation dùng server random source/seed của season-award resolution; kết quả snapshot được persist để UI và retry không khác nhau.
- Candidate key phải namespaced theo snapshot, không giả vờ là một global player ID.
- Không generate danh sách nếu award không có ranking, ví dụ team trophy đơn thuần.

Candidate universe cần được tạo trước khi resolver tính ranking; không để UI tự tạo “đối thủ giả”.

### 4.3 Common resolver pipeline

Mỗi award chạy cùng pipeline:

~~~text
scope stats
  → generate candidate universe
  → validate scope and appearances
  → calculate award-specific feature vector
  → score/weight candidates
  → sort by score
  → random resolution for equal-score group
  → assign final rank/result
  → emit ranking snapshot + honour candidate + evidence
~~~

Không dùng goals >= 20, totalCS >= 15, matchRating >= 7.60 để kết luận winner. Minimum appearances hoặc eligibility guard nếu cần phải nằm trong config/model có tên và version; winner vẫn do candidate ranking quyết định.

### 4.4 Award-specific rules

#### League Golden Boot

- Source duy nhất: leagueStats.goals.
- Candidate mọi position hợp lệ theo config; không hardcode chỉ ST/LW/RW.
- Ranking chính theo league goals.
- Không đọc totalGoals.
- Tie chuyển sang random resolution có weight; chọn một winner.
- Snapshot hiển thị ít nhất top 10 và player của người chơi nếu nằm ngoài top list.

#### League Top Assist

- Source duy nhất: leagueStats.assists.
- Không đọc totalAssists.
- Cùng scope/appearance/tie policy với Golden Boot.
- Award key: league_top_assist.

#### Golden Glove

- Scope phải được chốt là league.
- Source: league clean sheets và goalkeeper-specific eligibility.
- Không dùng total clean sheets mọi đấu trường.
- Nếu product muốn award theo competition khác, tạo award key/snapshot scope riêng.

#### Best Defender

- Scope league.
- Không chỉ dùng clean sheets; cần defensive role features phù hợp position.
- CDM phải có rule riêng hoặc không nằm trong defender slot; không dùng chung label “hậu vệ” cho mọi defensive position.
- Snapshot phải có candidate metrics giải thích selection.

#### Best XI

- Scope và formation phải được persist trong snapshot.
- Mỗi slot có slotKey, position eligibility, minimum appearances và candidate ranking.
- Emit đúng số slot formation; không trao cho mọi cầu thủ vượt một rating threshold.
- Best XI có thể có nhiều CareerHonour records trong cùng season, mỗi record một slot.

#### Best Player

- Một winner tổng thể theo scope.
- Composite model gồm role-appropriate output, rating, availability, team context và league strength.
- Không alias Best XI.
- Snapshot phải có ranking tổng thể, không chỉ winner.

#### Team trophies

- Resolve từ server-owned season outcomes.
- Mỗi league/cup/continental/national winner là một CareerHonour.
- Không tạo ranking snapshot nếu không có ranking gameplay.

#### Ballon d'Or

- Candidate universe và ranking snapshot được tạo trong career-season riêng.
- Evaluation phải dùng relative candidate context, role output, availability, team success, league/club strength, hidden-stat policy và awards hợp lệ.
- Không cần load dữ liệu từ career khác.
- Nomination/rank wheel vẫn giữ drama gameplay, nhưng weights phải sinh từ candidate universe và evidence.
- Khi player không được nominate, snapshot vẫn có thể tồn tại để UI hiển thị top list; không tạo winner honour.
- Khi rank wheel resolve, snapshot được cập nhật resolved, player được đặt vào rank tương ứng và CareerHonour được upsert nếu rank 1..10.
- Luck không được âm thầm trở thành merit; phải chọn rõ nó tác động vào candidate noise/weight hay wheel resolution.

### 4.5 Randomness, tie và replay

- Không deterministic tie-break.
- Equal-score group dùng weighted random resolution, một winner duy nhất.
- Random draw, weights, model version và final result phải được lưu ở snapshot/resolution metadata.
- Retry cùng command/idempotency key trả đúng snapshot cũ.
- Không re-run simulator để dựng lại archive sau refresh.
- Không expose seed/hidden metadata nếu nó phá trải nghiệm hoặc tiết lộ hidden stats; chỉ lưu server-side audit fields.

## 5. Backend workflow và transaction

### 5.1 Season stats commit

Refactor commitSeasonStatsCommand:

1. Validate ownership, season, current step và revision như hiện tại.
2. Tính player season stats bằng server-owned state.
3. Gọi award simulator một lần với competition outcomes đã commit trong runtime.
4. Persist CareerSeason.runtimeState có awardSimulationVersion/snapshot references.
5. Upsert ranking snapshots trong cùng transaction, bounded và không gọi external service.
6. Chuyển currentStep như hiện tại:
   - eligible Ballon d'Or → nomination;
   - không eligible → growth.
7. Command replay trả nguyên kết quả cũ.

Award computation phải bounded để transaction không giữ lock lâu. Candidate generation không được gọi network/Prisma query per candidate trong transaction.

### 5.2 Ballon d'Or wheel checkpoint

Trong resolveWheelCheckpointCommand:

- Server xác nhận step hiện tại.
- Nomination dùng weight đã commit từ snapshot/evaluation.
- Ranking dùng weights đã commit; không nhận weights từ client.
- Sau ranking:
  - cập nhật snapshot status/result;
  - upsert CareerHonour cho nominee/winner;
  - ghi CareerEvent;
  - giữ idempotency của checkpoint.
- Nếu retry, trả checkpoint/snapshot/honour cũ, không tạo duplicate.

### 5.3 Season close

Refactor advanceCareerSeasonCommand:

1. Đọc award simulation/snapshot theo seasonId.
2. Upsert team trophies và individual honours chưa commit.
3. Promote award summary/evidence vào public season projection nếu cần.
4. Ghi completed seasonHistory với seasonId và award summary tối thiểu.
5. Recompute CareerPlayer.achievements từ canonical CareerHonour.
6. Recompute influence score từ derived summary/canonical query.
7. Commit tất cả trong cùng transaction với season status.
8. Không nhận awards từ client payload.

Nếu season bị bỏ dở giữa chừng, snapshot vẫn có thể generated, nhưng honour earned chỉ được finalize khi season close hoặc event resolution đã đủ điều kiện.

### 5.4 Legacy compatibility và backfill

- Legacy actions không được ghi trực tiếp achievements/award JSON từ client.
- Legacy career đang chạy phải đi qua compatibility adapter:
  - server đọc state/season history;
  - server resolve/backfill canonical records;
  - client payload chỉ là context không đáng tin, không phải award authority.
- saveCareerPlayer và updateSeasonProgressAction phải reject forged award fields hoặc bỏ qua chúng và derive lại.
- Backfill team trophies và Ballon rank nếu có evidence rõ.
- Legacy individual label kiểu “chiếc giày vàng CLB” không tự động đổi thành league Golden Boot.
- Không fabricate ranking snapshot cho lịch sử cũ nếu candidate list không tồn tại; đánh dấu legacy_backfill, scope = unknown hoặc chỉ tạo honour milestone phù hợp.
- Backfill key phải idempotent theo career + season + source + original identity.

### 5.5 Read model/API contract

Tạo server-owned read model:

~~~text
CareerHonoursView {
  seasonId;
  seasonLabel;
  teamHonours;
  individualHonours;
  ballonDor;
  rankings: AwardRankingView[];
}
~~~

Read model phải:

- lấy từ CareerHonour + CareerAwardRankingSnapshot;
- map label/locale ở read layer;
- không đọc record.achievements.ballonDor để đếm theo mùa;
- trả trạng thái loading/empty/ambiguous/legacy;
- phân biệt ranking snapshot đang generated với resolved;
- giới hạn entries trả về theo UI nhu cầu.

## 6. Frontend implementation

### 6.1 State ownership

- Server/query state: honours, ranking snapshots, award evidence, Ballon result.
- Zustand/local state: modal open, selected award, animation phase, pending navigation.
- Không giữ canonical achievements trong React state.
- Current season trước khi server commit có thể hiển thị pending; sau commit phải rehydrate từ server.

### 6.2 UI surfaces

Cập nhật các surface hiện có:

- SeasonStatsModal: hiển thị award snapshot/evidence và link xem ranking.
- SeasonRecapModal: hiển thị team trophies, individual honours, Ballon rank và competition scope.
- TrophyCabinetModal: đọc shared selector/read model, có nhóm team/individual/Ballon.
- PlayerCareerDialog: hiển thị honour history, nominations/ranks, season/scope/club.
- StoryRail: count từ canonical read model, không derive từ cumulative object trong season record.
- Ballon d'Or result page: hiển thị rank, top list, player highlight, score/evidence phù hợp gameplay.
- Tạo reusable AwardRankingList/AwardRankingPanel cho Golden Boot, Top Assist, Best XI, Best Player và Ballon d'Or.

Ranking UI cần có:

- current player highlight;
- rank, candidate name, club, position, key metrics;
- scope/season/model label khi phù hợp;
- loading, empty, error, legacy/ambiguous state;
- mobile responsive;
- semantic list/table và keyboard-accessible controls;
- không render secret seed/hidden stats không dành cho player.

### 6.3 Navigation/retry

- Sau Ballon rank, route result đọc snapshot từ server, không chỉ đọc runtimeState.lastWheel.
- Browser refresh ở result page vẫn thấy đúng ranking.
- Back/forward không tạo lại candidate list.
- Retry mutation không nhân đôi honour hoặc snapshot.
- Nếu ranking query lỗi, UI có nút retry và không khóa toàn bộ career flow.

## 7. Migration/backfill verification

### Pre-migration inspection

- Count CareerPlayer/CareerSeason/achievements/seasonHistory hiện có.
- Phân loại legacy labels: verified scope, ambiguous, unsupported.
- Kiểm tra duplicate trophy/award/ballon counters.
- Xuất report trước migration, không sửa dữ liệu ngay.

### Backfill rules

- Team winners: backfill khi season result rõ.
- Ballon rank: backfill từ ballonDorResult.
- Individual award:
  - chỉ canonicalize khi scope/evidence đủ;
  - label cũ không đủ bằng chứng → legacy_backfill + unknown/milestone.
- Ranking snapshots lịch sử: không fabricate; chỉ có từ seasons được simulator mới tạo hoặc dữ liệu cũ đã có candidate evidence.

### Post-migration checks

- Không có orphan CareerHonour.
- Không duplicate theo awardInstanceKey/snapshotKey.
- Canonical counts reconcile với verified legacy data.
- Ambiguous count được report riêng.
- achievements derived cache khớp canonical records.
- Career resume/retire không mất award.

## 8. Test plan — bắt buộc trước khi bàn giao manual test

### 8.1 Unit/domain

Test pure simulator với injected random source:

- Golden Boot chỉ đọc league goals.
- Top Assist chỉ đọc league assists.
- Cup/continental/national goals không làm thay đổi league award.
- Clean sheet awards không đọc totalCS aggregate.
- Position không hard gate Golden Boot.
- Best XI tạo đúng slot/formation count.
- Best Player độc lập với Best XI.
- Candidate universe thuộc career-season hiện tại, không có cross-career dependency.
- Candidate metrics và model version luôn tồn tại.
- Equal score dùng random resolution, một winner duy nhất, không deterministic tie-break.
- Same persisted resolution không re-roll.
- Ballon weights thay đổi theo candidate field/context, không chỉ score đơn của player.
- Availability policy tách club và national-team context.
- Hidden luck chỉ tác động đúng layer đã chốt.

### 8.2 Contract/schema

- Zod/shared type cho award key, scope, category, rank, slot.
- Reject invalid rank/scope/slot combination.
- Reject client-supplied award result/score/candidate list.
- DTO backward-compatible với career chưa có snapshots.
- Read model map đúng generated/resolved/legacy/ambiguous.

### 8.3 Database/migration

Dùng isolated real database:

- migration từ schema hiện tại;
- unique constraints;
- FK/cascade;
- JSON shape validation ở service;
- backfill dirty legacy fixture;
- rerun backfill không duplicate;
- old rows thiếu evidence không bị fabricate;
- canonical cache recompute;
- migration/apply/status trên database đại diện.

### 8.4 Backend integration

- commitSeasonStatsCommand tạo stats + ranking snapshot atomically.
- resolveWheelCheckpointCommand Ballon nomination/rank ghi snapshot/honour đúng.
- advanceCareerSeasonCommand finalize all honours cùng season close.
- refresh giữa mọi checkpoint.
- retry cùng idempotency key.
- retry cùng key nhưng khác input → reject.
- concurrent duplicate checkpoint/season close.
- season transition không tạo duplicate honour.
- V2 không nhận client achievements.
- legacy forged payload bị reject/derive lại.
- completed season không mất events/evidence.
- no award record orphan khi transaction rollback.

### 8.5 Frontend/component

- ranking list render đúng top N và highlight player;
- Best XI render slot;
- no nomination vẫn hiển thị ranking snapshot nếu có;
- empty/error/loading/retry;
- stale query không overwrite season mới;
- double click/rapid navigation không duplicate action;
- mobile layout và keyboard semantics;
- archive surfaces cùng tổng số;
- old career không có snapshot vẫn render legacy state rõ ràng.

### 8.6 Browser/system E2E

Tối thiểu các flow:

1. Career V2:
   - season stats → individual ranking → Ballon nomination no → growth → close;
   - nomination yes → rank #1;
   - nomination yes → rank #5/#10;
   - refresh sau stats commit, sau nomination, sau rank, sau season close;
   - retire/reopen archive.
2. Award scope:
   - fixture league goals thấp hơn tổng goals nhưng không nhận Golden Boot vì cup/ĐTQG;
   - top assist list chỉ hiện league assists.
3. Ranking gameplay:
   - UI hiển thị candidate list, current player, rank/evidence;
   - Ballon result page refresh vẫn giữ snapshot.
4. Failure/recovery:
   - server error/retry;
   - stale revision;
   - duplicate submission;
   - empty/legacy snapshot.
5. Browser checks:
   - no console errors;
   - no hydration mismatch;
   - no stuck loading/disabled controls;
   - desktop/mobile.

## 9. Thứ tự thực hiện trong một implementation batch

Đây là thứ tự code trong cùng một batch, không phải staged product release:

- [ ] Cập nhật shared types/Zod contracts.
- [ ] Thêm Prisma models/migration/indexes.
- [ ] Viết award config/model version.
- [ ] Tách season stats khỏi award resolver.
- [ ] Viết candidate generator và award-specific resolvers.
- [ ] Viết ranking snapshot/honour persistence service.
- [ ] Tích hợp season stats commit, Ballon checkpoint và season close.
- [ ] Chuyển legacy path sang server-derived adapter/reject forged payload.
- [ ] Viết backfill script + validation/report.
- [ ] Tạo canonical read model/query hooks.
- [ ] Cập nhật toàn bộ UI surfaces/ranking components.
- [ ] Cập nhật influence/retirement/archive consumers.
- [ ] Thêm unit/contract/integration/database/concurrency tests.
- [ ] Thêm browser/system flow tests.
- [ ] Cập nhật SoT, outdated plan banner và migration notes.
- [ ] Chạy full verification gate.

## 10. Verification gate trước khi trả kết quả

Không coi implementation hoàn tất nếu thiếu một trong các nhóm sau:

1. Typecheck/build/lint pass.
2. Unit award simulator pass.
3. Real database migration + backfill pass.
4. Backend integration/idempotency/concurrency pass.
5. Read model reconciliation pass.
6. FE component/interaction pass.
7. Browser E2E critical flows pass.
8. No console/runtime/hydration error.
9. Manual-test checklist đã sẵn sàng cho owner.
10. SoT cập nhật lại commit, model versions, migration result và known drift còn lại.

Manual test của owner sẽ tập trung vào cảm giác gameplay, narrative, tính thu hút của ranking list và realism cảm nhận. System test của implementation sẽ chịu trách nhiệm cho tính đúng của FE–BE–DB, authority, persistence, retry, refresh, migration và regression.

## 11. File map dự kiến

~~~text
docs/achievements-honours/
├── achievements-honours-sot.md
└── achievements-honours-implementation-plan.md

features/season/
├── contracts/award.contract.ts
└── services/
    ├── award-simulator.service.ts
    ├── award-config.service.ts
    └── ballon-dor.service.ts

features/career/
├── contracts/award.contract.ts
└── services/
    ├── award-persistence.service.ts
    ├── award-read-model.service.ts
    └── legacy-award-adapter.service.ts

types/
└── awards.ts

prisma/
├── schema.prisma
└── migrations/<timestamp>_add_career_awards/

scripts/
├── backfill-career-honours.ts
├── award-simulator-check.ts
├── award-persistence-integration-check.ts
└── award-system-check.ts

components/shared/
└── AwardRankingList.tsx

features/wheel/components/
├── SeasonAwardsPanel.tsx
└── BallonDorRankingPanel.tsx
~~~

Tên file có thể điều chỉnh theo convention thực tế, nhưng ownership và boundary không được nhập nhằng.

## 12. Rủi ro và cách kiểm soát

| Rủi ro | Kiểm soát bắt buộc |
|---|---|
| Migration tạo duplicate/constraint fail | preflight report, backfill batch, unique key, rerun test |
| Simulator quá random/thiếu realism | model version, candidate fixtures, distribution calibration |
| Ranking list không khớp winner | snapshot là output canonical, không recompute ở UI |
| Retry tạo duplicate | command/checkpoint idempotency + DB unique |
| Legacy client forge award | reject/derive server-side |
| V2 mất award khi refresh | snapshot/honour write trong server transaction |
| UI count lệch | shared read model + reconciliation test |
| Hidden luck làm sai realism | tách merit khỏi resolution/noise theo policy |
| Candidate list phình không kiểm soát | bounded entries, top-N policy, snapshot size test |
| Backfill gán sai Golden Boot | chỉ canonicalize khi scope evidence rõ; còn lại ambiguous |

## 13. Definition of Done

- [ ] Mọi award canonical có scope, model version, evidence và source.
- [ ] Mọi award có ranking đều có snapshot UI-readable.
- [ ] Golden Boot/Top Assist đúng league scope.
- [ ] Best XI slot-based; Best Player độc lập.
- [ ] Ballon d'Or candidate list do simulator tạo trong career-season.
- [ ] Không còn hardcoded award winner threshold trong season simulator.
- [ ] Không còn client-authoritative award persistence.
- [ ] V2/legacy/backfill cùng converges về CareerHonour.
- [ ] Refresh/retry/resume/retire không mất hoặc duplicate.
- [ ] FE–BE–DB system test pass.
- [ ] Owner nhận manual test checklist và kết quả automated verification.

