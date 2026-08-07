# Design Discussion — Transfer Market, Contract & Finances (v1.2)

> **Status:** Tài liệu thiết kế — product locks đã chốt (§5.3, K=3, MV curve + buyoutFactor
> **đồng ý về nguyên tắc**). Điều kiện gia hạn + “giảm giá để tìm CLB fit” đề xuất ở §4.4 / §5.7
> — chờ confirm. **Chưa code.**  
> **Mục tiêu:** Cửa sổ chuyển nhượng có **câu chuyện + quyết định kinh tế** (phí mua /
> lương) gắn **khả năng tài chính thực tế của CLB**, vẫn khớp career loop (fit → apps →
> rating → growth → OVR).  
> **Không code trong file này.**
>
> **Product lock (2026-07-31 → cập nhật cùng ngày):**  
> - Pass transfer **phải có** contract years + **transfer fee** + **wage**.  
> - Fee/wage **scale theo sức CLB** (không đội yếu chi 100M €).  
> - Đơn vị lưu: **€ nghìn** (UI format ra € / €M).  
> - MV: **derive + cache** trên player cuối mùa (resume UI).  
> - Debut: lương + số năm HĐ **cùng công thức** với transfer, theo CLB debut.  
> - Reject offer: **không** cooldown CLB.  
> - Band tài chính: **chỉ standard** (chưa state-backed).  
> - Buyout `remaining ≥ 2`: **chỉ hiện nếu CLB mua afford**; không thêm lớp “CLB không bán”.  
> - Có **gia hạn hợp đồng** với CLB hiện tại.  
> - Mọi HĐ mới / gia hạn: `contractYears ≤ seasonsLeftInCareer` (không vượt tuổi nghề).  
> - **K inbound tối đa = 3.**  
> - **Buying power §5.3 LOCKED** (standard bands only).  
> - **MV curve + buyoutFactor:** đồng ý nguyên tắc (chi tiết số §5.4–5.5).  
> - **Gia hạn + linh hoạt giá:** xem §4.4 / §5.7 (đề xuất — chờ confirm).  
> - **Buyout / phí phá HĐ CLB hiện tại:** **không** bị giảm bởi deal linh hoạt của player (§5.7).
>
> Tài liệu liên quan:
> - [`core-game-logic-systems-map.md`](./core-game-logic-systems-map.md) — transfer = core;
>   1 checkpoint Server Action / mùa (§4b).
> - [`core-growth-balance.md`](./core-growth-balance.md) — **§7.6** `lib/club-fit.ts`.
> - [`game-design.md`](./game-design.md) — Years-at-Club / offer cũ (lệch runtime).
>
> Schema hiện tại (`CareerPlayer`, `Club`): **không** có `wage`, `marketValue`,
> `contractYears*`, `transferBudget`. `Club` chỉ có `prestige` + quan hệ `League.tier` /
> `prestige` — đủ để **derive** sức mua (không cần auth thủ công 100M cho từng CLB).

---

## 1. Vì sao cần nâng cấp

### 1.1 Pain hiện tại

| Hiện trạng | Hệ quả |
|---|---|
| Offer = tên CLB + Accept/Reject | Không có lý do kinh tế để so sánh |
| Không fee / wage / hạn HĐ trên player | Không kể được “năm cuối”, “mua đứt”, “tăng lương” |
| Club pick prestige ±1 random | Đội yếu có thể “xuất hiện” như ngang hàng đội lớn về mặt narrative |
| `club-fit` chưa nuôi shortlist | Dễ nhận CLB sai phút sau khi vừa tune apps |
| Dead params G/A/CS/position trong transfer service | Docs ≠ code |

### 1.2 Mục tiêu sản phẩm (đã hướng chốt)

1. **Fee + wage trên mỗi offer** — user so sánh (lương ↑ vs phút ↓, phí cao = CLB thật sự muốn…).  
2. **Contract years** — năm cuối / FA dễ đi; giữa HĐ cần mua đứt (fee phản ánh remaining).  
3. **Affordability cứng** — mọi fee/wage clamp theo **club buying power** derive từ
   prestige + league tier (+ optional continental profile). Vi phạm → không generate offer.  
4. **Market browse** — inbound quan tâm + shortlist fit (expected apps).  
5. **Không phá growth/fit** — tiền là lớp quyết định UX, không thay `club-fit` / OVR.  
6. **1 Server Action / mùa** trả full market payload (fee/wage đã tính sẵn).

**Out of scope pass đầu (vẫn ghi để không creep):** loan chi tiết, wage bill CLB động qua
năm, mid-season window, agent fee, đàm phán nhiều vòng kiểu FM, band **state-backed**.

---

## 1.3 Thuật ngữ (tránh hiểu nhầm)

| Thuật ngữ | Nghĩa trong game |
|---|---|
| **Inbound** | Lời đề nghị **từ CLB khác → tới player**. CLB “quan tâm / muốn mua (hoặc ký FA)”. Đây là danh sách A trong Transfer Window. |
| **Outbound / shortlist / approach** | Player (user) **chủ động nhìn** CLB hợp fit và **ngỏ lời** (khi HĐ cho phép). Danh sách B. |
| **K (inbound)** | Số **tối đa** offer inbound mỗi cuối mùa. **Đã chốt: K = 3.** |
| **Buying power / band** | Trần fee & wage CLB được phép trả, derive từ `prestige` × `league.tier`. |
| **State-backed band** | Ngoại lệ thiết kế: một số giải/CLB (vd Saudi Pro League top) trong đời thực chi vượt xa prestige “chuẩn châu Âu”. **Pass này không làm** — mọi CLB dùng bảng standard §5.3. Sau này có thể gắn `financialProfile = state_backed` (+1 band) nếu muốn. |
| **Buyout / `mandatoryBuyout`** | Phí phá HĐ còn hạn: `MV × buyoutFactor(remaining)`. **Player không được giảm.** |
| **“CLB không bán”** | Lớp narrative thêm: dù CLB mua đủ tiền, CLB hiện tại **từ chối thương thảo**. **Pass này không làm** — đủ điều kiện là: (1) còn HĐ, (2) CLB mua **afford** ask. Không afford → không hiện trong inbound. |
| **Gia hạn (renewal)** | CLB **hiện tại** đề nghị ký thêm năm + (thường) chỉnh lương, **không đổi CLB**, fee = 0. |

---

## 2. Chỗ đứng trong game logic

```text
offer { club, fee, wage, years, fitApps, reason }
        ↓ accept
setClubAndContinental + write contract/wage trên player
        ↓
mùa sau: apps via club-fit(prestige) — KHÔNG dùng wage để buff OVR
```

| Tín hiệu | Transfer? |
|---|---|
| OVR, prestige, `estimateExpectedLeagueApps` | Shortlist + UI “sẽ đá ~X trận” |
| matchRating, G/A/CS, position | Inbound interest |
| Pull / push (tách kênh) | Ai gửi offer |
| **Club buying power** (mới) | **Trần fee & wage** — bắt buộc |
| **Player market value** (mới, derive) | Fee yêu cầu / baseline |
| Contract remaining (mới) | Gate approach + hệ số buyout |
| personality / luck | Noise nhẹ trên wage/fee trong **band** CLB |

**Invariant balance:** lương cao **không** tăng OVR / apps. Chỉ narrative + quyết định user.
(Tránh vòng “lương → buff → OVR → lương”.)

---

## 3. Vision UX (tóm tắt)

Cuối mùa → **Transfer Window**:

- **(A) Inbound:** 0–K CLB quan tâm, mỗi dòng: lý do, expected apps, **fee**, **wage/năm**,
  **hạn HĐ đề xuất**, badge `affordable` (luôn true nếu đã qua filter).  
- **(B) Shortlist fit:** CLB hợp phút; nếu đủ điều kiện HĐ → approach → server (cùng payload
  hoặc resolve local từ band đã có trong checkpoint) trả 1 offer đã clamp affordability.

Quyết định user ≈ trade-off:

```text
lương / độ dài HĐ / uy tín CLB / phí (tự trọng / “được săn”)
        vs
expected apps (fit) / giải / cúp châu lục
```

---

## 4. Contract + tiền — mức implement (đã kéo C2 một phần vào scope)

### 4.1 Schema gap (xác nhận code)

`CareerPlayer` hôm nay: identity, OVR timelines, `clubStints` JSON, `hiddenStats`…  
**Thiếu:** wage, market value, contract years, fee lịch sử.

`Club` / `League`: prestige, tier — **không** cần cột `budget€` ngay nếu dùng bảng derive.

### 4.2 Mức **C1+F — Soft contract + Fee/Wage có trần CLB** ← **target**

**Trên player (cột Prisma):**

| Field | Type | Ý nghĩa |
|---|---|---|
| `contractYearsTotal` | Int | HĐ vừa ký / gia hạn (đã clamp career) |
| `contractYearsRemaining` | Int | Đếm xuống mỗi mùa; `0` = FA window |
| `currentWageAnnual` | Int | Lương **€ nghìn / năm** (vd `2500` → €2.5M) |
| `marketValue` | Int | Cache MV **€ nghìn** (derive cuối mùa) |

**Trên offer / renewal (payload + event log):**

| Field | Ý nghĩa |
|---|---|
| `kind` | `transfer` \| `free_agent` \| `renewal` |
| `transferFee` | Phí (**€ nghìn**). `0` nếu FA / renewal |
| `wageAnnual` | Lương đề xuất (**€ nghìn**/năm) |
| `contractYears` | Số năm HĐ mới (đã clamp `seasonsLeft`) |

**Gate HĐ + buyout (đã chốt):**

| `remaining` | Inbound (CLB khác) | Outbound approach | Gia hạn CLB hiện tại |
|---|---|---|---|
| `≥ 2` | Hiện **chỉ khi** CLB mua afford buyout ask; fee > 0 | Khóa (mặc định) | Có thể renewal sớm (optional) |
| `1` | Fee thấp / bình thường | Mở | **Ưu tiên renewal** |
| `0` / FA | Fee = 0 | Mở | Renewal = ký lại cùng CLB (fee 0) |

Không có lớp “CLB hiện tại từ chối bán”: không afford → không vào inbound.

### 4.3 Trần tuổi nghề (bắt buộc)

```text
seasonsLeftInCareer = retireAge - currentAge
// Thống nhất 1 định nghĩa với runtime (không lệch pha với careerLengthYears)

maxContractYears = max(1, seasonsLeftInCareer)
contractYears'   = min(proposedYears, maxContractYears, HARD_CAP_5)
```

Áp dụng: **debut**, **transfer**, **FA**, **renewal**.  
Mùa cuối / không còn mùa: không ký mới, không transfer (giữ skip hiện có).  
Không cần sổ “tổng mọi HĐ cả đời”: chỉ **mỗi lần ký** không vượt phần đời còn lại.

### 4.4 Gia hạn hợp đồng (renewal) — điều kiện đề xuất

Trong cùng Transfer Window, hệ thống có thể sinh **tối đa 1** renewal từ CLB hiện tại.

#### Khi nào CLB **muốn** gia hạn? (`wantsRenewal`)

Tất cả phải đúng (AND), trừ khi ghi chú OR:

1. **Còn mùa nghề:** `seasonsLeftInCareer ≥ 1` (không renew mùa giải nghệ).  
2. **Không đang FA bắt buộc bỏ CLB** — vẫn có thể renew khi `remaining = 0` (ký lại) hoặc
   `remaining = 1` (gia hạn năm cuối — **ưu tiên**).  
3. **Fit / phút còn ổn:** `expectedLeagueApps` tại CLB hiện tại ≥ ngưỡng vị trí
   (DRAFT: ~40% fixtures giải, hoặc `estimateAppsRatio ≥ 0.45`) — CLB không giữ người
   chắc chắn ghế dự bị trừ khi OVR vẫn “ngôi sao đội”.  
4. **Form không thảm:** `matchRating ≥ 6.4` **hoặc** (apps thấp nhưng OVR ≥ clubThreshold
   và remaining = 1 — muốn giữ tài sản).  
5. **CLB afford lương mới:** wage đề xuất sau renew ≤ `maxWage` band CLB (§5.3).  
6. **Không xung đột push cực mạnh:** nếu season là *distress* (form rất kém + CLB muốn bán)
   → **không** renewal; chỉ inbound thanh lý.

**Early renew** (`remaining ≥ 2`): chỉ khi form tốt (`matchRating ≥ 7.2`) **và**
overqualified nhẹ (OVR rõ trên threshold) — CLB sợ mất người miễn phí / bị mua đứt.
Không spam early renew mỗi năm.

#### Điều khoản renewal

- `transferFee = 0`, `kind = renewal`.  
- `contractYears` = đề xuất 1–4 (cùng helper years như transfer), rồi clamp §4.3.  
- `wageAnnual`: thường **≥ currentWage** nếu form tốt; lateral nếu form trung bình;
  có thể nhẹ hơn nếu remaining = 0 và player overqualified muốn ở lại (hiếm).  
- Accept → chỉ wage + years; không đổi stint/continental.  
- Reject → không cooldown; inbound cùng cửa sổ vẫn hiện.

#### User agency với renewal

- Accept / Reject như offer thường.  
- **Gia hạn chủ động (Proactive Renewal):** Nếu CLB không tự động gửi lời đề nghị gia hạn (wantsRenewal = false), player vẫn được quyền **chủ động gửi đề nghị gia hạn** với CLB hiện tại.
  - Xác suất gia hạn chủ động thành công (`proactiveRenewalAcceptChance`) được tính dựa trên OVR vs Club Threshold, Form (matchRating), đóng góp chỉ số (G/A/CS) và deal lương lựa chọn.
  - Từ chối chủ động gia hạn → khóa nút gia hạn chủ động trong cửa sổ mùa đó.
- **Không** bắt buộc reject renewal mới thấy inbound (cả hai cùng panel).  
- Nếu accept renewal trong cửa sổ đó → có thể **ẩn / hủy** inbound cùng mùa (tránh
  “ký xong rồi chuyển ngay”) — **đề xuất lock:** accept renewal = đóng transfer window
  mùa đó (đã cam kết ở lại).

### 4.5 Không làm ở pass này

- Ledger / FFP / mid-season / loan.  
- State-backed band.  
- “CLB không bán” / cooldown sau reject.  
- Đàm phán nhiều vòng kiểu FM (slider phức tạp).

---

## 5. Affordability — chống “đội hạng dưới chi 100M €”

### 5.1 Nguyên tắc

1. **Buying power derive** từ `club.prestige` + `league.tier` (+ optional
   `continentalTitlesCount` / `continentalType` nhẹ).  
2. Mọi `transferFee` và `wageAnnual` **clamp** vào `[min, max]` của band đó.  
3. Nếu **player market value** (hoặc buyout ask) **> maxFee(club)** → CLB **không xuất hiện**
   trong inbound (trừ distress sale giá cắt — vẫn ≤ maxFee).  
4. Shortlist approach: nếu user chọn CLB không afford → UI disabled + lý do
   (“không đủ ngân sách chuyển nhượng”).

Không hardcode từng CLB 100M — Real/City tự rơi vào band prestige 5 + tier 1.

### 5.2 Đơn vị tiền (đã chốt)

- DB / service: **integer € nghìn** (vd `100000` = €100M).  
- UI: format `€12.5M`, `€800k`.  
- Tránh float trong công thức lưu; `Math.round` về € nghìn.

### 5.3 Bảng Buying Power (**LOCKED**)

Gọi `powerIndex = f(prestige, tier)`. Mọi fee/wage clamp trong `[min, max]` band.
Số trong bảng = **€ nghìn** (đã lock đơn vị).

| League tier | Prestige | Band | `maxTransferFee` (€ nghìn) | `maxWageAnnual` (€ nghìn/năm) |
|---|---|---|---|---|
| 2 | 1–2 | **Lower** | 500 – 8_000 | 50 – 400 |
| 2 | 3 | **Lower+** | 2_000 – 15_000 | 100 – 800 |
| 1 | 1–2 | **Mid** | 5_000 – 25_000 | 200 – 1_500 |
| 1 | 3 | **Upper-mid** | 15_000 – 45_000 | 800 – 4_000 |
| 1 | 4 | **Big** | 30_000 – 90_000 | 2_000 – 10_000 |
| 1 | 5 | **Elite** | 60_000 – 180_000 | 5_000 – 25_000 |

Đọc nhanh: `8_000` € nghìn = **€8M**; `180_000` = **€180M**.

**Ví dụ bắt lỗi:** CLB prestige 2, tier 2 → max fee ~€8M → **không** offer €100M.  
Elite prestige 5 mới vào vùng ≥€100M.

**State-backed:** không áp dụng pass này (xem §1.3). Saudi dùng prestige/tier standard như CLB khác.

**Min trong band:** khi generate offer, `minFee` / `minWage` = cận dưới cột tương ứng (hoặc
hàm nội suy trong khoảng — implement chọn 1; không vượt `max`).

Optional soft bump **chưa lock** (có thể bỏ): `continentalTitlesCount ≥ 1` → ×1.1 maxFee
(vẫn không vượt trần Elite).

### 5.4 Player Market Value + age curve (**nguyên tắc LOCKED**; số DRAFT)

Đồng ý product: MV phụ thuộc OVR + **đường cong tuổi** + form; FA thì fee = 0 nhưng MV
vẫn hiện để so sánh.

```text
baseMV = g(OVR)                         // bảng OVR → € nghìn
ageMul = ageCurve(age)                  // trẻ cao, đỉnh ~22–28, già giảm mạnh
formMul = h(matchRating, G|A|CS vs pos) // ~0.85 … 1.20
contractMul = 1.0 + 0.12 * max(0, remaining - 1)  // HĐ dài → đắt hơn (tham chiếu)

mv = round(clamp(baseMV * ageMul * formMul * contractMul, floor(OVR), ceil(OVR)))
// cache → CareerPlayer.marketValue (€ nghìn)
```

**ageCurve DRAFT (nhân):**

| Age | Mul |
|---|---|
| ≤ 21 | 1.15 – 1.25 |
| 22 – 27 | 1.00 – 1.15 |
| 28 – 31 | 0.85 – 1.00 |
| 32 – 34 | 0.55 – 0.80 |
| ≥ 35 | 0.30 – 0.55 |

### 5.5 Fee, wage, buyoutFactor (**nguyên tắc LOCKED**; số DRAFT)

Tách hai khái niệm tiền trên transfer **còn HĐ**:

| Thành phần | Ý nghĩa | Player deal cắt được? |
|---|---|---|
| **`mandatoryBuyout`** | Phí phá HĐ / bồi thường CLB **hiện tại** | **Không — sàn cứng** |
| **`wageAnnual`** | Lương HĐ mới với CLB mua | **Có** (§5.7) |
| Fee khi FA | `remaining ≤ 0` → `0` | N/A |

```text
buyoutFactor(remaining):
  0 → mandatoryBuyout = 0
  1 → 1.00
  2 → 1.15
  3 → 1.25
  ≥4 → 1.35

mandatoryBuyout = round(mv * buyoutFactor(remaining))
// KHÔNG nhân flexibility của player
// nếu mandatoryBuyout > club.maxFee → CLB không afford → không offer

transferFee = mandatoryBuyout

wage = clamp(targetWage(...) * stepUpBonus, club.minWage, club.maxWage)
// chỉ wage được hạ trong band khi player bật deal
```

Noise có thể ảnh hưởng MV **trước** khi ra buyout; **sau** `mandatoryBuyout` thì không
cho UI/player cắt. Distress sale do **CLB cũ** muốn bán (hạ ask) ≠ deal của player.

### 5.6 Quan hệ với club-fit

| CLB | Fee/Wage | Apps (fit) | Story điển hình |
|---|---|---|---|
| Elite, underqualify | Cao nếu afford buyout | Thấp | “Dự bị + lương khủng” |
| Mid, just-fit | Trung bình | Cao | “Đá chính, lương ổn” |
| Lower, overqualified | Thường **không afford buyout** | Rất cao | FA / MV thấp theo tuổi / CLB cũ distress |

Filter: so `mandatoryBuyout` vs `maxFee` trước khi rank fit.

### 5.7 Linh hoạt tới CLB fit — **chỉ wage / tín hiệu; cấm cắt buyout**

**Invariant (product lock):** player chủ động “giảm giá” **không** giảm được
`mandatoryBuyout` (phí phá hợp đồng với CLB current).

#### A. Outbound / shortlist (chỗ chính)

1. `mandatoryBuyout > maxFee` → **không** mở deal cắt fee. Copy:
   “Phí phá HĐ vượt ngân sách CLB — không thể tự giảm”.  
2. Buyout afford nhưng wage mục tiêu khó → **Deal lương**: nhận wage trong band CLB.  
3. Offer: `transferFee = mandatoryBuyout` (nguyên) + wage đã linh hoạt.

#### B. Available / muốn đi (optional inbound)

- Tăng tín hiệu push / dễ có inbound hơn.  
- Wage trong band CLB mua có thể mềm hơn.  
- **Không** giảm `mandatoryBuyout` hay MV cache dài hạn.

#### C. Cách hợp lệ để tới CLB vừa tầm khi buyout cao

- Chờ năm cuối / FA (buyout thấp / 0).  
- MV giảm theo age/form curve.  
- Distress sale do CLB **hiện tại** muốn bán.  
- Không có nút “giảm 25% phí phá HĐ”.

#### D. Không làm

- Slider cắt fee phá HĐ.  
- Available cắt buyout.  
- Counter-offer nhiều vòng cắt bồi thường CLB cũ.

---

## 6. Mô hình thị trường (payload)

### 6.1 Timing

```text
… → evolvePlayerStats → generateTransferMarketAction → UI window → next season
```

### 6.2 Một action trả về (sketch)

```ts
{
  contract: { yearsRemaining, yearsTotal, currentWageAnnual, marketValue, seasonsLeftInCareer },
  renewal: null | {
    wageAnnual, contractYears, // fee = 0, kind = renewal
  },
  inbound: Array<{
    clubId, clubName, leagueId, leagueName, prestige, tier,
    reason, expectedLeagueApps,
    transferFee, wageAnnual, contractYears, // € nghìn; years đã clamp
    kind: "transfer" | "free_agent"
  }>, // length 0..K
  shortlist: Array<{
    clubId, …, expectedLeagueApps,
    canApproach: boolean,
    canAfford: boolean,
    previewFee, previewWage, previewYears
  }>
}
```

**K:** **3** (đã lock).

### 6.3 Accept / renew / debut

**Transfer / FA accept:** stint + `setClubAndContinental` + ghi wage/years/MV; years đã clamp §4.3.  
**Renewal accept:** chỉ wage + years; không đổi club/cup.  
**Reject (mọi kind):** no-op cooldown.  
**Debut (start career):** gọi cùng `buildOfferTerms` / wage+years theo CLB debut; fee = 0;
`contractYears` clamp `retireAge - debutAge`.  
**Skip** nếu mùa cuối career.

---

## 7. Lộ trình ship (cập nhật sau khi product đòi tiền)

| Phase | Phạm vi | Effort |
|---|---|---|
| **F0** | Pure lib: buyingPower, MV, buildOfferTerms (fee/wage/years), clamp career length, renewal builder | S–M |
| **F1** | Prisma columns + migrate; debut init cùng công thức | M |
| **F2** | Market action + UI: inbound + renewal + fee/wage/years + fit | M |
| **F3** | Shortlist approach + **deal linh hoạt §5.7A** + optional Available §5.7B | M |
| **F4** | Playtest; reopen §5.3 chỉ khi product yêu cầu | S |

**Không** tách “P0 không tiền” nữa — fee/wage nằm từ F0/F2. Mid-season / loan = sau.

---

## 8. Việc cập nhật khi lock SoT số

| Nơi | Việc |
|---|---|
| `prisma/schema.prisma` + migration | Cột contract/wage/(optional MV) |
| `career-setup` / start career | Init HĐ + lương debut theo club prestige |
| `transfer.service.ts` | Market builder + afford clamp |
| `clubStints` / events | Optional lưu `feePaid`, `wageAtJoining` |
| Systems map §3.7 | Transfer ← buying power + MV |
| `game-design.md` | Thay đoạn offer cũ |

---

## 9. Quyết định đã lock / còn 1 chỗ

| # | Chủ đề | Quyết định |
|---|---|---|
| 1 | Đơn vị | **€ nghìn** |
| 2 | Inbound | Offer **từ CLB → player**. **K = 3** (đã lock) |
| 3 | MV | Derive + **cache cột** cuối mùa |
| 4 | Debut | Cùng công thức wage/years với transfer; years tự tính + clamp career |
| 5 | Reject | **Không** cooldown CLB |
| 6 | State-backed | **Không** làm pass này (chỉ standard bands) — giải thích §1.3 |
| 7 | Buyout ≥2 năm | Chỉ hiện nếu **afford**; **không** “CLB không bán” |
| 8 | Gia hạn | **Có** — điều kiện chi tiết §4.4 (**chờ confirm**) |
| 9 | Trần career | `contractYears ≤ seasonsLeftInCareer` mọi lần ký |
| 10 | MV curve + buyoutFactor | **Đồng ý nguyên tắc** + số DRAFT §5.4–5.5 |
| 11 | Giảm giá / deal | **Chỉ wage (+ years)** trên outbound; **cấm** cắt `mandatoryBuyout` |
| 12 | Available toggle | Chỉ tăng tín hiệu muốn đi / wage band — **không** giảm buyout |
| 13 | Approach odds | Shortlist **không** ký ngay; hiện `Cơ hội ký HĐ: XX%`; resolve server `resolveRandom` |
| 14 | FA thất nghiệp | Chỉ `remaining = 0`: skip/hết CLB/approach fail → `isUnemployed`, mùa 0 apps, mùa sau FA lại |

**Còn lại:** confirm §4.4 renewal; confirm §5.7 (outbound wage-deal ± Available, không cắt fee phá HĐ).

---

## 9b. Approach odds + FA unemployed (cập nhật 2026-08-03)

### Approach

- Payload shortlist: `acceptChance` (0–1) từ `computeApproachAcceptChance` (fit / prestige gap / form / tuổi).
- **CHỐT (2026-08-03):** `computeApproachAcceptChance` dùng `effPositionOvr` (§12.1) — không phải `currentOvr` phẳng — để tính `expectedPrestigeFromOvr` và `prestigeGap`. Lý do: CLB đánh giá cầu thủ theo năng lực tại vị trí cụ thể họ cần, không phải tổng OVR. ST với SHO 85 được CLB lớn quan tâm hơn ST OVR 80 nhưng SHO 70.
- UI: `Cơ hội ký HĐ: XX%` + nút `NGỎ LỜI (XX%)` trước khi bấm.
- `resolveShortlistApproachAction` recompute chance (sai lệch >0.02 → reject), roll `resolveRandom() < chance`.
- Từ chối: badge `Từ chối · đã roll với XX%`; không approach lại CLB đó trong window.

### FA thất nghiệp

- Chỉ khi `contractYearsRemaining === 0` (hoặc đã `isUnemployed`).
- Skip cửa sổ / hết approachable + không inbound/renewal → `enterUnemployed()`: clear club+cup, wage 0, `isUnemployed=true`.
- Mùa không CLB: 0 apps, skip standing/cup; sau evol → FA window lại.
- Ký HĐ mới / setClubAndContinental → clear `isUnemployed`.

---

## 10. Definition of “xong bàn” trước code

- [x] Fee + wage + realism sức CLB.  
- [x] € nghìn; MV cache; debut chung công thức; no reject cooldown.  
- [x] Standard bands only; buyout = afford filter only.  
- [x] Renewal tồn tại + clamp career length.  
- [x] **K inbound = 3.**  
- [x] **Bảng buying power §5.3 LOCKED.**  
- [x] MV curve + buyoutFactor (nguyên tắc).  
- [x] **Player deal không cắt phí phá HĐ CLB current.**  
- [x] **Approach odds + hiện % ký HĐ.**  
- [x] **FA unemployed season (chỉ remaining=0).**  
- [ ] Confirm điều kiện gia hạn §4.4.  
- [ ] Confirm §5.7 (wage-deal outbound ± Available).  
- [ ] Khóa số ageMul / buyoutFactor nếu chỉnh khác DRAFT.

---

## 12. `effectivePositionOvr` — Scope Ứng Dụng Toàn Hệ Thống (cập nhật 2026-08-03)

**Ban đầu** `effectivePositionOvr` (§12.1) chỉ được dùng trong Scout Interest Score và Transfer system. **CHỐT (2026-08-03):** Scope mở rộng — `effectivePositionOvr` là **công cụ đánh giá chất lượng cầu thủ-vị trí** cho mọi context CLB quyết định:

| Hệ thống | Trước 2026-08-03 | Chốt sau 2026-08-03 |
|---|---|---|
| Scout Interest Score | `effPositionOvr` | `effPositionOvr` (giữ) |
| Transfer Approach Chance | `currentOvr` | **`effPositionOvr`** |
| Proactive Renewal Chance | `effPositionOvr` | `effPositionOvr` (giữ) |
| Match Rating (`calcRating`) | `currentOvr` | **`effPositionOvr`** |
| Apps Ratio (`club-fit`) | `currentOvr` | **`effPositionOvr`** |
| National Call-up weights | `currentOvr` vs `midOvr` | **`effPositionOvr` vs `midOvr` trong pool cùng position** |
| Cup / Continental wheel | `currentOvr` vs threshold | **`effPositionOvr` vs threshold** |
| Market Value | `currentOvr` | `currentOvr` (giữ — thước đo tổng) |
| Soft-cap gate | `currentOvr` | `currentOvr` (giữ — game balance) |

Xem chi tiết Unified OVR Reference Policy tại `core-growth-balance.md §7.10`.

**Ý nghĩa thực tế:** CB với DEF 88 được CLB lớn cần CB quan tâm dù OVR tổng chỉ 76; ST với SHO 90 được ĐTQG và CLB mơ ước approach cao hơn ST OVR 80 nhưng SHO 68.

### 12.2 Scout Interest Score — Chi tiết 5 yếu tố

Để phản ánh chân thực cách một Scout bóng đá ngoài đời thực đánh giá cầu thủ:
- **`scoutInterestScore`** (0–100) được tính dựa trên 5 nhóm yếu tố thực tế:
  1. **Position-Specific Attribute Matrix:** Đánh giá chỉ số thành phần chuyên biệt theo từng vị trí thi đấu cụ thể (xem §12.1), không đánh giá cào bằng theo OVR chung.
  2. **Position-specific Stats:** Bàn thắng (FW/Winger), kiến tạo (MF/Winger), Clean Sheets (CB/GK), rating trung bình mùa giải.
  3. **National Team Status:** Số lần khoác áo ĐTQG (caps) & phong độ quốc tế mang lại điểm danh tiếng và tăng thu hút trinh sát.
  4. **Nationality & Regional Fit:** Cầu thủ mang quốc tịch cùng quốc gia/khu vực với giải đấu của CLB nhận thêm bonus thích nghi văn hóa (+5-10 pts).
  5. **OVR & Potential Curve:** Khoảng cách OVR vị trí hiệu dụng với ngưỡng CLB (`clubThreshold`), tiềm năng chưa khai phá (potential - ovr).

### 12.1 Ma trận Trọng số Toàn bộ Chỉ số Thành phần theo Vị trí thi đấu cụ thể (`effectivePositionOvr`)

Tất cả các vị trí thi đấu (`ST`, `CF`, `LW`, `RW`, `CAM`, `CM`, `CDM`, `LM`, `RM`, `LB`, `RB`, `CB`, `GK`) được đánh giá dựa trên **toàn bộ 6 chỉ số thành phần thực tế** (`pac`, `sho`, `pas`, `dri`, `def`, `phy` cho cầu thủ ngoài; `div`, `han`, `kic`, `ref`, `spd`, `pos` cho thủ môn). Mọi chỉ số đều đóng góp vào tổng điểm với trọng số logic chuyên biệt (tổng = 100%):

| Vị trí | PAC / SPD | SHO / DIV | PAS / HAN | DRI / KIC | DEF / REF | PHY / POS | Tổng |
|---|---|---|---|---|---|---|---|
| **ST / CF** | 20% | 35% | 10% | 15% | 5% | 15% | 100% |
| **LW / RW** | 30% | 20% | 15% | 25% | 4% | 6% | 100% |
| **CAM** | 12% | 20% | 30% | 25% | 5% | 8% | 100% |
| **CM** | 10% | 7% | 30% | 20% | 15% | 18% | 100% |
| **CDM** | 10% | 5% | 20% | 8% | 32% | 25% | 100% |
| **LM / RM** | 25% | 12% | 25% | 20% | 8% | 10% | 100% |
| **LB / RB** | 25% | 5% | 15% | 10% | 28% | 17% | 100% |
| **CB** | 12% | 3% | 10% | 5% | 40% | 30% | 100% |
| **GK** | 4% (spd) | 20% (div) | 16% (han) | 8% (kic) | 28% (ref) | 24% (pos) | 100% |

- **Chỉ số hiệu dụng vị trí (`positionWeightedRating`):** Tổng tích hợp 6 chỉ số theo ma trận trọng số trên.
- **`effectivePositionOvr`** = `0.65 * positionWeightedRating + 0.35 * currentOvr`.
- Hệ thống Chuyển nhượng & Scout dùng `effectivePositionOvr` làm thước đo năng lực chuyên môn thực tế thay vì OVR cào bằng.

Điểm `scoutInterestScore` trực tiếp tác động tới:
- Xác suất phát sinh đề nghị inbound từ CLB đó.
- Xác suất CLB chấp nhận ngỏ lời (`acceptChance`).

---

## 13. Cơ chế Deal Lương (Salary Negotiation & Wage Elasticity - LOCKED 2026-08-02)

Người chơi có thể điều chỉnh yêu cầu lương khi ký kết HĐ (Gia hạn, Đề nghị inbound, hay Tiếp cận CLB):
- 3 Preset Options:
  1. **Lương thấp (`lower`):** Yêu cầu giảm 15%–25% so với mức đề xuất → **Tăng 10%–18% xác suất thành công (`acceptChance`)**.
  2. **Lương chuẩn (`standard`):** Mức đề xuất mặc định → **Xác suất tiêu chuẩn (0%)**.
  3. **Lương cao (`higher`):** Yêu cầu tăng 10%–20% so with mức đề xuất → **Giảm 10%–20% xác suất thành công (`acceptChance`)**.
- Mọi mức lương sau đàm phán đều bị giới hạn cứng trong dải `[minWage, maxWage]` của CLB Buying Power Band.
- **Invariant:** Deal lương chỉ thay đổi thu nhập hàng năm và % thành công, **tuyệt đối không làm giảm phí phá hợp đồng (`mandatoryBuyout`)** với CLB hiện tại.

---

## 14. Tìm kiếm & Lọc CLB Chủ Động (Dynamic Club Search & Filter - LOCKED 2026-08-02)

- Thay vì giới hạn danh sách ngỏ lời trong 8 CLB fit ngẫu nhiên, hệ thống cung cấp giao diện **Tìm kiếm & Lọc toàn bộ CLB trong cơ sở dữ liệu**:
  - Filter theo Tên CLB (`query string`).
  - Filter theo Giải đấu (`leagueId`).
  - Filter theo Cấp độ uy tín (`prestige 1–5`).
  - Filter theo Hạng đấu (`leagueTier 1–2`).
- Kết quả được phân trang (10 CLB/trang), mỗi CLB hiển thị đầy đủ `acceptChance`, `previewWage`, `previewFee`, `expectedApps` và bộ chọn Deal Lương.
- Điều kiện tiếp cận (Gate): Chỉ mở khi HĐ remaining ≤ 1 năm hoặc đang thất nghiệp (`isUnemployed`). Phí phá HĐ bắt buộc phải nhỏ hơn ngân sách tối đa (`maxFee`) của CLB.

---

## 15. Giao diện Section Cố định dưới Profile Mùa giải (Persistent Off-season UI - LOCKED 2026-08-02)

- Trong giai đoạn Cuối mùa / Chuẩn bị mùa giải mới (Off-season):
  - Hệ thống hiển thị Cửa sổ Chuyển nhượng trực tiếp thành **1 UI Section cố định nằm ngay dưới Panini Sticker / Hồ sơ Mùa giải** (Career Dashboard).
  - Section giữ trạng thái Active và không tự biến mất khi đóng Modal. Người chơi có thể thoải mái tìm kiếm, so sánh CLB, đàm phán lương và cân nhắc các quyết định kinh tế.
  - Sau khi chốt quyết định (Gia hạn / Ký mới / Chấp nhận thất nghiệp), Section ghi nhận trạng thái đã hoàn tất HĐ cho mùa giải mới và cho phép chuyển bước tiếp theo.

---

## 11. Lịch sử

| Ngày | Thay đổi |
|---|---|
| 2026-07-31 | v1 — market browse, soft contract C0–C2, P0–P4. |
| 2026-07-31 | **v1.1** — Fee + wage; buying power prestige×tier; MV + buyout; F0–F4. |
| 2026-07-31 | **v1.2** — Lock product Q&A: € nghìn; glossary inbound/state-backed/buyout; no cooldown; no state-backed; afford-only buyout; **renewal**; **careerLength clamp**; MV cache; debut = shared terms builder. |
| 2026-07-31 | **v1.2.1** — Lock **K inbound = 3**. |
| 2026-07-31 | **v1.3** — Lock bảng buying power **§5.3** (không còn DRAFT). |
| 2026-07-31 | **v1.4** — MV/buyoutFactor số DRAFT; **§4.4** điều kiện renewal; **§5.7** linh hoạt giá (outbound deal + Available). |
| 2026-07-31 | **v1.4.1** — Invariant: flexibility **không** giảm `mandatoryBuyout` (phí phá HĐ CLB current); deal chỉ wage/years + Available tín hiệu. |
| 2026-07-31 | **v1.5** — Approach acceptChance + UI %; FA unemployed season (`isUnemployed`). |
| 2026-08-02 | **v2.0** — Lock **Proactive Renewal**, **Scout Interest Score** (G/A/CS/National), **Salary Negotiation**, **Dynamic Club Search & Filter**, và **Persistent Off-season UI Section**. |
