# Design Discussion — Player Wallet, Influence Score & Shop (v1.1 DRAFT)

> **Status:** Bản thiết kế v1.1 — **chưa code**. Một số quyết định đã chốt qua trao đổi
> trực tiếp với product (đánh dấu **LOCKED**), phần còn lại là **DRAFT — chờ confirm**,
> theo đúng tinh thần các SoT khác trong repo (chốt nguyên tắc trước, khoá số sau khi
> playtest).
>
> **Mục tiêu:** Biến `transferFee` + `wageAnnual` (đang chỉ có ý nghĩa hiển thị + tác động
> nhỏ tới quyết định chuyển nhượng) thành **tiền tệ thật sự có vòng đời trong game**:
> player nhận tiền → tích luỹ vào **Wallet** → tiêu ở **Shop** để mua sản phẩm hỗ trợ mùa
> sau. **v1.1 rút gọn so với v1:** không đụng gì tới công thức `marketValue`/`wageAnnual`
> hiện có (Wallet chỉ **đọc lại** số mà hệ thống transfer đã lock tính ra) — thay vào đó
> thêm 1 trục **Influence Score** làm "danh tiếng tích luỹ", kết nối nhẹ vào Scout/Approach
> (không đụng MV/wage), giữ rủi ro implement thấp nhất có thể.
>
> **Không code trong file này** — chỉ quyết định thiết kế để implement sau.
>
> Tài liệu liên quan (đọc trước khi implement):
> - [`core-transfer-design.md`](./core-transfer-design.md) — nguồn `transferFee`,
>   `wageAnnual`, `marketValue`, buying-power band. File này **không sửa** công thức nào ở
>   đó — chỉ thêm 1 top-up nhỏ, có trần, cộng SAU `computeScoutInterestScore`/
>   `computeApproachAcceptChance` (xem §5). Band §5.3, `buyoutFactor`, MV curve giữ nguyên
>   100%.
> - [`core-growth-balance.md`](./core-growth-balance.md) — chứa rule **"cấm training /
>   pay-to-win growth"**. File này **KHÔNG** xoá rule đó — chỉ mở đúng 1 lối đi hẹp, có
>   whitelist tường minh (xem §6.1). Đã thêm dòng tham chiếu chéo ở đầu file đó.
> - [`core-game-logic-systems-map.md`](./core-game-logic-systems-map.md) — mô hình T1/T2/T3
>   (client/server × latency) mà mọi Server Action mới ở đây phải tuân theo (§4b).
> - [`core-ui-ux-design.md`](./core-ui-ux-design.md) — Wallet + Shop cần thêm vào UI SoT ở
>   pass implement (chưa làm trong file này — xem §9).
>
> **Product lock (chốt qua trao đổi 2026-08-07):**
> 1. **Shop được phép tác động gián tiếp có kiểm soát** tới gameplay mùa sau — KHÔNG bao
>    giờ ghi thẳng vào stat/OVR, chỉ được đụng vào các **lever đã tồn tại sẵn** trong hệ
>    thống (reroll trong đúng pool trọng số cũ, giảm severity giảm điểm, tăng expected
>    apps ratio ngắn hạn...). Whitelist đầy đủ ở §6.
> 2. **Wallet = cộng dồn thô** cho pass đầu: `wallet += income − spend`. Không có sink
>    "chi phí sinh hoạt" theo % lương ở pass này (có thể mở sau, xem §10 out-of-scope).
> 3. **Không rework `marketValue`/`wageAnnual`, không có Sponsorship** (bỏ khỏi v1 sau khi
>    review — xem §5). Wallet chạy hoàn toàn trên nền số transfer đã có, band §5.3 CLB
>    không liên quan gì tới Wallet.
> 4. **`transferFee` bị khấu trừ hoa hồng agent trước khi vào Wallet** (mô phỏng thật —
>    xem §4.1); `wageAnnual` vào Wallet nguyên vẹn (chưa chốt có áp agent-cut hay không).
> 5. **Influence Score = 2 thành phần** (`legacyScore` vĩnh viễn + `currentFormIndex` tính
>    lại mỗi mùa, blend theo tiến trình sự nghiệp) thay vì 1 số đơn điệu tăng — xem §3.
>    Không có cơ chế "decay" (xoá điểm) riêng nào; hiệu ứng tương tự đạt được tự nhiên qua
>    việc blend lại mỗi mùa.

---

## 1. Vì sao cần nâng cấp

### 1.1 Pain hiện tại (đã verify qua code thật, không phải suy đoán)

| Hiện trạng | File | Hệ quả |
|---|---|---|
| `computeMarketValue` = `f(currentOvr, age, matchRating **mùa này**, contractYearsRemaining)` | `lib/transfer-economy.ts` | Đá 10 mùa ở đỉnh cao, vô địch Champions League 3 lần, MV vẫn y hệt một player mới đạt OVR đó tuần trước — **không có trục "đã chứng minh qua thời gian"**. |
| `proposeWageAnnual` nội suy tuyến tính trong `[band.minWage, band.maxWage]` theo `getBuyingPowerBand(prestige CLB mua, tier)` | `lib/transfer-economy.ts` | Lương **trần cứng theo CLB mua**, không theo "player này đáng giá bao nhiêu trên thị trường mở" — 2 player OVR như nhau, 1 người vừa thắng Ballon d'Or, 1 người mới đá mùa đầu, nếu cùng chuyển tới 1 CLB thì lương gần như giống nhau. |
| `fee`, `wage` chỉ hiển thị trong `TransferWindowPanel` / `TransferDecisionModal`, ảnh hưởng duy nhất tới quyết định Accept/Reject của **user** | `features/wheel/components/TransferWindowPanel.tsx`, `TransferDecisionModal.tsx` | Toàn bộ số tiền **biến mất** sau khi accept — không có nơi nào giữ lại, không có currency, không có vòng đời kinh tế. |
| Không có trục nào track **trophies / caps / Ballon d'Or / streak phong độ** thành 1 con số duy nhất tái sử dụng được | — | Mỗi hệ thống (Ballon d'Or eligibility, Scout Interest, MV) tự tính lại "player này giỏi cỡ nào" theo cách khác nhau, không có 1 "danh tiếng tích luỹ" chung. |

### 1.2 Mục tiêu sản phẩm

1. **Tiền có vòng đời thật:** `wage` (mỗi mùa) + `transferFee` (khấu trừ hoa hồng agent, xem §4.1) chảy vào **Wallet** của player, Wallet trừ đi khi mua Shop.
2. **Danh tiếng tích luỹ theo sự nghiệp:** thêm 1 trục **Player Influence Score** — `legacyScore` (vĩnh viễn, từ trophies/caps/Ballon d'Or/longevity) blend với `currentFormIndex` (tính mới mỗi mùa) — **tách biệt** khỏi OVR tức thời, cộng thêm 1 top-up nhỏ vào Scout/Approach (§5), **không** feed ngược vào OVR/growth (giữ nguyên invariant `docs/core-growth-balance.md`) và **không** đụng `marketValue`/`wageAnnual`.
3. **Không đụng invariant "CLB yếu không thể chi 100M€"** — buying-power band (§5.3 `core-transfer-design.md`), `marketValue`, `wageAnnual` **giữ nguyên 100%**, Wallet chỉ đọc lại số đã tính, không rework công thức tiền nào.
4. **Shop có thật, có ý nghĩa, không phá cân bằng growth** — whitelist rõ ràng các lever được phép đụng, review chéo với `core-growth-balance.md` để không mở lại "pay-to-win training" mà SoT đó đã cấm.
5. **Server-authoritative tuyệt đối** — giống `hiddenStats` / OVR, Wallet balance và hiệu lực Shop item **không bao giờ** được client tự tính rồi gửi lên; server luôn validate + derive lại.

**Out of scope pass đầu** (ghi rõ để không creep, theo đúng convention các SoT khác):
lifestyle/tax sink, marketplace giữa các player (không có multiplayer), NFT/gacha-style loot box, item pay-with-real-money, ledger CLB (game không mô phỏng tài chính CLB).

---

## 2. Kiến trúc tổng quan

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. INFLUENCE SCORE (mới — §3)                                    │
│    legacyScore (vĩnh viễn, từ achievements/statsTimeline có sẵn) │
│    + currentFormIndex (tính mới mỗi mùa) → blend theo tiến trình │
│    sự nghiệp. KHÔNG lưu input mới — chỉ cache 1 cột output.      │
└───────────────────────────────┬───────────────────────────────────┘
                                 ▼ top-up nhỏ, có trần (không ngược lại)
┌─────────────────────────────────────────────────────────────────┐
│ 2. SCOUT / APPROACH (đã có sẵn — lib/transfer-economy.ts)        │
│    computeScoutInterestScore / computeApproachAcceptChance KHÔNG │
│    đổi logic gốc — chỉ cộng thêm sau cùng 1 bonus nhỏ theo        │
│    Influence (§5). marketValue/wageAnnual KHÔNG đổi gì cả.        │
└───────────────────────────────┬───────────────────────────────────┘
                                 ▼ sinh ra tiền (transfer/wage vốn đã có)
┌─────────────────────────────────────────────────────────────────┐
│ 3. WALLET (mới — §4)                                              │
│    wage mỗi mùa (nguyên vẹn) + transferFee lúc chuyển nhượng      │
│    thật, trừ hoa hồng agent trước khi vào ví — không có nguồn    │
│    thu nhập mới nào ngoài 2 cái này (đã bỏ Sponsorship).          │
└───────────────────────────────┬───────────────────────────────────┘
                                 ▼ tiêu ở
┌─────────────────────────────────────────────────────────────────┐
│ 4. SHOP (mới — §6)                                                │
│    Mua item → áp hiệu ứng LÊN LEVER ĐÃ CÓ SẴN của mùa sau         │
│    (reroll đúng pool cũ / giảm severity / tăng apps ratio ngắn   │
│    hạn) — KHÔNG BAO GIỜ set thẳng stat/OVR.                       │
└─────────────────────────────────────────────────────────────────┘
```

**Nguyên tắc dòng chảy 1 chiều:** Influence → (top-up nhỏ) Scout/Approach; Wage/Fee (vốn
có, không đổi) → Wallet → Shop → (lever mùa sau, KHÔNG quay lại Influence/OVR trực tiếp).
Điều này giữ hệ thống dễ audit — không có vòng lặp dương kín kiểu "wage → buff → OVR →
wage" mà `core-transfer-design.md §2` đã minh thị cấm ("**Invariant balance:** lương cao
không tăng OVR/apps").

---

## 3. Player Influence Score (mới)

### 3.1 Nguyên tắc

- **Không phải OVR, không phải MV** — là "danh tiếng", tách biệt 3 trục đã có:

| Trục | Ý nghĩa | Vòng đời | Nguồn |
|---|---|---|---|
| `currentOvr` / `effectivePositionOvr` | Khả năng **hiện tại** | Lên xuống theo growth mỗi mùa | `career-wheel-resolver.ts`, growth wheels |
| `scoutInterestScore` | **1 CLB cụ thể** đánh giá player mùa này (nhận `clubPrestige`/`clubLeagueCountry` làm input) — gọi **riêng cho từng CLB ứng viên** lúc sinh market | Tính lại **mỗi mùa, mỗi CLB** — không lưu | `computeScoutInterestScore` (`lib/transfer-economy.ts`) |
| **`influenceScore` (mới)** | **Danh tiếng toàn cục, không gắn CLB nào** — "player này nổi tiếng cỡ nào" bất kể ai đang hỏi | Blend `legacyScore` (vĩnh viễn) + `currentFormIndex` (tính mới mỗi mùa) — xem §3.2 | Derive từ `achievements`, `seasonHistory`, `statsTimeline` — **không cần field input mới** |

  `scoutInterestScore` trả lời "CLB X có muốn ký player này không" (contextual, per-club);
  `influenceScore` trả lời "player này nổi tiếng thế nào, kỳ vọng đúng mọi nơi" (global, 1
  số duy nhất/mùa). Hai trục **không thay thế nhau** — `influenceScore` cộng thêm 1 lớp
  top-up nhỏ lên trên kết quả `scoutInterestScore` đã tính riêng cho từng CLB (xem §5),
  không tính lại logic per-club đó.

- **DB:** không lưu input thô mới. `influenceScore` chỉ là **cache Int derive cuối mùa**
  (giống hệt cách `marketValue`/`peakOvr` đã cache) từ dữ liệu **đã có sẵn** trên
  `CareerPlayer` (`achievements Json?`, `seasonHistory Json`, `statsTimeline Json`).
  → **Không cần schema mới cho input**, chỉ thêm 1 cột output.

### 3.2 Công thức — 2 thành phần, blend theo tiến trình sự nghiệp (thay cho "decay")

**Vấn đề với 1 số đơn điệu tăng (bản v1 cũ):** thành tích thật (trophies, Ballon d'Or)
**không nên** bị xoá theo thời gian — đó là lịch sử đã xảy ra. Nhưng "độ nóng hiện tại" (có
đang được nhắc tới, đang chơi đỉnh cao hay không) **thì có** thay đổi liên tục. Gộp 2 ý
nghĩa khác nhau này vào 1 số rồi tìm cách "decay" nó là sai hướng — tách hẳn 2 thành phần,
mỗi thành phần đúng bản chất riêng, rồi blend:

```text
legacyScore (0–100)      = trophyScore + internationalScore + ballonDorScore + longevityScore
                            (công thức y hệt bản v1 cũ — xem bảng dưới) — CHỈ TĂNG, VĨNH VIỄN,
                            đúng bản chất "đã làm được gì thì mãi là sự thật"

currentFormIndex (0–100) = tính LẠI HOÀN TOÀN mỗi mùa (không lưu, không kế thừa mùa trước)
                            từ currentOvr so với peakOvr, matchRating mùa này, club prestige
                            hiện tại — tinh thần giống scoutInterestScore nhưng KHÔNG gắn 1
                            CLB cụ thể nào (đại diện "mức độ nổi bật hiện tại nói chung")

legacyWeight  = 0.3 + 0.5 × careerProgress   // dùng lại getCareerProgress() đã có sẵn trong simulation-helpers.ts
influenceScore = round(legacyWeight × legacyScore + (1 − legacyWeight) × currentFormIndex)
```

| Thành phần `legacyScore` | Nguồn dữ liệu | Gợi ý trọng số |
|---|---|---|
| `trophyScore` (0–35) | đếm `achievements.trophies[]` theo loại: League ×1, Domestic Cup ×0.7, Continental (UCL-tier) ×2.5, Continental (UEL/Sudamericana-tier) ×1.3, World Cup/Continental NT ×3 | diminishing return sau trophy thứ ~6 cùng loại |
| `internationalScore` (0–25) | đếm caps trong `events`/`seasonHistory[].nationalTeam`, cộng thêm nếu có `nationalTournamentResult` tốt (SF/Winner) | cap tối đa 25đ |
| `ballonDorScore` (0–20) | `achievements.ballonDor` — rank 1 mọi năm > rank top-5 > từng được nominate | cộng dồn cả lịch sử |
| `longevityScore` (0–20) | số mùa liên tục trong `statsTimeline` có `ovr ≥ 85` (ngưỡng PRIME, `core-growth-balance.md §1.1`) | reward "giữ đỉnh nhiều mùa" |

**Vì sao blend theo `careerProgress` chứ không phải tuổi tuyệt đối:** người trẻ mới nổi
(`careerProgress` thấp) chưa có gì để `legacyScore` cao → `legacyWeight≈0.3`, điểm chủ yếu
phản ánh `currentFormIndex` (đúng cảm giác "đang lên", không cần thành tích cũ). Người sắp
giải nghệ (`careerProgress` gần 1) → `legacyWeight≈0.8`, di sản chiếm phần lớn, cushioning
cho 1-2 mùa cuối sa sút tự nhiên (đúng cơ chế decline đã tune ở `core-growth-balance.md`)
mà không "quên sạch" họ từng là ai.

**Ví dụ cụ thể:** huyền thoại 35 tuổi, `legacyScore=95` (2× Ballon d'Or, 3× C1), nhưng
phong độ cuối nghề tụt còn `currentFormIndex=40`. `careerProgress≈0.95` → `legacyWeight≈0.78`
→ `influenceScore ≈ 0.78×95 + 0.22×40 ≈ 83` — tụt thật so với đỉnh (95) nhưng vẫn được nể
trọng vì di sản, không rơi tự do theo phong độ nhất thời như `currentFormIndex` một mình sẽ
làm.

### 3.3 Ràng buộc cứng (để không đụng invariant đã lock)

- **`influenceScore` KHÔNG được đọc bởi bất kỳ hàm growth nào** (`growth-balance.ts`,
  `simulation-helpers.ts`, `stats-evolution.service.ts`) và **KHÔNG đọc bởi `marketValue`/
  `wageAnnual`** (đã bỏ rework — xem §5). Chỉ được đọc bởi: top-up Scout/Approach (§5),
  Shop UI (hiển thị + gate mở khoá item cao cấp).
- **Không tính real-time trong flow spin** — chỉ derive **1 lần cuối mùa** (cùng
  checkpoint với `marketValue`), không thêm round-trip server nào (giữ đúng tinh thần T1
  pure lib + checkpoint hiện có, `core-game-logic-systems-map.md §4b`).

---

## 4. Player Wallet (Currency)

### 4.1 Nguồn thu (income → wallet)

**Đơn vị: giữ nguyên € nghìn** — cùng đơn vị với `wage`/`fee`/`marketValue` đã lock ở
`core-transfer-design.md §5.2`. Không phát minh đơn vị tiền ảo mới ("coin", "gem"...) — số
trên Wallet đọc trực tiếp ra € được, giữ tính nhất quán toàn bộ UI tiền trong game.

| Nguồn | Công thức | Khi nào |
|---|---|---|
| **Wage** | `wallet += currentWageAnnual` (nguyên vẹn, không trừ) | Mỗi mùa, tại thời điểm `evolvePlayerStatsAction` hoàn tất (cùng checkpoint cuối mùa hiện có) |
| **Net transfer income** | `wallet += round(transferFee × (1 − AGENT_COMMISSION_RATE))` | Lúc accept **transfer thật** (fee > 0). Renewal fee luôn = 0 → tự động không cộng gì. FA fee = 0 → tự động không cộng gì. |

**Đã bỏ Sponsorship khỏi v1** (xem lịch sử §13) — Wallet không có nguồn thu nào độc lập
khỏi CLB nữa; income hoàn toàn là 2 dòng trên, đọc lại số mà hệ thống transfer đã lock
tính ra, **không sửa** `computeMarketValue`/`proposeWageAnnual`/band §5.3.

**Khấu trừ agent (`AGENT_COMMISSION_RATE`, DRAFT ~8–10%):** mô phỏng thật — agent ăn hoa
hồng trên phí chuyển nhượng khi đàm phán deal cho player, giống bóng đá đời thực. Áp dụng
**chỉ trên `transferFee`**, không đổi số `transferFee` hiển thị trong toàn bộ luồng
transfer hiện có (CLB vẫn "trả" đúng số đó — band/affordability/buyout không đổi gì), chỉ
khấu trừ **tại thời điểm tiền chảy vào Wallet**.

**Còn mở — chưa chốt:** đời thực agent cũng thường ăn % nhẹ hơn (~5%) trên **lương hàng
năm**, không chỉ phí chuyển nhượng. Pass v1.1 này mặc định **wage vào 100%, không trừ** —
nếu muốn thật hơn nữa có thể thêm `wallet += round(currentWageAnnual × (1 − WAGE_AGENT_RATE))`
cùng công thức, để ở §12 làm điểm cần xác nhận thêm.

### 4.2 Chi tiêu (sinks)

- **Chỉ có Shop** ở pass đầu (đã chốt — không sink lifestyle/tax).
- Mỗi purchase: `wallet -= item.price`; **server từ chối** nếu `wallet < item.price` tại
  thời điểm xử lý (không tin số dư client gửi lên — xem §8).

### 4.3 Trust model (bắt buộc — theo đúng pattern `hiddenStats`/OVR đã có)

```text
❌ CẤM: client tự cộng/trừ walletBalance rồi gửi số cuối cùng lên server
✅ ĐÚNG: client gửi { action: "purchase", itemId }, server tự đọc walletBalance hiện tại
   từ DB, tự trừ, tự validate đủ tiền, tự ghi ledger — giống hệt evolvePlayerStatsService
   không tin nextOvr từ client mà luôn tự tính lại.
```

### 4.4 Schema đề xuất (thêm cột, không phá field cũ)

Theo đúng convention hiện có của `CareerPlayer` (JSON array cho lịch sử, Int cho số cache):

```prisma
// thêm vào model CareerPlayer, cạnh contractYearsTotal/marketValue hiện có
walletBalance   Int   @default(0)      // € nghìn — cộng dồn thô, server-authoritative
influenceScore  Int   @default(0)      // 0–100, cache derive cuối mùa (giống marketValue)
walletLedger    Json  @default("[]")   // Array<{ age, type, amount, label }>
shopInventory   Json  @default("[]")   // Array<{ itemId, purchasedAtAge, appliedSeason, consumed }>
```

`type` trong `walletLedger`: `"wage" | "net_transfer_income" | "shop_purchase"` — đủ để UI
vẽ lịch sử thu chi, và để debug/audit sau này (đúng tinh thần `events`/`clubStints` hiện
tại: JSON array, mỗi entry tự mô tả). `net_transfer_income` ghi kèm `grossFee` +
`agentCommission` trong `label`/metadata để UI hiển thị rõ đã trừ bao nhiêu.

---

## 5. Influence → Scout/Approach top-up (KHÔNG đụng MV/Wage)

**Đã bỏ khỏi v1.1** (so với v1 cũ): rework `computeMarketValue`/`proposeWageAnnual` bằng
hệ số nhân Influence. Lý do — sau khi soi lại code, `transferFee` (`mandatoryBuyout`)
**vốn đã không** bị đóng khung theo CLB (nó tính từ chính `marketValue` của player × hệ số
hợp đồng còn lại — band CLB chỉ **lọc** ai đủ tiền mua, không ép fee co lại). Chỉ có
`wageAnnual` mới thật sự bị nội suy trong band CLB mua — và đó là hành vi **đã product-lock
LOCKED** ở `core-transfer-design.md §5.3` ("Fee/wage scale theo sức CLB — không đội yếu
chi 100M€"), không phải thứ cần "sửa". Vậy Influence Score **không cần** đụng vào công
thức tiền nào cả — vai trò của nó chuyển sang 1 chỗ nhẹ hơn, đúng thật hơn:

```text
// lib/transfer-economy.ts — KHÔNG sửa logic gốc của 2 hàm này, chỉ cộng thêm SAU cùng
finalScoutScore   = computeScoutInterestScore(...)    + influenceTopUp(influenceScore)
finalApproachChance = computeApproachAcceptChance(...) + influenceTopUp(influenceScore) / 100

influenceTopUp(influenceScore) = min(8, round(influenceScore × 0.08))   // trần +8 điểm, DRAFT
```

- **Ý nghĩa:** "huyền thoại được để ý ở khắp nơi, kể cả CLB thường không ngó tới" — không
  thay đổi cách 1 CLB cụ thể đánh giá player (`clubPrestige`/`clubThreshold`/nation fit vẫn
  y hệt), chỉ cộng thêm 1 khoản nhỏ, có trần, đại diện cho việc player nổi tiếng toàn cầu
  tạo ra sức hút nền tự nhiên.
- **`marketValue`, `wageAnnual`, `buyoutFactor`, band §5.3 — giữ nguyên 100%**, không sửa
  1 dòng nào trong `core-transfer-design.md`. Đây là thay đổi rủi ro thấp nhất có thể: chỉ
  thêm 1 phép cộng sau cùng lên 2 hàm đã có, không re-tune lại bất kỳ đường cong nào.
- Số `0.08`/trần `8` là DRAFT — cần playtest để top-up không lấn át hoàn toàn tín hiệu
  per-club gốc (`prestigeGap`, `expectedAppsRatio`...).

---

## 6. Shop

### 6.1 Ranh giới bắt buộc (đọc trước khi thêm bất kỳ item nào)

> **Sửa đổi tương ứng ở `core-growth-balance.md`:** dòng "Scope cấm (growth): không thêm
> training / U-team / academy chỉ để nuôi debut" **giữ nguyên tinh thần cấm ghi thẳng
> stat/OVR**, nhưng **không** còn cấm tuyệt đối mọi tương tác kinh tế — đã thêm dòng tham
> chiếu chéo sang whitelist này ở đầu file đó (§ header). **Duy nhất whitelist dưới đây**
> được phép; bất kỳ item mới nào ngoài danh sách này phải quay lại sửa cả 2 SoT, không tự
> ý thêm lever mới trong code.

**Luật cứng cho MỌI item:**

1. ❌ **Không bao giờ** ghi trực tiếp vào `currentStats[key]` hoặc `currentOvr`.
2. ❌ **Không bao giờ** thay đổi trọng số (`weight`) trong bất kỳ pool nào ở
   `growth-balance.ts` / `simulation-helpers.ts` — pool luôn giữ nguyên số đã tune.
3. ✅ **Chỉ được phép:** thêm 1 lượt gọi `resolveWeightedOutcome` bổ sung (reroll — dùng
   **đúng pool cũ, đúng trọng số cũ**), hoặc điều chỉnh **input** của công thức đã có sẵn
   (vd `seasonApps` dùng trong `getDecreaseOpportunitySeverity`), **không** điều chỉnh bản
   thân công thức.
4. ✅ Hiệu lực item **luôn có hạn dùng rõ** (1 mùa, dùng 1 lần) — không có buff vĩnh viễn.
5. ✅ Server luôn là nơi áp effect cuối cùng (đọc `shopInventory`, validate còn hạn/chưa
   dùng), client chỉ hiển thị + gửi lệnh dùng — giống hệt cách `evolvePlayerStatsAction`
   không tin OVR client.

### 6.2 Catalog đề xuất (DRAFT)

**Nguyên tắc catalog (Updated 2026-08-09):** mọi item phải khớp mô hình "mua vào đầu mùa,
áp dụng cho đúng mùa đó" — không có ngoại lệ điều kiện (item nào chỉ có tác dụng khi "đúng
lúc X xảy ra" thì không phù hợp, xem lịch sử §13 vụ Adaptation Kit). Nhóm C (cosmetic) đã bỏ
hẳn khỏi catalog — không cần thiết.

#### Nhóm A — Performance-support (gián tiếp, có kiểm soát)

| Item | Cơ chế | Lever đụng vào (đã có sẵn trong code) |
|---|---|---|
| **Second Chance Token** | Cho phép quay lại **1 lần duy nhất** 1 wheel growth (`dir_increase`/`count`/`magnitude`) trong mùa kế tiếp, dùng **lại đúng pool** `getEffective*` đã tính cho lượt quay gốc — không đổi trọng số, chỉ cho thêm 1 lượt roll độc lập (giữ kết quả tốt hơn trong 2 lần roll) | `resolveWeightedOutcome` gọi thêm 1 lần, pool y hệt |
| **Fitness Coach** | Giảm 45% `getDecreaseOpportunitySeverity` mùa đó (áp dụng multiplier lên severity đã tính, không đổi công thức severity) | `growth-balance.ts::getDecreaseOpportunitySeverity` |
| **Training Camp** *(mới, Updated 2026-08-09, thay Adaptation Kit)* | Cộng thẳng `TRAINING_CAMP_RATING_BONUS` (DRAFT 0.4) vào `base` của `calcRating` ở MỌI giải đấu trong mùa đó — không đụng G/A/CS hay apps, chỉ rating | `season-simulator.service.ts::calcRating` (param `perfBonus`) |
| **Sports Psychologist** | Bù 1 tier `matchRating` khi tính growth gate cho **đúng 1 mùa** kém phong độ bất thường (áp trần: chỉ kích hoạt nếu mùa đó rating giảm đột ngột ≥ 0.8 so với trung bình 2 mùa trước — chống lạm dụng mua mỗi mùa) | `getGrowthTier(rating)` — input rating được "làm mượt" 1 lần, không đổi hàm |

#### Nhóm B — Economy / Market

| Item | Cơ chế |
|---|---|
| **Agent Đàm Phán** | Tăng `acceptChance` khi chọn deal lương "higher" ở Salary Negotiation (§13 `core-transfer-design.md`) thêm 1 nấc — không đổi trần band |
| **Mở Rộng Shortlist** | Tăng `K` (số kết quả tìm kiếm CLB / trang) tạm thời, hoặc unlock filter nâng cao 1 mùa |
| **PR Campaign** | Boost 1 lần `influenceScore` hiển thị tạm thời cho mục đích approach chance mùa đó (không cộng dồn vĩnh viễn vào điểm gốc — chỉ là "buzz" ngắn hạn) — **DRAFT, cân nhắc bỏ nếu thấy dễ bị lạm dụng để làm giả danh tiếng** |

### 6.3 Giới hạn dùng (chống lạm dụng)

- Mỗi item Nhóm A: **tối đa 1 lần mua / mùa / loại** (không stack 3 Second Chance Token
  cùng mùa để reroll liên tục tới khi ra kết quả max).
- Giá tăng dần nếu mua lặp lại nhiều mùa liên tiếp cùng 1 item (soft anti-snowball) —
  DRAFT, số cụ thể chờ playtest.

### 6.4 Giá (DRAFT — hoàn toàn chưa khoá, cần cân bằng với thu nhập §4.1)

Nguyên tắc tạm: giá Nhóm A ≈ 0.5–1.5× wage 1 mùa ở band tương ứng player đang ở (để mua
được nhưng có đánh đổi cơ hội, không "miễn phí" theo tương quan thu nhập).

---

## 7. Data model tổng hợp

```prisma
model CareerPlayer {
  // ...existing fields...

  // Wallet & Influence (mới)
  walletBalance   Int   @default(0)      // € nghìn
  influenceScore  Int   @default(0)      // 0–100, cache derive cuối mùa
  walletLedger    Json  @default("[]")   // Array<{ age, type, amount, label }>
  shopInventory   Json  @default("[]")   // Array<{ itemId, purchasedAtAge, appliedSeason, consumed }>
}
```

**Shop catalog KHÔNG vào DB** — theo đúng convention `prisma/data/leagues.ts` /
`prisma/data/clubs.ts` (dữ liệu tĩnh, không đổi theo game session): đề xuất
`lib/shop-catalog.ts` — pure TS const array, import cả client (preview giá/mô tả) và
server (validate purchase). Không cần bảng `ShopItem`/`ShopPurchase` riêng — nhất quán với
việc project này ưu tiên JSON-array-trên-CareerPlayer hơn bảng quan hệ phụ cho dữ liệu
lịch sử cá nhân player (xem `events`, `clubStints`, `achievements`, `seasonHistory`).

---

## 8. Server Action & integrity (theo T1/T2/T3, `core-game-logic-systems-map.md §4b`)

| Tầng | Việc |
|---|---|
| **T1 — pure lib** | `lib/wallet.ts` (tính income mỗi mùa — wage nguyên vẹn + net transfer income sau khấu trừ agent), `lib/shop-catalog.ts` (catalog + hàm `applyShopItemEffect` thuần, nhận input hiện có trả input đã điều chỉnh — **không** side-effect, không random ngoài `spin-resolver.ts`), `lib/influence-score.ts` (derive `legacyScore`/`currentFormIndex`/blend từ achievements/seasonHistory/statsTimeline) |
| **T2 — client orchestration** | Hiển thị Wallet balance, Shop catalog, preview hiệu ứng item; gửi lệnh `purchaseShopItemAction({ itemId })` — **không** tự trừ tiền tại client trước khi server xác nhận (optimistic UI được, nhưng phải rollback nếu server reject) |
| **T3 — server checkpoint** | `purchaseShopItemAction`: đọc `walletBalance` từ DB, validate đủ tiền + item hợp lệ + chưa vượt giới hạn mùa, trừ tiền, ghi `walletLedger` + `shopInventory`, trả lại state mới. Cùng checkpoint cuối mùa hiện có: cộng wage + net transfer income vào `walletBalance`, derive `influenceScore` mới — **gộp vào action đã tồn tại** (`saveSeasonProgress`/`completeGameSession` hoặc tương đương), **không** thêm round-trip mới ngoài checkpoint sẵn có. `lib/transfer-economy.ts`: cộng `influenceTopUp` sau `computeScoutInterestScore`/`computeApproachAcceptChance` tại nơi 2 hàm này đang được gọi trong `transfer.service.ts` |

**Action mới cần thêm** (Zod-validate, `requireAuth` + `verifyGameOwnership` như mọi
action ghi dữ liệu khác — theo invariant #1 `CLAUDE.md`):

- `purchaseShopItemAction(input: { gameId, playerId, itemId })`
- (Có thể gộp vào action cuối mùa hiện có thay vì action riêng) cộng income + derive
  influence — cần xác nhận điểm nối chính xác trong `actions/season.actions.ts` lúc
  implement.

---

## 9. UI touchpoints (chưa thiết kế chi tiết — cần sync `core-ui-ux-design.md` ở pass sau)

- **Wallet balance:** hiển thị persistent, tự nhiên nhất là cạnh `PersistentTransferSection.tsx`
  / `TransferWindowPanel.tsx` — đã có pattern "Persistent Off-season UI Section"
  (`core-transfer-design.md §15`), Wallet nên theo đúng pattern đó thay vì mở modal riêng.
- **Shop:** màn hình/section mới trong off-season flow, sau khi quyết định transfer (mua đồ
  chuẩn bị cho CLB/mùa mới đã chốt).
- **Influence Score:** badge/tier hiển thị trên `PlayerStickerCard.tsx` / career dashboard —
  KHÔNG hiển thị như 1 "chỉ số thứ 7" cạnh PAC/SHO/... (tránh gây nhầm là stat game).

*(Phần này cố ý để nông — cần 1 pass riêng đọc kỹ `core-ui-ux-design.md` + làm việc với
UI SoT trước khi khoá component/flow cụ thể.)*

---

## 10. Lộ trình ship

| Phase | Phạm vi | Ghi chú |
|---|---|---|
| **F0** | Pure lib: `lib/influence-score.ts`, `lib/wallet.ts`, `lib/shop-catalog.ts` + unit test số | Không DB, không UI |
| **F1** | Prisma migration: 4 cột mới trên `CareerPlayer` (§7) | Backward-compatible (`@default`), không phá save cũ |
| **F2** | Wire income vào checkpoint cuối mùa hiện có (wage + net transfer income → `walletBalance`; derive `influenceScore`) | Chưa có Shop UI — Wallet đã chạy ngầm, có thể log-only trước |
| **F3** | Cộng `influenceTopUp` sau `computeScoutInterestScore`/`computeApproachAcceptChance` (§5) | Thay đổi nhỏ, không đụng MV/wage/band — rủi ro thấp |
| **F4** | `purchaseShopItemAction` + Shop UI + Wallet UI | Nhóm C (cosmetic) ship trước để giảm rủi ro balance, Nhóm A/B ship sau khi Nhóm C ổn định |
| **F5** | Playtest cân bằng giá/income/agent-commission-rate; xét bật `PR Campaign` hay bỏ |

**Không làm ở pass đầu:** sink lifestyle/tax, marketplace multiplayer, Sponsorship, rework
`marketValue`/`wageAnnual`.

---

## 11. Checklist sync các SoT khác (làm khi implement, không phải bây giờ)

| Nơi | Việc |
|---|---|
| `prisma/schema.prisma` + migration | 4 cột mới §7 |
| `core-transfer-design.md` | KHÔNG sửa công thức/số nào (§5.3/§5.4/§5.5 giữ nguyên) — chỉ thêm 1 dòng tham chiếu ở nơi gọi `computeScoutInterestScore`/`computeApproachAcceptChance` trỏ sang `core-currency-shop-design.md §5` cho ai đọc code không bỡ ngỡ |
| `core-growth-balance.md` | ✅ Đã thêm dòng tham chiếu chéo ở header (làm trong lần sửa này) — xem §6.1 |
| `core-game-logic-systems-map.md` | Thêm subsystem "Wallet/Influence/Shop" vào ma trận phụ thuộc §2 + layer mới trong `.ua` knowledge graph lần scan tới |
| `core-ui-ux-design.md` | Thêm Wallet + Shop vào flow off-season — cần pass riêng, xem §9 |
| `actions/season.actions.ts` | Action mới `purchaseShopItemAction` + wire income vào checkpoint cuối mùa |

---

## 12. Definition of "xong bàn" trước khi code

- [x] Wallet income = wage 100% + `transferFee × (1 − AGENT_COMMISSION_RATE)` khi transfer thật.
- [ ] Confirm số `AGENT_COMMISSION_RATE` (đề xuất DRAFT 8–10%).
- [ ] Confirm có áp thêm agent-cut nhẹ (~5%) lên `wageAnnual` không, hay wage giữ 100%.
- [x] Bỏ Sponsorship, bỏ rework `marketValue`/`wageAnnual` khỏi v1.
- [ ] Confirm công thức `legacyScore` §3.2 (trọng số trophy/international/ballonDor/longevity)
      và `currentFormIndex` (input cụ thể: currentOvr vs peakOvr, matchRating, club prestige).
- [ ] Confirm hệ số blend `legacyWeight = 0.3 + 0.5 × careerProgress` — có đúng cảm giác
      "trẻ dựa phong độ, già dựa di sản" mong muốn không?
- [ ] Confirm `influenceTopUp` trần +8 điểm / hệ số 0.08 lên Scout/Approach (§5) — đủ nhẹ
      để không lấn át tín hiệu per-club gốc chưa?
- [ ] Confirm catalog Nhóm A/B cụ thể — item nào giữ, item nào bỏ (đặc biệt `PR Campaign` —
      rủi ro bị coi là "mua danh tiếng giả")
- [ ] Confirm giá Shop §6.4 (chỉ có nguyên tắc, chưa có số)
- [ ] Review UI với `core-ui-ux-design.md` (§9 cố tình để trống chi tiết)
- [ ] Xác nhận điểm nối chính xác trong `actions/season.actions.ts` cho income cuối mùa

---

## 13. Lịch sử

| Ngày | Thay đổi |
|---|---|
| 2026-08-07 | **v1 DRAFT** — tạo SoT: chẩn đoán pain (MV/wage neo prestige CLB, không có trục tích luỹ); đề xuất Influence Score (derive, không schema input mới); Wallet cộng dồn thô (đã chốt qua Q&A); rework MV/wage bằng hệ số nhân độc lập (giữ nguyên band §5.3 `core-transfer-design.md`); Shop whitelist lever gián tiếp (không đụng stat/OVR, sync với rule cấm ở `core-growth-balance.md`); schema đề xuất 4 cột JSON/Int trên `CareerPlayer`, catalog Shop là pure lib không phải DB table (theo convention `prisma/data/*.ts`); lộ trình F0–F5. |
| 2026-08-09 | **Catalog live update (post-ship, user feedback):** bỏ hẳn Nhóm C (cosmetic) —
không cần thiết. Bỏ **Adaptation Kit** — vi phạm nguyên tắc catalog mới ("mua đầu mùa, áp
dụng đúng mùa đó, không điều kiện ngoại lệ": Adaptation Kit chỉ có tác dụng nếu đúng lúc
"mùa đầu tiên sau chuyển CLB", gây khó hiểu). Thêm **Training Camp** — item đắt nhất
catalog, cộng thẳng bonus rating cố định vào `calcRating` mọi giải đấu trong mùa mua
(`TRAINING_CAMP_RATING_BONUS=0.4` DRAFT, giá `€1.4M` DRAFT) — cơ chế xác nhận với user: chỉ
đụng rating, không đụng G/A/CS/apps, tránh chồng hiệu ứng. |
| 2026-08-07 | **v1.1 DRAFT — rút gọn sau review:** (1) Xác nhận qua đọc lại code: `transferFee` vốn đã không đóng khung theo CLB (tính từ MV player, band chỉ lọc affordability) — chỉ `wageAnnual` mới thật sự clamp theo band, và đó là hành vi đã LOCKED, không phải bug. (2) **Bỏ hẳn §5 rework MV/Wage + Sponsorship** — thay bằng 1 top-up nhỏ có trần cộng SAU `computeScoutInterestScore`/`computeApproachAcceptChance`, không sửa công thức tiền nào. (3) Wallet income: wage 100% + `transferFee` **trừ hoa hồng agent** (DRAFT ~8–10%, mô phỏng thật) thay vì % "signing bonus" tuỳ ý trước đó. (4) Influence Score đổi từ 1 số đơn điệu tăng + "decay DRAFT" mơ hồ → **2 thành phần rõ ràng**: `legacyScore` (vĩnh viễn, từ thành tích) + `currentFormIndex` (tính mới mỗi mùa), blend theo `careerProgress` — tạo hiệu ứng tương tự decay mà không cần xoá điểm đã kiếm được, đúng bản chất thật (di sản không phai, độ nóng hiện tại thì có). (5) Làm rõ quan hệ với `scoutInterestScore`: per-club/contextual (nhiều lần/mùa) vs `influenceScore` global (1 lần/mùa) — không trùng nhau, top-up là điểm nối duy nhất. |
