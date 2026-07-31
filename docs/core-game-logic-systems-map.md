# Full Game Logic Systems Map — Interconnection Audit

> **Status:** Bản đồ rà soát toàn bộ game logic (2026-07-30).  
> **Nguyên tắc đọc:** Trong Football Life / Road to Glory, **gần như không có hệ thống
> “chỉ hiển thị”**. Mọi wheel outcome, mọi số BE sim, mọi UI season stats đều nằm trên
> một đồ thị nhân quả kín và nuôi OVR / narrative / squad rating.  
> **Không code trong file này** — audit + map để implement theo
> [`core-growth-balance.md`](./core-growth-balance.md) và
> [`core-growth-logic-review.md`](./core-growth-logic-review.md).
>
> Liên quan:
> - Balance / peak 99 / G/A / P11 player-cup: **core-growth-balance.md** (SoT số liệu)
> - Vị trí / OVR formula / physique: **core-growth-logic-review.md**
> - Mô tả cũ (có thể lệch code): **game-design.md**

---

## 0. Kết luận điều hành

1. **Mọi subsystem đều nối vào core loop** (OVR ↔ môi trường ↔ performance ↔ growth ↔
   OVR). Không có “feature trang trí” độc lập trong career year.
2. **Hai lớp nợ kỹ thuật chồng nhau:**
   - **Correctness** (số sai / thứ tự sai / input chết) → làm bẩn mọi tầng phía sau.
   - **Balance** (growth quá béo, thiếu soft-cap) → biến dirty input thành peak 99 gần chắc.
3. **Tune từng mảnh riêng sẽ fail.** Phải theo thứ tự: sửa volume G/A → player kéo
   cup/ĐTQG → đo rating → siết growth/soft-cap/decline.
4. **Position** là trục cắt ngang hầu hết công thức (debut, OVR, G/A, CS, rating term,
   selector, age curve) — trừ standing pull (dùng OVR tuyệt đối).

---

## 1. Bản đồ vòng đời (macro)

```text
┌────────────────────────── SETUP (một lần / career) ──────────────────────────┐
│ Nation → DebutAge → [Height/Weight*] → 6 core stats → CareerLength           │
│ → League → Club  →  debutOvr = f(stats, position)                             │
│ * height hiện hardcode / review H; weight chưa có cột DB                     │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    ▼
┌────────────────────────── YEAR LOOP (lặp) ───────────────────────────────────┐
│ idle                                                                         │
│   → standing (player↔club)                                                   │
│   → domestic_cup (hiện: prestige+luck only)                                  │
│   → continental_cup? (hiện: prestige+luck)                                   │
│   → national_callup? → national_tournament?                                  │
│   → BE simulatePlayerSeason (apps, G/A, CS, matchRating, ballon eligibility) │
│   → [ballon nomination/ranking?]                                             │
│   → growth: dir_inc → [dir_dec] → count → (selector→magnitude)×N             │
│   → evolvePlayerStatsAction → nextStats/nextOvr                              │
│   → transfer offer? → accept/reject                                          │
│   → next season OR retire                                                    │
│   → continental qualification sync (club vs stint)                           │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    ▼
┌────────────────────────── RETIRE / SQUAD ────────────────────────────────────┐
│ peakOvr từ statsTimeline → rarity card → GameSession squadRating             │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Không có nhánh “chỉ UI”:** Season Profile, Panini deltas, Ballon modal, transfer card,
retired peak — đều đọc state đã được wheel/sim ghi.

---

## 2. Ma trận phụ thuộc (ai nuôi ai)

| Từ \ Đến | Apps | G/A/CS | MatchRating | Growth | Standing | Cups | Call-up | Transfer | Next OVR | Peak/Squad |
|---|---|---|---|---|---|---|---|---|---|---|
| **OVR** | ●● | ● (ST/CS) | ● | | ●● | ○ (thiếu) | ●● | ● | | |
| **Club prestige** | ●● | ● CS | ○ | | ●● baseline | ●● | | ● filter | | |
| **Standing result** | ● bonus | | ● bonus | | quán tính năm sau | vé châu lục năm sau | proxy form* | | | |
| **Cup/Cont/Nat outcomes** | ●● matches | ● volume | ● weight | | | | | | | trophies/Ballon |
| **Apps** | | ●● | ○ (qua G/A) | ○ influence* | | | | | | |
| **G/A/CS** | | | ●● | | | | | ○ | | awards |
| **MatchRating** | | | | ●●● | | | ○ chết* | ● | | Ballon |
| **Growth wheels** | | | | | | | | | ●●● | |
| **Age/progress** | | | | ● gate | | | | | | |
| **Position** | | ●●● | ●● | ● selector | | | | ○ | ● OVR formula | |

●●● = driver chính · ●● = mạnh · ● = có · ○ = yếu/thiếu/bug  
\* = thiết kế có nhưng runtime lệch (xem §4)

---

## 3. Chi tiết từng subsystem

### 3.1 Setup — tạo nhân vật

| Bước | Input | Output | Core? |
|---|---|---|---|
| Nation | pool | nationality → league bias, national tier, ĐTQG cup type | Core |
| Debut age | `DEBUT_AGE_POOL` 15–21 | tuổi; **không** chỉnh dải stat (độc lập — review G.2) | Core |
| Height/weight | review H; code: height 175 hardcode debut, random lúc retire | physique → debut stats (chưa ship) | Core khi có |
| 6 stats | `getDebutStatWeights(position)` | core stats | Core |
| Career length | `CAREER_LENGTH_POOL` ~12–20 | số mùa; progress young/old | Core |
| League/Club | weights nationality + prestige | môi trường `clubThreshold` cả career stint | Core |
| Debut OVR | `calculateOvrByPosition` | **không** random từ `DEBUT_OVR_POOL` (dead fallback) | Core |

**Nối về sau:** debut OVR cao → dễ overqualify mid-club → apps/standing/growth snowball.

### 3.2 Standing — player ↔ club

- Baseline prestige + quán tính 30% + pull `ovr − (55+prestige×6)` × `influenceFactor`.
- **Đánh giá:** model đúng real-world (đã xác nhận với product).
- **Bug runtime:** `apps` mùa này chưa có → fallback 38 → `influenceFactor≈0.69` cố định.
- **Output core:** `standingResult` → apps bonus, league rating bonus, continental ticket năm sau, Ballon trophy score, table generation.

### 3.3 Domestic / Continental cup

- Weights hiện: prestige + luck — **thiếu player term** (P11 / balance §7.5).
- Outcome → số trận cup/continental → apps → G/A → rating → growth + trophies.
- **Không phải cosmetic:** deep run đổi cả mùa cá nhân.

### 3.4 National call-up / tournament

- Call-up: OVR vs tier mid — OK; nhánh `matchRating` **chết** (sim chưa chạy).
- Tournament: OVR + luck mỏng — cần thống nhất P11.
- Outcome → national apps/G/A/rating + trophies + Ballon.

### 3.5 BE season sim

- Apps: OVR vs `clubThreshold`, prestige depth, standing bonus.
- G/A: **bug volume** — season-range × `playFactor` per competition (balance §2.6 / 7.0).
- Rating: OVR term + G/A|CS per app × hệ số lớn + standing.
- Ballon eligibility: OVR, rating, G, trophies, position modifier.
- **Mọi output đều core** — UI chỉ mirror.

### 3.6 Growth wheels

- Tier từ `matchRating` → gate / count / magnitude (pools đang béo 3–5 / mag cao).
- Selector position main-stat.
- Age/progress + growth boost young.
- `evolvePlayerStats` clamp 10–99, OVR derive BE.
- **Driver chính của peak 99** khi rating dễ Tốt/Xuất sắc.

### 3.7 Transfer

- Chance từ rating + OVR vs expected prestige CLB hiện tại.
- Accept → `setClubAndContinental` (invariant cup theo CLB).
- Đổi môi trường → đổi threshold/apps/standing pull mùa sau — **core**.
- **Nâng cấp đang bàn:** market browse + **soft contract + fee/wage** clamp theo
  buying power (prestige × league tier) — [`core-transfer-design.md`](./core-transfer-design.md)
  (chưa SoT số cuối / chưa code). Wage/fee **không** buff OVR/apps.

### 3.8 Continental qualification / next season

- Vé từ standing (+ winner continental pathway).
- Bẫy đã document: accept transfer rồi next season không được ghi đè cup bằng qualification stint cũ.
- Affects continental wheel + apps năm sau — **core**.

### 3.9 Persist / retire / squad

- Season records + statsTimeline → peakOvr → rarity → squadRating.
- “Chỉ hiển thị” ở sticker/chart nhưng **metric meta-game** (squad) phụ thuộc peak — vẫn core product.

---

## 4. Lỗi thứ tự & input chết (correctness)

| # | Vấn đề | Hệ quả |
|---|---|---|
| O1 | Standing trước apps; `influenceFactor` fallback 38 | Van bench không hoạt động |
| O2 | Call-up trước season sim; `yearSimResult.matchRating` null | Form boost call-up chết |
| O3 | G/A cup/cont/nat = season totals × playFactor | UI + rating + growth bẩn |
| O4 | ST `(ovr-60)×0.12` cộng mỗi competition | Double/triple count bàn |
| O5 | `calcAttackStats(..., apps)` không dùng `apps` | Volume không scale đúng |
| O6 | Domestic/continental bỏ OVR player | Team run lệch; cascade stats lệch |
| O7 | Height hardcode / re-roll retire | Identity sai (review H) |
| O8 | Preview vs resolve tên giải ĐTQG lệch công thức | `useCareerWheelItems`: `currentAge % 4 === 0` → WC; resolver + `useCompetitionFlow`: `currentYear % 4 === 2` (`2026 + age − debutAge`). Wheel đang quay có thể hiện sai tên so với trophy/journey sau resolve |
| O9 | `startPlayerCareerSchema.debutOvr` không bound / không recompute từ stats phía server | Client có thể gửi OVR lệch stats (partial integrity); `initCareerPlayer` có bound 1–99 |
| O10 | Growth selector khi **decrease** không loại stat đã = 10 | Có thể “tốn” slot giảm no-op (clamp) |
| O11 | Preview cup hardcode `luck=10` (`+2` weight) trong `useCareerWheelItems`; resolve dùng `hiddenStats.luckRating` thật | Preview pool ≠ resolve pool khi luck ≠ 10 — vi phạm invariant “preview phải khớp resolve” |
| O12 | Toàn bộ wheel outcomes (setup + career) resolve **trên client**; server tin outcomes khi sim/save | UX spin OK nhưng truth có thể bị fake; server không re-roll / không verify pool |

---

## 4b. Client vs Server — integrity **và** response time / scale

Hai mục tiêu **không được đánh đổi mù**:

1. **Integrity** — game truth không bị client tự bịa (OVR, outcomes, peak).  
2. **Latency & cost ở traffic cao** — một career year có ~10–20+ bước spin + sim.
   Nếu mỗi bước = 1 Server Action + DB → UX chậm, Vercel/DB/rate-limit nổ, chi phí
   tuyến tính theo số spin × user đồng thời.

**Cấm hiểu nhầm:** “đẩy hết lên server” ≠ gọi API/DB từng cú quay bánh xe.

### Budget thời gian / I/O (SoT vận hành)

Ước lượng một mùa giải (happy path, có continental + ĐTQG + growth count≈2):

| Bước | Số lần (order) | Có được round-trip server/DB mỗi lần? |
|---|---|---|
| Standing, cups, call-up, tournament, Ballon, growth×N | ~8–15 spins | **Không** — phải local / seeded |
| `simulatePlayerSeason` | 1 | **Có** — 1 action, pure compute (+ có thể 0 query nếu prestige/leagueSize đã có trong session) |
| League table + cup journeys | 1–4 | **Có nhưng cache nặng** opponents/clubs (đã có hướng `getCached*`) |
| `evolvePlayerStats` | 1 | **Có** — 1 action, pure (không DB) |
| Transfer offer | 0–1 | **Có** — 1 action; query clubs **scoped + cached** |
| Persist progress | 1 (cuối mùa / debounce) | **Có** — batched write, không save từng spin |

**Mục tiêu UX:** spin cảm giác tức thì (<16ms logic local). Round-trip chỉ ở **checkpoint**
(sau cụm competition → sim; sau cụm growth → evolve; cuối mùa → save).

**Anti-pattern (không làm khi scale):**

```text
❌ spin standing → Server Action → DB
❌ spin cup → Server Action → DB
❌ mỗi magnitude → evolvePlayerStatsAction → …
→ 15 × (RTT + cold start + auth) / mùa / user
```

### Mô hình đích (ba tầng)

```text
┌─────────────────────────────────────────────────────────────────┐
│ T1 — Pure shared lib (client + server import cùng code)         │
│   weight pools, standing/cup/growth math, OVR formula,          │
│   continental qualification, G/A rates (sau 7.0)                │
│   → zero network; preview === resolve nếu cùng input            │
├─────────────────────────────────────────────────────────────────┤
│ T2 — Client orchestration + animation                           │
│   resolve từ (serverSeed | localRng) + T1 pools                 │
│   giữ year state trong memory; KHÔNG hit DB mỗi spin            │
├─────────────────────────────────────────────────────────────────┤
│ T3 — Server checkpoints (ít, có auth + Zod + optional DB)       │
│   start career | simulateSeason | evolveStats | transfer |      │
│   saveProgress | retire                                         │
│   → recompute/verify những field critical; cache reference data │
└─────────────────────────────────────────────────────────────────┘
```

### Integrity mà không spam API — lựa chọn SoT

| Phương án | Mô tả | Latency | Integrity | Khuyến nghị |
|---|---|---|---|---|
| **A. Seeded season (ưu tiên)** | Đầu mùa (hoặc sau idle): 1 action cấp `seasonSeed` (hoặc derive từ server). Mọi spin trong mùa = hash/stream từ seed + subStep index qua `resolveWeightedOutcome` deterministic. Cuối cụm: 1 `commitSeasonPhase` gửi outcomes; server **re-simulate rolls từ cùng seed** để verify, rồi chạy sim/evolve. | Tốt | Cao | **SoT mặc định khi harden** |
| **B. Trust-but-recompute** | Client quay như hiện tại; checkpoint server **bỏ qua** việc tin OVR/peak/deltas — luôn `calculateOvrByPosition` / clamp / derive peak từ timeline. Outcomes wheel vẫn tin trong biên Zod (anti-cheat nhẹ). | Tốt (ít đổi) | Trung bình | **Pass gần**: debutOVR, peak, evolve |
| **C. Per-spin Server Action** | Mỗi bánh xe gọi server | Rất xấu ở scale | Cao | **Cấm** làm mặc định |

Không chọn C trừ cheat-critical niche (vd gambling) — game này không cần.

### Hiện trạng vs đích

| Hạng mục | Hiện tại | Đích (integrity × scale) |
|---|---|---|
| Debut OVR | Client tính, server tin (O9) | **B:** server recompute từ stats trong `startPlayerCareerAction` — 0 thêm RTT |
| Wheel outcomes | Client RNG, server tin (O12) | **A** dài hạn; ngắn hạn giữ client + sửa preview sync |
| Growth deltas | Client gửi, server clamp+OVR | **B** đủ cho pass 1; **A** khi seed |
| Season sim | 1× Server Action | Giữ 1×; giảm query — truyền `clubPrestige`/`leagueSize` đã trust từ session hoặc cache |
| Table / journey | N actions + DB opponents | Giữ; **cache** opponent lists theo league/cupType (TTL dài — data tĩnh) |
| Transfer | 1× + DB filter prestige | Giữ; cache club-by-prestige buckets |
| peakOvr retire | Client max() | **B:** server derive từ timeline lúc save — 0 query thêm |
| Continental next | Client tính rồi persist | Pure fn trong T1; server re-run lúc save (**B**) |
| Persist | Background save | Giữ debounce/queue; **không** save per spin |

### Desync preview ↔ resolve (cùng client — sửa không cần server)

| Chỗ | Lệch | Fix (local, 0 RTT) |
|---|---|---|
| Cup weights | Preview hardcode luck=10; resolve dùng luck thật (O11) | Preview đọc `hiddenStats.luckRating` giống resolver |
| Tên WC | O8 hai công thức `% 4` | Một helper `getNationalTournamentName(year)` dùng chung |
| Standing / call-up form | Dead `yearSimResult` (O1/O2) | Proxy apps/form trước sim — vẫn T1 local |

### Đã đúng phía server (giữ — nhưng tối ưu cache)

| Hạng mục | Ghi chú scale |
|---|---|
| Season G/A/CS/rating/Ballon eligibility | Pure service — tránh Prisma thừa trong action |
| League table / cup journey | Cache opponents; đừng `findMany` full table mỗi spin |
| Transfer club pick | Prestige range query + cache |
| Name + hiddenStats lúc start | 1× lúc start — OK |
| Auth / rate limit | Giữ; seeded design giảm số action → bớt đụng rate limit |

### OK giữ client (bắt buộc cho UX + scale)

| Hạng mục | Lý do |
|---|---|
| Spinner animation, labels, modals | Pure UI |
| Pool preview (`useCareerWheelItems`) | Phải = T1; zero network |
| Resolve spin trong năm (trước khi có seed verify) | Tránh RTT; sau này gắn seed |
| Flow hooks orchestration | Không chứa truth cuối |
| `setClubAndContinental` local | Sync UX; persist ở checkpoint |

### Ưu tiên implement (có ý thức traffic)

**Pass 0 — rẻ, 0 thêm RTT**

1. Preview cup dùng luck thật; thống nhất tên WC (O8/O11).  
2. Server recompute `debutOvr` + bound; retire derive `peakOvr` từ timeline.  

**Pass 1 — correctness sim/balance** (theo balance SoT; ít đổi số round-trip)

3. Fix G/A 7.0, P11, growth soft-cap — chủ yếu đổi pure lib + 1 sim action hiện có.  

**Pass 2 — harden integrity khi user/traffic lớn**

4. `seasonSeed` + verify-at-checkpoint (phương án A) — **không** per-spin API.  
5. Cache reference data (clubs/leagues/opponents) + giảm query trong journey/transfer.  
6. Giữ persist batched; theo dõi p95 Server Action duration & Upstash rate-limit hits.

### Checklist khi thêm Server Action mới

- [ ] Có thể làm bằng pure lib + checkpoint hiện có không?  
- [ ] Có bị gọi trong vòng lặp spin không? → **cấm** trừ khi đã batch.  
- [ ] Reference data đã cache chưa?  
- [ ] Auth + Zod + rate limit có, nhưng không thay cho thiết kế giảm số lần gọi.  

---

## 5. Lỗi cân bằng (balance) — nuôi bởi correctness

| # | Vấn đề | Hệ quả |
|---|---|---|
| B1 | Count weight dồn 3–5; magnitude mean cao / domain 1–8 | PRIME ồ ạt |
| B2 | Không soft-cap theo OVR | 94 vẫn grow như 74 |
| B3 | Decline yếu; giảm chỉ sau tăng=no | Không có dốc cuối career |
| B4 | Rating gaFactor ×2.5 quá hào phóng | Tier Xuất sắc quá dễ |
| B5 | Overqualify mid-club → apps cao + standing kéo lên | Tuyết lăn tới 99 |
| B6 | P11 (player kéo cup) nếu ship trước 7.0 | Cộng hưởng inflation |

Chi tiết số & target phân phối: **core-growth-balance.md**.

---

## 6. Đồ thị nhân quả một mùa (đầy đủ)

```text
                    ┌── nationality / luck / position ──┐
                    ▼                                   ▼
 currentOvr ──► standing pool ──► standingResult ──► appsRatio (+threshold,prestige)
      │                ▲                                    │
      │                └── lastYearStanding                 ▼
      ├──────────────────────────────────────────► matches from cup/cont/nat wheels
      │                ▲                                    │
      │                │ (P11 missing on club cups)           ▼
      ├───────────► cup weights (prestige+luck only) → outcomes
      │                                                     ▼
      │                                            apps_c, playFactor
      │                                                     ▼
      ├─────────── ovr bonus / CS ──────────────► G/A/CS_c  [BUG scale]
      │                                                     ▼
      └─────────── base rating term ────────────► matchRating (weighted)
                                                        │
                          ┌─────────────────────────────┼─────────────────┐
                          ▼                             ▼                 ▼
                     growth tier                   ballon elig.      transfer chance
                          ▼                             ▼                 ▼
                   Δstats → nextOvr              trophies/UI         new club+cup
                          │
                          └──► next year inputs (OVR, club, continental, standing hist)
```

**Đọc đồ thị:** không có lá “UI only”. Mọi mũi tên cuối cùng có thể đụng `nextOvr` hoặc
meta squad.

---

## 7. Thứ tự remediation (bắt buộc)

Aligned với balance SoT:

1. **7.0** — G/A/CS = `apps × rate(position)` + clamp (correctness + tự nerf một phần).  
2. **7.5 / P11** — player term cup/continental/ĐTQG + sửa influence/call-up form.  
3. **Đo** phân phối `matchRating` & peak thô.  
4. **Growth pools** (count/magnitude/gate) + soft-cap OVR + decline.  
5. **Rating coefficients** / overqualify brake tinh chỉnh.  
6. **Setup physique / formation positions** (review) — song song được nếu không đụng số growth.  
7. Cập nhật `game-design.md` cho khớp code + SoT.

---

## 8. File SoT theo subsystem (code)

| Subsystem | Files |
|---|---|
| Debut / OVR formula / pools | `lib/wheel-engine/weight-calculator.ts` |
| Setup flow | `features/wheel/hooks/useSetupStage.ts`, wheel UI store |
| Standing / growth helpers | `features/wheel/lib/simulation-helpers.ts` |
| Resolve pools | `features/wheel/lib/career-wheel-resolver.ts` |
| Preview pools (phải khớp resolve) | `features/wheel/hooks/useCareerWheelItems.ts` |
| Competition orchestration | `features/wheel/hooks/useCompetitionFlow.ts` |
| Growth orchestration | `features/wheel/hooks/useStatEvolutionFlow.ts` |
| Club/continental/next season | `features/wheel/hooks/useCareerStats.ts` |
| Season sim BE | `features/season/services/season-simulator.service.ts` |
| Evolve stats | `features/player/services/stats-evolution.service.ts` |
| Transfer | `features/transfer/services/transfer.service.ts` — design: `docs/core-transfer-design.md` |
| Actions / auth / zod | `actions/season.actions.ts`, `actions/player.actions.ts` |
| Spin RNG only | `lib/wheel-engine/spin-resolver.ts` |

---

## 9. Definition of “xong audit” cho product

- [ ] Mọi wheel team (league/cup/cont/nat) có player influence đúng SoT.  
- [ ] Mọi competition stats UI pass sanity clamp; không còn G/A cup phi lý.  
- [ ] Peak OVR phân phối trong target balance doc.  
- [ ] Không còn input chết (call-up form, influenceFactor apps).  
- [ ] `game-design.md` không mâu thuẫn code trên các điểm trên.  
- [ ] Invariant club↔continental vẫn giữ khi transfer / next season.

---

## 10. Lịch sử

| Ngày | Thay đổi |
|---|---|
| 2026-07-30 | Tạo map audit toàn cục: khẳng định không có logic độc lập mang tính hiển thị; ma trận phụ thuộc; bugs thứ tự; nối sang balance SoT & thứ tự fix. |
| 2026-07-30 | Re-verify code: xác nhận O1–O7; bổ sung O8 (WC name preview≠resolve), O9 (debutOvr trust gap start career), O10 (decrease selector không loại floor 10). Continental sync / setClubAndContinental verified OK. |
| 2026-07-30 | §4b Client vs Server: O11 luck preview hardcode, O12 wheel resolve client-trusted; bảng nên/được/OK giữ client. |
| 2026-07-30 | §4b mở rộng: integrity × latency/scale — cấm per-spin API; mô hình T1/T2/T3; seeded season (A) vs recompute-at-checkpoint (B); budget I/O một mùa; checklist thêm Server Action. |
| 2026-07-30 | **Implement Pass 0 + 7.0:** O8 `getNationalTournamentName` / calendar year helper dùng chung preview+resolve+flow; O11 cup/continental/national weights qua `get*CupWeights` + `luckRating` thật trong preview; O9 server recompute `debutOvr` trong `startPlayerCareerService`; `peakOvr` derive từ `statsTimeline` trên `saveCareerPlayer`; G/A/CS = `apps × rate(position)` + clamp (`lib/season-stat-rates.ts`). P11 / growth soft-cap chưa ship. |
| 2026-07-30 | **Ship P11 + growth SoT:** influence proxy; player term cup/continental/national; call-up form từ standing; gate/count/mag §4; soft-cap §5; decline floor §6; overqualify + OVR-vs-club rating; O10 selector floor-10. |
| 2026-07-30 | SoT §4.4 **Development Score** chốt giấy (chưa code): Yes tăng = cửa sổ tuổi×headroom × form modifier × soft-cap; không training/U; không rollback OP count/mag. Xem `docs/core-growth-balance.md`. |
| 2026-07-30 | **Ship §4.4** Development Score trong `growth-balance.ts` (`getEffectiveIncreaseGate`). |
| 2026-07-30 | **§7.6** player↔club fit / apps recovery / decrease softener khi ít phút — `lib/club-fit.ts` + growth-balance. |
| 2026-07-31 | Link **transfer redesign** discussion: `docs/core-transfer-design.md` (market browse + soft contract feasibility). |
| 2026-07-31 | Transfer design **v1.1:** fee + wage bắt buộc; buying power derive prestige×tier (chống đội yếu chi 100M). |
| 2026-07-31 | Transfer design **v1.3:** lock buying power §5.3. |
