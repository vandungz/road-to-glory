# Source of Truth — Core Growth & OVR Progression Balance

> **Status:** Source of truth cho cân bằng tăng trưởng OVR / chỉ số / season sim feedback.
> **Phạm vi:** realism career arc, rarity của PRIME & peak 99, redesign growth wheels
> (gate / count / magnitude), soft-cap, decline, liên hệ `matchRating` ↔ apps ↔ G/A,
> **Development Score cho increase gate (§4.4)**, **và realism thống kê theo từng
> competition (league / cup / continental / national) có phân biệt theo vị trí** —
> toàn bộ tính ở BE, không đưa logic này xuống client.
> **Không code trong doc này** — chỉ quyết định thiết kế để implement sau.
> **Scope cấm (growth):** không thêm training / U-team / academy chỉ để nuôi debut.
>
> Tài liệu liên quan:
> - `docs/core-game-logic-systems-map.md` — **bản đồ toàn cục** mọi subsystem + phụ thuộc
>   nhân quả + **client/server × latency/scale** (§4b). Đọc trước khi tune từng mảnh
>   hoặc thêm Server Action trong year loop.
> - `docs/core-growth-logic-review.md` — SoT cho **vị trí / OVR formula / formation /
>   height-weight / debut age**. Các quyết định **count/magnitude balance** và tinh thần
>   “rating cao → tăng rất mạnh không trần” trong review đó **bị supersede** bởi file này
>   khi xung đột (đặc biệt Vấn đề C, F).
> - `docs/game-design.md` — mô tả vòng career tổng quan (có thể lệch số liệu cũ).
> - Code hiện tại: `features/season/services/season-simulator.service.ts`,
>   `features/wheel/lib/simulation-helpers.ts`,
>   `features/wheel/lib/career-wheel-resolver.ts`,
>   `features/player/services/stats-evolution.service.ts`.
>
> **Nguyên tắc vị trí:** mọi công thức G/A/CS/rating/growth selector đều **position-aware**.
> Không tồn tại một bộ số “chung cho mọi role”. Khi tune hoặc đọc bảng bên dưới, luôn
> đọc theo cột/nhóm vị trí — ST ≠ CB ≠ GK.

---

## 1. Mục tiêu sản phẩm (non-negotiable)

1. **Real-world career arc** — đa số cầu thủ có đỉnh vừa phải, giữ phong độ một thời
   gian, rồi suy giảm rõ về cuối sự nghiệp. Không phải đường thẳng leo tới trần.
2. **Peak 99 là huyền thoại, không phải mặc định** — xuất hiện hiếm, cảm giác “một trong
   đời”, không phải kết cục gần như 100% mọi career đủ dài.
3. **PRIME không ồ ạt** — “prime” = giai đoạn OVR cao + form ổn định vài mùa, không phải
   trạng thái mà hầu hết slot trong squad đều đạt vì growth quá rộng/mạnh mỗi năm.
4. **Giữ kiến trúc wheel** — vẫn: sim mùa → `matchRating` → gate tăng/giảm → count →
   selector → magnitude → `evolvePlayerStats` → OVR derive từ stats. Đổi **số liệu &
   van hãm**, không đập hệ thống.
5. **UI stats hợp lệ / real-world** — G/A/CS trên từng giải (nhất là cup / châu lục /
   ĐTQG) phải tỷ lệ với số apps thật; không còn cảnh “4 trận cup / 12 bàn”. Tính toán
   **chỉ ở BE** (`simulatePlayerSeasonService` và helper thuần); client chỉ render.

### 1.1 Target phân phối Peak OVR (toàn bộ career đã giải nghệ)

Dùng làm tiêu chí tune / playtest. Số là **mục tiêu thiết kế**, cho phép lệch nhẹ sau
balance pass nhưng không được kéo về “gần như ai cũng 95+”.

| Phân vị / nhóm | Peak OVR mục tiêu | Ý nghĩa narrative |
|---|---|---|
| P50 (median) | **82 – 85** | Cầu thủ nghề nghiệp tốt, không phải siêu sao thế giới |
| P75 | **87 – 89** | Sao cấp CLB lớn / ĐTQG thường xuyên |
| P90 | **91 – 93** | Siêu sao / ứng viên Ballon d’Or nhiều năm |
| P97 | **95 – 96** | Thế hệ xuất chúng |
| P99+ / trần 99 | **≤ ~1–3%** careers | Huyền thoại (Messi/Ronaldo-tier trong fantasy scale) |
| Peak ≥ 90 | **≤ ~10–15%** | “PRIME thật sự” — hiếm đủ để squad rating có ý nghĩa |

**Định nghĩa làm việc — PRIME (cho design & UI sau này):** cầu thủ đang trong cửa sổ
`currentOvr ≥ 88` **và** đã giữ `≥ 86` liên tục tối thiểu 2 mùa. Mục tiêu: chỉ một
thiểu số career từng vào cửa sổ này; rất ít giữ được 4+ mùa.

---

## 2. Hiện trạng — vì sao gần như ai cũng peak 99

### 2.1 Vòng phản hồi dương kín

```text
currentOvr + clubPrestige/league
        ↓
appsRatio (OVR vs clubThreshold = 55 + prestige×6)
        ↓
apps / playFactor
        ↓
G/A/CS  (+ ST có bonus (ovr-60)×0.12; CS có term OVR + prestige)
        ↓
matchRating = f(OVR trực tiếp, G/A|CS per app, standing, luck)
        ↓
Growth tier (gate / count / magnitude)
        ↓
stats↑ → OVR↑ → mùa sau lặp lại (không soft-cap)
```

Standing wheel cũng bị OVR kéo → hạng cao → thêm bonus apps/rating → khuếch đại thêm.

### 2.2 Growth wheels đang “béo” ở count & magnitude

Domain count tăng hiện **1–6**; magnitude **1–8**. Với tier Tốt / Xuất sắc (rating
≥ 7.0 — rất phổ biến khi đã đá chính + OVR khá), trọng số dồn vào:

- **Count:** 3–5 (thậm chí 6) có tỉ trọng cao ở tier Xuất sắc / Tốt  
- **Magnitude:** 4–8 có tỉ trọng cao ở tier Xuất sắc (mean ~5.4)

Hệ quả một mùa “tốt”: nhiều chỉ số × biên độ lớn → OVR nhảy mạnh → mùa sau lại dễ
rating cao → **PRIME hàng loạt**, rồi dính trần 99 trước khi decline kịp kéo xuống.

### 2.3 Decline quá yếu

- Gate giảm chỉ chạy khi gate tăng đã **no**.  
- Rating ≥ 7.0: xác suất net tăng vẫn rất cao; giảm hiếm và count/magnitude giảm nhỏ.  
- Age/progress chỉ ±10–15 weight trên gate — không đủ tạo dốc cuối career.

### 2.4 Không có van theo mức OVR

Pool growth của cầu thủ OVR 74 và OVR 94 gần như giống nhau nếu cùng `matchRating`
tier. Clamp duy nhất: từng stat ≤ 99.

### 2.5 Season sim “hào phóng” hóa rating

- Attacker: `(G+A)/apps × 2.5` dễ +1.2…+2.0 vào rating.  
- OVR cao → apps cao khi overqualified CLB → sample G/A lớn.  
- Floor rating 5.5; ceiling 9.0.  
→ Tier Tốt/Xuất sắc không phải outlier — thường là **trạng thái mặc định** sau vài mùa
tăng trưởng.

### 2.6 Bug — G/A (và CS) phi lý ở competition ngoài league

**Hiện tượng (UI):** Domestic cup / continental / national chỉ vài apps (thường 2–13)
nhưng G/A (đôi khi CS) **cao ngất**, không real-world — ví dụ vài trận cup mà gần bằng
cả mùa giải về bàn thắng/kiến tạo. Làm hỏng Season Profile, sticker, cảm giác sim, và
kéo `matchRating` / Ballon eligibility theo hướng sai.

**Gốc rễ kỹ thuật** (`calcAttackStats` trong `season-simulator.service.ts`):

1. Range random được viết như **tổng cả mùa league** (vd ST goals `5–29`, CAM assists
   `3–16`), rồi chỉ nhân `playFactor = apps / matchesInThatCompetition`.  
2. `playFactor` đo **tỷ lệ đá chính trong giải đó**, **không** scale theo độ dài giải.
   Cup 6 trận + đá đủ → `playFactor ≈ 0.9` → gần như nhận **full season G/A** nhét vào
   5–6 apps.  
3. Tham số `apps` được truyền vào `calcAttackStats` nhưng **không dùng** để scale volume.  
4. Bonus tuyệt đối ST `(ovr - 60) × 0.12` được cộng **mỗi lần gọi per competition** →
   cộng dồn league + cup + continental + national (double/triple-count).  
5. `calcCleanSheets` dùng `baseMatches * rate + prestige + ovr` × `playFactor` — với
   cup ngắn, prestige/OVR term vẫn lớn → CS có thể sát hoặc vượt apps trước khi
   `Math.min(apps, …)` cứu phần nào (vẫn có thể CS ≈ apps = 100% sạch lưới phi lý).

**Hệ quả lên growth:** rating theo competition rồi weighted theo apps — một cup ngắn
với `gaFactor` 2.0+ vẫn kéo overall `matchRating` nếu đủ apps cup, hoặc làm per-comp
UI trông như hack. Dù weight league thường lớn hơn, **per-competition display** và
một phần eligibility vẫn bị nhiễm.

> **Cascade vào core logic (quan trọng):** Bug này không chỉ là “UI xấu”. Vì
> `matchRating` (và một phần Ballon / transfer signals) được nuôi từ G/A/CS, số liệu
> cup/continental sai → tier growth (gate/count/magnitude) sai → OVR tiến triển sai.
> Fix **7.0** vì vậy là một phần của **cân bằng core**, không phải polish độc lập.
> Xem mục **7.0.7**.

**Lưu ý vị trí:** mức độ “phi lý” lệch theo role — ST/CAM/winger nổ G/A rõ nhất; GK/CB
lệch chủ yếu ở CS; FB/CDM lệch vừa G/A phụ + CS. Mọi fix phải **giữ bảng rate theo
vị trí**, không gộp một công thức phẳng.

---

## 3. Nguyên tắc thiết kế (SoT)

| # | Nguyên tắc | Chi tiết |
|---|---|---|
| P1 | **Narrow normal growth** | Mùa bình thường: ảnh hưởng **ít chỉ số** + **biên độ nhỏ**. |
| P2 | **Wide growth = rare** | Count 4–6 và magnitude lớn chỉ xuất hiện ở mùa xuất chúng + còn dư địa tuổi/OVR. |
| P3 | **Soft-cap theo OVR** | Cùng rating, OVR càng cao → gate/count/magnitude càng bị nén. |
| P4 | **Prime rồi suy** | Cuối career: giảm dễ hơn tăng; cho phép net âm rõ 3–6 mùa cuối. |
| P5 | **Phanh overqualify** | Ở lại CLB quá yếu so với OVR không được farm rating/growth vô hạn. |
| P6 | **Sim nuôi narrative, growth nuôi balance** | Apps/G/A vẫn kể chuyện; **growth chịu trách nhiệm chính** giữ phân phối peak. |
| P7 | **99 là outlier** | Không cần cấm cứng 99; cần deterministic pressure khiến hầu hết career dừng sớm hơn. |
| P8 | **Position-specific luôn** | Rate G/A/CS, trọng số rating, main-stat selector, age curve — đều theo vị trí (xem review A.*). Không “một số cho cả pitch”. |
| P9 | **Volume ∝ apps (per competition)** | G/A/CS của mỗi giải scale theo **số trận đã đá ở giải đó**, không theo “season-total × playFactor”. |
| P10 | **BE-only season math** | Mọi công thức sim mùa / G/A / rating ở server (hoặc pure lib gọi từ Server Action). Client không tự suy ra G/A hay rating. |
| P11 | **Player kéo mọi competition team** | Không chỉ league standing — domestic cup, continental cup, và ĐTQG (call-up + tournament) đều chịu ảnh hưởng có kiểm soát từ OVR / form / vị trí (khi hợp lý). Kết quả team → số trận → stats cá nhân mùa đó. |

---

## 4. Quyết định — Growth wheels (supersede C/F trong review cũ)

### 4.1 Giữ 4 tier rating (không đổi ngưỡng)

| Tier | `matchRating` |
|---|---|
| Xuất sắc | ≥ 7.50 |
| Tốt | 7.00 – 7.49 |
| Trung bình | 6.50 – 6.99 |
| Kém | < 6.50 |

### 4.2 Count — thu hẹp “bình thường”, hạ weight 3–5

**Domain tăng:** giữ 1–6 (không bỏ 5–6) nhưng **đổi trọng số** để mean thấp hơn rõ.

| Tier (increase) | Pool weight `1/2/3/4/5/6` | Mean mục tiêu |
|---|---|---|
| Xuất sắc | `28 / 32 / 22 / 12 / 4 / 2` | **~2.2** |
| Tốt | `40 / 35 / 18 / 5 / 1 / 1` | **~1.8** |
| Trung bình | `55 / 32 / 10 / 2 / 1 / 0*` | **~1.5** |
| Kém | `70 / 25 / 4 / 1 / 0* / 0*` | **~1.3** |

`0*` = dùng weight tối thiểu `1` nếu engine không cho weight 0.

**Domain giảm:** giữ 1–3; mean giảm khi mùa tốt (hiếm giảm), mean tăng khi mùa kém:

| Tier rating lúc giảm | Pool `1/2/3` |
|---|---|
| Kém | `25 / 40 / 35` |
| Trung bình | `40 / 40 / 20` |
| Tốt | `55 / 35 / 10` |
| Xuất sắc | `70 / 25 / 5` |

**Quyết định:** Count 3+ là “mùa nổi bật”, không phải outcome trung bình của tier Tốt.

### 4.3 Magnitude — hạ ceiling thực dụng & kéo weight về 1–3

**Domain:** thu về **1–6** cho mọi tier (rollback tinh thần “mở 1–8 đồng đều” ở review
F — domain 7–8 chỉ tái mở sau nếu playtest chứng minh P99 không đủ đường tới 99).

| Tier (increase) | Pool weight `1/2/3/4/5/6` | Mean mục tiêu |
|---|---|---|
| Xuất sắc | `18 / 28 / 28 / 16 / 7 / 3` | **~2.7** |
| Tốt | `30 / 32 / 24 / 10 / 3 / 1` | **~2.2** |
| Trung bình | `45 / 32 / 16 / 5 / 1 / 1` | **~1.8** |
| Kém | `60 / 28 / 9 / 2 / 1 / 0*` | **~1.5** |

Hướng decrease: mirror như hiện tại (`getMagnitudeTierForDirection`) nhưng dùng bảng
mean thấp hơn tương ứng — mùa kém mới được biên độ giảm lớn.

**Quyết định:** một chỉ số **+4 / +5 / +6 trong một mùa** phải cảm thấy đặc biệt; cộng
dồn nhiều chỉ số × biên độ lớn cùng lúc phải rất hiếm (cần cả count cao **và**
magnitude cao **và** chưa dính soft-cap).

### 4.4 Gate yes/no — Development Score (chốt 2026-07-30)

> **Supersede** bảng “base Yes% = f(matchRating tier) rồi ± age” kiểu §4.4 cũ.
> Count/magnitude (§4.2–4.3) và soft-cap (§5) **không** nới lại — vẫn là van chống OP.

#### 4.4.0 Phạm vi & mục tiêu trải nghiệm

| Được | Không (out of scope) |
|---|---|
| Cải thiện **logic + UX**: debut/young không bị “kẹt bench” chỉ vì OVR thấp → ít apps → rating xấu → Yes≈0 | Thêm training / U-team / academy / loan bắt buộc chỉ để nuôi growth |
| Giữ rarity peak 99 & PRIME (P1–P7, soft-cap, count/mag hẹp) | Rollback Yes/count/mag kiểu “mọi mùa tốt đều nổ” (OP cũ) |
| Chỉ dùng tín hiệu **đã có** trong year loop | Mở feature mới làm phình scope game |

**Tách hai van:**

- **Gate Yes** = *được phép tăng năm nay không?* (cửa sổ nghề + room + form vừa).  
- **Count / magnitude** = *tăng bao nhiêu?* (vẫn hẹp — Yes cao hơn ở debut ≠ +5 cả bảng chỉ số).

**Acceptance cohort (design, trước khi khóa số playtest):**

| Cohort | Kỳ vọng |
|---|---|
| Năm 1–2, `progress` young, OVR ≤ 75, rating Trung bình | Yes tăng **≥ ~45–60%** (không cần mùa Xuất sắc) |
| Cùng cohort, rating Xuất sắc | Yes cao hơn rõ (~70%+) nhưng count/mag **không** béo lại |
| Net OVR năm 1–2 (median) | **+1 … +2** / năm — không phải +4…+6 |
| OVR 85–90 / soft-cap band | Yes chủ yếu nhờ form; soft-cap siết biên độ |
| `progress ≥ old` | Yes thấp; decrease floor §6 giữ nguyên |

#### 4.4.1 Tín hiệu đầu vào (không invent hệ thống mới)

| Ký hiệu | Nguồn đã có | Vai trò |
|---|---|---|
| `progress`, `young`, `old` | `getCareerProgress` + `getAgeProgressThresholds(position)` | Cửa sổ phát triển theo nghề / vị trí |
| `ovr` | `currentOvr` | Headroom tới soft-cap / “còn xa đỉnh nghề” |
| `tier` / `matchRating` | Sau season sim | **Modifier** form — không gần như 100% input Yes |
| Soft-cap factor | §5 theo `ovr` | Áp **sau cùng** lên Yes tăng |

**Không** dùng apps như án tử khi còn young (tránh vòng OVR thấp → ít phút → không tăng). Apps có thể tinh chỉnh nhẹ sau; **pass 1 không bắt buộc** term apps trong Yes.

Proxy “năm phát triển có tổ chức” (thay training/U): *còn trong `progress < young` + còn headroom OVR* = đủ điều kiện baseline tăng trưởng nghề nghiệp trong scope hiện tại.

#### 4.4.2 Công thức chốt

```text
baseYes   = DevelopmentBase(progressBand, headroomBand)     // bảng 4.4.3
formMul   = FormMultiplier(matchRating tier)                // bảng 4.4.4
yesRaw    = clamp(baseYes × formMul, yesFloor, yesCeil)     // 4.4.5
yesFinal  = applySoftCap(yesRaw, softCapFactor(ovr))        // §5; band 99 → 0 path tăng
noFinal   = 100 - yesFinal   (hoặc normalize weights tương đương)
```

Decrease gate: **giữ** tinh thần §4.4 cũ / code đã ship (tier rating → yes giảm; già floor §6). Development Score **chỉ** redesign **increase** gate. Không mở nhánh “declinePressure” phức tạp thêm ở pass này trừ khi playtest yêu cầu.

#### 4.4.3 `DevelopmentBase` — progress × headroom (trước form & soft-cap)

**Progress band** (so với ngưỡng vị trí):

| Band | Điều kiện |
|---|---|
| `young` | `progress < young` |
| `mid` | `young ≤ progress < old` |
| `old` | `progress ≥ old` |

**Headroom band** (room to grow — không cần “potential” ẩn mới):

| Band | `currentOvr` | Ý nghĩa |
|---|---|---|
| `low` | ≤ 74 | Debut / xây dựng — còn rất nhiều room |
| `mid` | 75 – 81 | Đang tới ngưỡng soft-cap đầu |
| `high` | 82 – 88 | Gần / trong vùng khó nở; base thấp hơn |
| `elite` | ≥ 89 | Base rất thấp; form + soft-cap quyết định |

**Bảng `baseYes` (%):**

|  | headroom `low` | `mid` | `high` | `elite` |
|---|---|---|---|---|
| progress **young** | **58** | **48** | **28** | **12** |
| progress **mid** | **42** | **38** | **30** | **14** |
| progress **old** | **18** | **16** | **12** | **8** |

**Đọc bảng:** debut điển hình = young + low → base **58%** trước form. Cùng OVR thấp nhưng đã `old` → base **18%** (không “trẻ mãi”). Young nhưng đã 85+ → base **28%** — thần đồng vẫn có cửa, không được base kiểu debut 65.

#### 4.4.4 `FormMultiplier` — `matchRating` là tinh chỉnh

| Tier (`matchRating`) | `formMul` |
|---|---|
| Xuất sắc (≥ 7.50) | **1.25** |
| Tốt (7.00 – 7.49) | **1.10** |
| Trung bình (6.50 – 6.99) | **1.00** |
| Kém (&lt; 6.50) | **0.75** |

Ví dụ debut young+low:

- Rating Trung bình: `58 × 1.00 = 58%` → sau soft-cap (≤79 = 1.0) ≈ **58% Yes**.  
- Rating Kém: `58 × 0.75 = 43.5%` → vẫn sống được (đạt cohort ≥45% gần biên; chấp nhận hoặc floor 4.4.5).  
- Rating Xuất sắc: `58 × 1.25 = 72.5%` — thưởng form, không phải điều kiện bắt buộc để phát triển.

Ví dụ mid + mid OVR ~78, rating Tốt: `38 × 1.10 ≈ 42%` — phát triển chậm lại, đúng arc.

#### 4.4.5 Clamp & soft-cap

| Tham số | Giá trị chốt pass 1 |
|---|---|
| `yesFloor` (trước soft-cap) | **8** — tránh Yes≈0 vì làm tròn / edge |
| `yesCeil` (trước soft-cap) | **82** — không trở lại Yes 90%+ hàng loạt |
| Soft-cap | Giữ §5: `yesFinal = max(2, round(yesRaw × bandFactor))` trừ band 99 → path tăng 0 |
| Young `growthBoost` count/mag (§4.5) | Giữ: chỉ khi `ovr < 82` — **không** thay Development Score |

**Cấm khi implement:** nhân thêm age ±10 kiểu cũ *song song* với bảng 4.4.3 (double-count young). Age/progress **chỉ** đi qua `DevelopmentBase`.

#### 4.4.6 Quan hệ với chống OP

| Lớp | Vai trò |
|---|---|
| Development Score (Yes) | Realism debut / UX — “còn cửa sổ thì vẫn có cơ hội tăng” |
| Form multiplier | Narrative mùa tốt/xấu |
| Soft-cap §5 | Van OVR cao |
| Count / magnitude §4.2–4.3 | Van biên độ — **không** nới khi nâng Yes debut |
| Decline §6 | Cuối career |

Nới Yes debut **mà không** nới count/mag = đúng tinh thần: nhiều năm “có tăng nhẹ”, ít năm “nổ chỉ số”.

#### 4.4.7 Map implement (khi code — không làm trong pass giấy tờ này)

| Việc | File gợi ý |
|---|---|
| `getDevelopmentBaseYes` / `getFormMultiplier` / `getEffectiveIncreaseGate` rewrite | `features/wheel/lib/growth-balance.ts` (+ preview `useCareerWheelItems`) |
| Bỏ age ±10 cũ trên increase gate | cùng chỗ — thay bằng bảng 4.4.3 |
| Giữ decrease + soft-cap count/mag | không đụng trừ khi conflict |

Preview ≡ resolve bắt buộc (invariant).

### 4.5 Growth boost lúc “trẻ” (count / magnitude — giữ)

Giữ `getGrowthBoost` (blend pool lên 1 tier) nhưng:

- Chỉ áp khi `currentOvr < 82` (dưới ngưỡng soft-cap band đầu).  
- Khi đã ≥ 82: `growthBoost` hiệu dụng = 0 dù vẫn trong young window.

**Lý do:** thần đồng vẫn bứt sớm về *biên độ*; không boost thêm khi đã sắp PRIME.  
**Không** dùng boost này để thay Development Score ở gate Yes (§4.4).


---

## 5. Quyết định — Soft-cap theo OVR (van chính tới phân phối peak)

Áp lên **gate tăng, count increase, magnitude increase** sau khi đã chọn tier từ
rating. Không xóa story mùa xuất sắc — chỉ nén biên độ khi đã cao cấp.

| Band `currentOvr` | Hệ số nén growth tăng | Ghi chú |
|---|---|---|
| ≤ 79 | `1.00` | Free growth (trong giới hạn bảng 4.x) |
| 80 – 84 | `0.85` | Bắt đầu khó nở rộng |
| 85 – 88 | `0.65` | Cửa vào PRIME — phải mùa thật sự tốt |
| 89 – 92 | `0.40` | Giữ đỉnh khó; count/mag lớn rất hiếm |
| 93 – 95 | `0.22` | Chỉ mùa Xuất sắc + luck còn nhích |
| 96 – 98 | `0.10` | Gần như chỉ +1 một chỉ số phụ |
| 99 | `0.00` tăng main path | Không tăng thêm; chỉ maintain / giảm |

**Cách áp dụng (chuẩn implement):**

1. `gateYes' = gateYes × bandFactor` (rồi normalize với no; floor yes ≥ 2% trừ band 99).  
2. Count/Magnitude: **blend** pool hiện tại với pool “kem/trung_binh” theo
   `(1 - bandFactor)` — hoặc scale weight các value ≥ 3 xuống theo `bandFactor`.  
3. Soft-cap **không** nén gate/count/magnitude **giảm** (decline vẫn full khi già / mùa kém).

---

## 6. Quyết định — Decline & career shape

1. Cuối career (`progress ≥ old` theo vị trí):  
   - Thêm **nhánh giảm độc lập nhẹ**: sau gate tăng, nếu tăng = no **hoặc** (tăng =
     yes nhưng roll phụ `declinePressure`), có thể vẫn giảm 1–2 chỉ số phụ với weight
     nhỏ — tránh “già nhưng vẫn net dương mọi năm”.  
   - *Phương án mặc định SoT:* khi `progress ≥ old`, nếu `dir_increase = no` thì
     `dir_decrease` yes% = `max(current, 55)` (floor già).  
2. Không bắt buộc mọi career phải drop mạnh — nhưng **P50 peak** phải xuất hiện **trước**
   2–4 mùa cuối, rồi OVR retirement thấp hơn peak rõ (gợi ý: retirement median ≈ peak − 4…8).  
3. Selector khi giảm: ưu tiên main-stat nhẹ hơn hiện tại ở giai đoạn già (có thể đảo
   weight main/secondary dần) — để OVR (weighted) giảm cảm nhận được, không chỉ trừ
   chỉ số phụ.

---

## 7. Quyết định — Season sim (BE-only, position-aware)

Hai lớp việc trong sim mùa:

1. **Correctness / UI realism (bắt buộc trước hoặc cùng balance pass):** G/A/CS per
   competition hợp lệ theo apps & vị trí (mục **7.0** — fix bug 2.6).  
2. **Balance hỗ trợ growth (P5–P6):** phanh overqualify + hạ hệ số rating (mục 7.1–7.4).

Growth wheels vẫn chịu trách nhiệm chính giữ phân phối peak (P6). Sim không được tiếp tục
sinh số liệu “hack” làm UI mất niềm tin.

### 7.0 Fix SoT — G/A/CS per competition scale theo apps (thay season-total × playFactor)

#### 7.0.1 Mô hình chuẩn

Với **mỗi** competition `c ∈ {league, domestic_cup, continental, national}`:

```text
apps_c          ← đã có (từ appsRatio × matches_c)
rate_g(pos, ovr, compContext)
rate_a(pos, ovr, compContext)
rate_cs(pos, ovr, prestige, compContext)   // chỉ GK/CB/FB/CDM

goals_c   = round( apps_c × rate_g × noise )
assists_c = round( apps_c × rate_a × noise )
cs_c      = round( apps_c × rate_cs × noise )  rồi clamp [0, apps_c]
```

- **`playFactor` / appsRatio** chỉ quyết định `apps_c`, **không** nhân vào range
  season-total nữa.  
- **Không** cộng bonus tuyệt đối `(ovr-60)×k` **per competition** kiểu hiện tại; OVR
  chỉ dịch `rate_*` (bàn/trận, kiến tạo/trận, CS/trận).  
- Noise: dùng `resolveRandom` / `resolveRandomFloat` qua spin-resolver (invariant
  Math.random). Biên độ noise nhỏ (±15–25% quanh kỳ vọng), không random lại cả dải
  season 5–29.  
- Tổng mùa = tổng các competition (UI đã hiển thị per-comp + total).

#### 7.0.2 Bảng rate gốc theo vị trí (per app, OVR tham chiếu ~78, giải đấu club bình thường)

Đây là **baseline SoT** — tune sau playtest; đơn vị ≈ “bàn hoặc kiến tạo mỗi trận đã đá”.

| Vị trí | `rate_g` | `rate_a` | `rate_cs` | Ghi chú real-world |
|---|---|---|---|---|
| GK | ~0 | ~0–0.02 | **0.28 – 0.40** | CS phụ thuộc prestige + OVR |
| CB | 0.02 – 0.06 | 0.01 – 0.04 | **0.25 – 0.38** | Ít G/A |
| LB / RB | 0.02 – 0.07 | 0.05 – 0.12 | **0.22 – 0.35** | Assist > goal |
| CDM | 0.02 – 0.06 | 0.04 – 0.10 | **0.18 – 0.30** | Hybrid |
| CM | 0.05 – 0.12 | 0.08 – 0.16 | 0 | |
| CAM | 0.10 – 0.22 | 0.12 – 0.24 | 0 | Creator |
| LW / RW | 0.12 – 0.28 | 0.08 – 0.20 | 0 | |
| LM / RM | 0.08 – 0.18 | 0.10 – 0.20 | 0 | Thấp hơn winger thuần một chút |
| ST | **0.35 – 0.65** | 0.05 – 0.15 | 0 | Dứt điểm; đỉnh fantasy ~0.7+ rất hiếm |

Cách dùng OVR: nội suy tuyến tính trong band (vd OVR 65 → cạnh dưới, OVR 90 → cạnh
trên, soft-cap rate khi OVR > 92). **Không** cộng thêm hằng số bàn tuyệt đối ngoài rate.

#### 7.0.3 Context competition (nhân lên rate, không thay model)

| Competition | Hệ số lên `rate_g` / `rate_a` | Lý do |
|---|---|---|
| League | `1.00` | Chuẩn |
| Domestic cup | `0.90 – 1.05` | Có thể gặp đội yếu hơn / xoay tua; cho phép ± nhẹ |
| Continental | `0.75 – 0.95` | Mức đấu cao hơn → khó ghi hơn một chút |
| National | `0.70 – 1.10` | Sample nhỏ + variance cao hơn (noise rộng hơn), mean không được nổ |

CS: continental/national có thể ± theo prestige đối thủ proxy (nếu chưa có data đối thủ:
dùng `clubPrestige` / national tier như hiện tại, nhưng **vẫn** `cs = apps × rate_cs`).

#### 7.0.4 Sanity clamp (bắt buộc trước khi trả về FE)

Per competition, sau round:

- `goals ≤ apps` (strict) — không 4 apps / 12 goals.  
- `assists ≤ apps` (strict; có thể nới `≤ apps + 1` nếu muốn edge-case hiếm).  
- `goals + assists ≤ max(apps, floor(apps × 1.25))` cho non-ST; ST cho phép
  `≤ floor(apps × 1.5)` (hat-trick mùa vẫn hiếm nhờ rate + noise).  
- `cleanSheets ≤ apps`.  
- Nếu `apps = 0` → mọi stat = 0, rating competition = 0 (đã có).

#### 7.0.5 League vẫn dùng chung model

League **không** giữ công thức cũ “season range × playFactor”. Cùng model `apps × rate`
để một codebase; với ~25–38 apps, ST `rate_g ≈ 0.45` → ~11–17 bàn/mùa — khớp cảm giác
real hơn dải random 5–29 × playFactor hiện tại và **tự hết** bug cup.

#### 7.0.6 Ảnh hưởng tới rating & growth

Sau fix:

- `gaFactor = (G+A)/apps` ổn định theo vị trí (không còn spike vì volume sai).  
- Weighted season `matchRating` phản ánh đúng phong độ, không bị cup “hack”.  
- UI Season Profile / Panini / lịch sử mùa **hợp lệ** mà không cần client tự sửa số.

Implement **chỉ** trong `features/season/services/season-simulator.service.ts` (+ có thể
tách pure helper trong `lib/` nếu file phình). Zod/Server Action giữ thin; **cấm** tính
lại G/A ở React client.

#### 7.0.7 Cascade bắt buộc vào core loop (fix bugs = đổi balance)

Chuỗi hiện tại:

```text
G/A/CS per competition (BUG: volume sai ở cup/continental/national)
        ↓
per-comp rating + weighted matchRating cả mùa
        ↓
getGrowthTier(matchRating) → gate / count / magnitude
        ↓
Δstats → ΔOVR → apps/standing mùa sau
```

Khi G/A cup bị thổi phồng:

| Tầng | Hệ quả sai |
|---|---|
| `gaFactor` / CS rate | Quá cao dù chỉ vài apps |
| `matchRating` | Dễ vào tier **Tốt / Xuất sắc** hơn thực tế |
| Growth wheels | Yes% / count / magnitude “béo” hơn đáng lẽ |
| OVR | Leo nhanh hơn → overqualify CLB → apps/rating càng dễ cao (tuyệt lăn) |
| Ballon / awards / transfer hooks | Dựa rating & G/A tổng — cũng bị kéo theo |

Vì vậy:

1. **Fix 7.0 sẽ tự nerf một phần inflation** ngay cả trước khi đụng bảng count/magnitude
   ở mục 4 — đặc biệt với ST/CAM/winger có nhiều cup/continental.  
2. **Không tune growth pools như thể bug G/A vẫn tồn tại.** Sau 7.0, median
   `matchRating` và tần suất tier Xuất sắc sẽ **giảm**; nếu siết count/magnitude trước
   rồi mới fix G/A, sẽ **over-nerf** (peak phân phối tụt dưới target 82–85).  
3. **Thứ tự SoT:** ship / playtest **7.0 trước** (hoặc cùng PR nhưng đo riêng), đo lại
   phân phối rating & peak thô, **rồi mới** khóa số gate/count/magnitude/soft-cap.  
4. Expectation sau chỉ 7.0 (chưa siết growth): peak 99 vẫn có thể còn quá phổ biến, nhưng
   **bớt** case “mùa trung bình + cup nổ số → Xuất sắc giả”; UI và rating trung thực hơn
   → các van ở mục 4–5 mới tune đúng.

**Kết luận thiết kế:** bug G/A ngoài league là **lỗi correctness của season sim** và
đồng thời là **input bẩn của core progression**. Coi 7.0 là bước nền của balance pass,
không phải hotfix UI tách khỏi core logic.

### 7.1 Phanh overqualification (P5)

Khi `ovr - clubThreshold ≥ 12`:

- Nhân contribution của `gaFactor` / CS vào **rating** với hệ số giảm dần (diff 8 → 16:
  `1.0 → 0.55`).  
- **Không** cắt apps narrative (vẫn đá chính).  
- Có thể nhân nhẹ `rate_g/a` khi overqualified ở giải yếu (`× 0.85`) — tùy chọn đợt 2;
  ưu tiên siết ở rating trước.

### 7.2 Hệ số rating theo nhóm vị trí

Sau khi G/A đã realistic:

| Nhóm | Term performance (SoT) |
|---|---|
| ST / LW / RW / CAM / CM | `(G+A)/apps × **1.8**` (hạ từ 2.5) |
| CDM | `CS/apps × 1.3 + (G+A)/apps × 0.9` |
| GK / CB / LB / RB | `CS/apps × **2.2**` (hạ từ 2.8) |

Mục tiêu: mùa tốt vẫn ≥ 7.0 khả dĩ; ≥ 7.5 cần output thật sự nổi bật theo **đúng role**.

### 7.3 Term OVR trong `calcRating`

Ưu tiên: `(ovr - clubThreshold) × 0.01` capped (rating = hay **so với môi trường**), thay
cho `(ovr - 55) × 0.015` tuyệt đối. Nếu implement tách đợt: có thể giữ term cũ tạm, miễn
đã xong **7.0**.

### 7.4 ST / OVR trong rate (thay bonus tuyệt đối cũ)

Bonus `(ovr-60)×0.12` **bàn tuyệt đối per competition** — **gỡ**. OVR chỉ dịch `rate_g`
trong band 7.0.2. Tương tự CS: bỏ cộng hằng số lớn độc lập apps; gói vào `rate_cs(ovr,
prestige)`.

### 7.5 Player ↔ CLB / ĐTQG — sức kéo trên mọi competition (P11)

#### 7.5.1 Đã OK — League Standing

Giữ nguyên tinh thần hiện tại:

| Thành phần | Đánh giá SoT |
|---|---|
| Baseline CLB (`prestige` → `expectedPos`) | **Đúng** — CLB lớn kỳ vọng hạng cao hơn |
| Quán tính (`lastYearStanding` 30%) | **Đúng** — tránh nhảy cóc vô lý giữa các mùa |
| Sức kéo player (`diff = ovr − targetOvr`, `targetOvr = 55 + prestige×6`) | **Đúng real-world** — ngôi sao vượt tầm kéo CLB lên; dưới chuẩn kéo rủi ro xuống |
| `influenceFactor = min(1, apps/55)` | **Đúng ý đồ** (bench không cõng CLB) nhưng **lệch runtime**: standing quay **trước** sim apps → `yearSimResult` null → fallback `apps = 38` → factor ≈ 0.69 gần như cố định. Cần sửa khi implement (proxy: apps kỳ vọng từ OVR×threshold, hoặc apps mùa trước, hoặc quay standing sau ước lượng apps). |

Standing **không cần** position-specific cho sức kéo team (OVR đã là proxy đóng góp). Position vẫn quan trọng ở G/A/CS cá nhân sau đó (P8).

#### 7.5.2 Lệch SoT — Cup CLB & ĐTQG hiện tại

| Wheel | Hiện tại | Vấn đề |
|---|---|---|
| Domestic cup | Chỉ `clubPrestige` + `luckRating` | **Thiếu** OVR / sức kéo player — không real |
| Continental cup | Chỉ `clubPrestige` + `luck` | **Thiếu** tương tự |
| National call-up | Có OVR vs national tier mid; có nhánh `matchRating` | OVR OK; nhánh rating **chết** vì call-up chạy **trước** `simulatePlayerSeason` (`yearSimResult` còn null) |
| National tournament | Có OVR + luck (yếu) | Có ảnh hưởng player nhưng mỏng; cần thống nhất model với cup CLB |

`game-design.md` từng ghi cup weights gồm player OVR — **code chưa làm đúng** cho domestic/continental.

#### 7.5.3 Quyết định — Player phải ảnh hưởng mọi team competition

Real logic: một cầu thủ chủ lực (OVR cao, đá chính) làm **xác suất đi sâu cup / giải ĐTQG** lệch có kiểm soát — không phải quyết định 100%, nhưng không được “invisible” như hiện tại với cup CLB.

**Model thống nhất (SoT) cho pool outcomes team:**

```text
weight(outcome) =
    f_baseline(clubPrestige | nationalTier)
  + f_player(ovr − referenceLevel) × influenceProxy
  + f_luck(luckRating)
  [+ f_form(proxy) nếu có]
```

| Competition | `referenceLevel` | Baseline | Player term | Ghi chú |
|---|---|---|---|---|
| Domestic cup | `clubThreshold = 55 + prestige×6` | Prestige (giữ) | `diff = ovr − threshold` tăng weight Winner/RU/SF, giảm Early Exit | Ảnh hưởng **nhẹ hơn** standing (cup variance cao) — gợi ý hệ số ~0.5× standing |
| Continental | Cùng threshold CLB; có thể −3…−5 reference (khó hơn) | Prestige | Cùng hướng, biên độ nhỏ hơn domestic | Vòng bảng vẫn là outcome phổ biến với CLB mid |
| National call-up | `midOvr` theo tier (giữ 80/75/70) | Tier nation | Giữ OVR curve; **form** dùng proxy trước sim (vd standing tốt / OVR), không phụ thuộc `yearSimResult` mùa này | Sửa nhánh rating chết |
| National tournament | `midOvr` tier | Tier (+ luck) | Tăng rõ weight sâu bảng khi `ovr ≫ mid`; siêu sao có thể kéo ĐTQG yếu hơn kỳ vọng một chút | Vẫn không biến tier 3 thành favor vô địch WC chỉ vì 1 player |

**Influence proxy** (thay apps chưa có): dùng `expectedAppsRatio` từ cùng công thức apps (OVR vs threshold + prestige depth), map sang `[0.35, 1.0]` — cầu thủ dự bị kỳ vọng ít kéo team hơn ngôi sao chắc suất.

**Không** để player term át baseline: clamp — dù OVR 95, CLB prestige 1 vẫn không có P(Winner UCL) cao vô lý; dù OVR 99, ĐTQG tier 3 không thành favorite World Cup.

#### 7.5.4 Cascade vào kết quả **cá nhân** mùa giải (lý do bắt buộc P11)

```text
Player OVR / influence
        ↓
Cup / Continental / National wheel outcomes
        ↓
matchesAvailable (2–13 tùy vòng) + appsRatio
        ↓
apps_c → G/A/CS_c (sau fix 7.0) → per-comp rating
        ↓
weighted matchRating cả mùa → growth + Ballon/transfer hooks
```

Vì vậy thiếu sức kéo player trên cup/ĐTQG không chỉ sai narrative team — còn **làm lệch sample cá nhân**:

- Ít đi sâu cup → ít apps cup/continental → ít G/A tuyệt đối (đúng) nhưng cũng ít cơ hội mùa “lớn”.  
- Đi sâu nhờ prestige thuần trong khi player siêu sao / hoặc ngược lại player yếu mà CLB vẫn deep run → stats & rating **lệch role**.  
- Sau khi 7.0 sửa volume, chuỗi này càng phải đúng: outcome team đúng → apps đúng → G/A đúng → rating/growth đúng.

#### 7.5.5 Liên hệ standing bonus đã có

`standingResult` đã ảnh hưởng apps/rating cá nhân (`getStandingBonus`). Cùng tinh thần: **mọi** team outcome (cup/continental/national) đã ảnh hưởng số trận; SoT chỉ yêu cầu **đầu vào weight** của các wheel đó phản ánh player — phần sim apps phía sau giữ nguyên kiến trúc.

#### 7.5.6 Rủi ro balance (đọc cùng soft-cap)

Cho player kéo cup/ĐTQG → siêu sao dễ deep run hơn → thêm apps + G/A + rating → **cùng chiều inflation** nếu chưa có 7.0 + soft-cap. Implement P11 **sau hoặc cùng** 7.0; đo lại tier Xuất sắc trước khi khóa bảng count/magnitude.

### 7.6 Player ↔ chất lượng CLB — opportunity & recovery (chốt 2026-07-30)

> **Nguyên tắc:** trục chính là **tương quan OVR player vs chuẩn CLB** (`clubThreshold = 55 + prestige×6`), không phải “ít phút = cầu thủ tệ” một chiều.

#### 7.6.0 Real-world mapping (non-negotiable UX)

| Tình huống | Kỳ vọng game |
|---|---|
| Dưới chuẩn top club (vd Real) | Ít phút — **đúng** |
| Chuyển xuống CLB vừa tầm / yếu hơn (fit hơn) | **Nhiều phút hơn rõ** — recovery path |
| Đá đủ mẫu ở môi trường fit rồi form kém | Decrease / hậu quả form — **được phép nặng** |
| Ít phút vì underqualified ở CLB quá tầm | **Không** xử như mùa thất bại đầy đủ (nương decrease) |

**Cấm:** nới count/magnitude **tăng** để “cứu” debut (OP cũ).  
**Được:** chỉnh apps curve + nương **severity độ decrease** khi opportunity thấp.

#### 7.6.1 Apps ratio — curve theo fit (recovery)

Thay dải cũ (`diff < -10 → 0.25` phẳng) bằng:

| `diff = ovr − clubThreshold` | Prestige | `baseAppsRatio` (trước depth/standing/noise) |
|---|---|---|
| `diff ≤ -12` (deep bench) | 5 | ~0.22 |
| `diff ≤ -12` | 4 | ~0.30 |
| `diff ≤ -12` | ≤ 3 | ~0.38 |
| `-12 < diff < -2` | — | nội suy từ floor prestige → ~0.70 |
| `diff ≥ -2` (fit / overqualify nhẹ+) | — | ~0.70 … 0.90 theo diff |

- `squadDepthBonus` giữ / hơi mạnh hơn: `(5 - prestige) × 0.035` — CLB thấp ít ghế thay → dễ đá hơn khi đã gần chuẩn.  
- Standing bonus + noise nhỏ giữ như hiện tại.  
- **Cùng công thức** dùng cho sim mùa **và** `estimateAppsRatio` (influence proxy) — một nguồn sự thật.

**Kỳ vọng playtest:** OVR ~68 ở prestige 2–3 → league apps **thường ≥ ~24–30** (trên ~38 trận), không kẹt ≤20 như khi còn under Real.

#### 7.6.2 Decrease — nương khi opportunity thấp

`matchRating` tier Kém vẫn có thể xảy ra với sample nhỏ; **không** đổi định nghĩa tier. Đổi **độ độc** decrease:

```text
severity ∈ [0.30, 1.00]  // 1 = full SoT §4.2–4.3 decrease; 0.30 = gần như chỉ −1 nhẹ
severity = f(totalApps)   // apps ≤ 10 → 0.30; apps ≥ 24 → 1.00; nội suy giữa
```

Áp khi `direction = decrease`:

1. **Count:** blend pool hiện tại với pool nhẹ (`1/2/3 = 70/25/5`, tức tier Xuất sắc lúc giảm) theo `(1 - severity)`.  
2. **Magnitude:** blend pool mirror hiện tại với pool nhẹ (`kem` increase-shaped = biên độ nhỏ) theo `(1 - severity)`.  
3. **Gate decrease Yes (tuỳ):** khi `apps < 16`, nhân yes% × ~0.65 (ít bị đẩy vào nhánh giảm sau mùa thiếu phút) — vẫn giữ floor già §6 khi `progress ≥ old` (già + ít phút vẫn có thể suy).

Soft-cap **vẫn không** nén decrease khi apps cao — chỉ nương vì **thiếu opportunity**, không vì OVR cao.

#### 7.6.3 Map file

| Việc | File |
|---|---|
| `estimateAppsRatio` / curve fit | `features/wheel/lib/simulation-helpers.ts` |
| Sim mùa dùng cùng curve | `features/season/services/season-simulator.service.ts` |
| Decrease severity từ apps | `features/wheel/lib/growth-balance.ts` (+ preview/resolve truyền `yearSimResult.apps`) |

---

## 8. Kỳ vọng net growth / năm (guide tune)

Sau khi áp 4–7 (gồm fix G/A 7.0 + P11 khi có), kỳ vọng **rough** (median career, không phải hard rule trong code):

| Cửa sổ OVR | Net OVR / năm (median) | Ghi chú |
|---|---|---|
| Debut → 79 | **+1.0 … +2.0** | Xây dựng |
| 80 – 84 | **+0.4 … +1.0** | Chạm ngưỡng khá |
| 85 – 88 | **0 … +0.5** | Cần mùa xuất sắc để vào PRIME |
| 89 – 92 | **-0.2 … +0.3** | Plateau / micro-bump |
| 93+ | **≤ 0** hầu hết mùa | Hiếm khi còn lên |
| `progress ≥ old` | **-0.5 … -1.5** | Dốc cuối |

Nếu playtest median peak vẫn > 88 → siết tiếp magnitude/count hoặc soft-cap bands.
Nếu P99 không bao giờ chạm 96+ → nới nhẹ band 93–95 hoặc cho phép magnitude 7 hiếm
ở tier Xuất sắc khi `ovr < 93` và `progress` còn young/mid.

---

## 9. Map file khi implement (checklist)

| Thay đổi | File chính |
|---|---|
| **G/A/CS per-comp = apps × rate(position)** + sanity clamp | `features/season/services/season-simulator.service.ts` (có thể tách `lib/` pure helper) |
| Rating coefficients / overqualify / OVR-relative base | cùng season-simulator |
| **Player↔club fit apps curve + decrease opportunity softener (§7.6)** | `lib/club-fit.ts`, season-simulator, `growth-balance.ts` |
| **Player term trên domestic / continental / national pools** + influence proxy | `career-wheel-resolver.ts`, `useCareerWheelItems.ts` (preview = resolve); helper có thể đặt cạnh `getStandingWheelPool` |
| Sửa `influenceFactor` standing (proxy apps, không fallback 38 mù) | `getStandingWheelPool` callers +/hoặc ước lượng apps trước spin |
| Sửa call-up form (không phụ thuộc `yearSimResult` chưa có) | `career-wheel-resolver.ts` national_callup |
| Count / magnitude / gate pools | `features/wheel/lib/simulation-helpers.ts` |
| **Increase gate = Development Score (§4.4)** — progress×headroom × formMul × soft-cap; cấm double-count age ±10 | `features/wheel/lib/growth-balance.ts`, preview `useCareerWheelItems.ts` |
| Áp soft-cap + young boost cap (count/mag) | `growth-balance.ts`, resolver / preview |
| Decline floor khi già | `career-wheel-resolver.ts` (+ flow `useStatEvolutionFlow.ts` nếu đổi thứ tự gate) |
| Clamp 99 | giữ `stats-evolution.service.ts` |
| Docs game-design số liệu cũ | cập nhật `docs/game-design.md` sau khi code xong |

**Thứ tự implement đề xuất:** `7.0` → `7.5` / P11 → đo rating/peak thô → `4.x` count/mag + soft-cap `5` + decline `6` → rating `7.1–7.3` → **§4.4 Development Score** (tách UX debut khỏi form-only Yes; **không** nới count/mag). **Không** khóa số growth khi chưa có 7.0 (tránh over-nerf — xem 7.0.7).

**Scope cấm:** training / U-team / academy / loan bắt buộc chỉ để nuôi growth debut — out of scope; dùng proxy §4.4.1.

Invariant bắt buộc khi code:

- `Math.random` chỉ trong `spin-resolver`.  
- Preview UI (`useCareerWheelItems`) và resolve (`career-wheel-resolver`) **cùng một**
  công thức pool sau soft-cap.  
- OVR không tính ở client — vẫn qua `evolvePlayerStatsAction`.  
- G/A/CS/rating **không** tính/sửa ở client — chỉ hiển thị kết quả BE.  
- Mọi bảng rate/growth phải **nhánh theo `position`** (P8); thêm vị trí mới = cập nhật
  SoT + code cùng lúc.

---

## 10. Quan hệ với `core-growth-logic-review.md`

| Chủ đề | SoT nào thắng |
|---|---|
| Công thức OVR theo vị trí, main-stat, LM/RM, formation CDM/CM | **Review** |
| Height / weight debut | **Review** |
| Debut age pool 15–21 | **Review** |
| Count/magnitude domain & weights; “rating cao → tăng mạnh” không trần | **File này** |
| Mục tiêu rarity peak 99 / PRIME | **File này** |
| Soft-cap OVR, overqualify brake, decline già | **File này** |
| **Increase gate Development Score** (progress×headroom × form; không training/U) | **File này §4.4** |
| G/A/CS per competition realism (`apps × rate`), sanity clamp UI | **File này** |
| Bảng rate G/A/CS theo vị trí (sim mùa) | **File này** (bổ sung review — review không cover volume sim) |
| Client/server × latency/scale (§4b) | **systems-map** |

Khi agent/dev implement growth balance **hoặc** fix stats cup/continental: đọc **file này
trước**. Khi đụng position OVR formula / physique: đọc review.

---

## 11. Tiêu chí chấp nhận (Definition of Done — balance + sim UI)

Sau khi implement + chạy ≥ 30 careers thử (hoặc script Monte Carlo nếu có):

**Growth / peak**

- [ ] Median peak OVR nằm trong **82–85** (±1.5 chấp nhận được ở pass 1).  
- [ ] Tỉ lệ peak ≥ 99 **≤ 3%**.  
- [ ] Tỉ lệ peak ≥ 90 **≤ 15%**.  
- [ ] Đa số career có ≥ 2 mùa net OVR giảm ở 20% cuối `careerProgress`.  
- [ ] Count roll ≥ 4 ở tier Tốt xuất hiện **rõ ràng hiếm** hơn count 1–2 (quan sát log).  
- [ ] Magnitude ≥ 5 không phải outcome phổ biến ở tier Tốt.  
- [ ] Vẫn tồn tại ít nhất vài run playtest chạm 95–99 (không “nerf chết” fantasy ceiling).

**Season stats UI / per competition (7.0)**

- [ ] Với mọi competition có `apps ≤ 6`: không còn case `goals > apps` hoặc
      `goals + assists` vượt clamp 7.0.4.  
- [ ] Domestic cup / continental / national: G/A trung bình nhìn “hợp lý” theo vị trí
      (ST cup 4 apps ≈ 1–3 bàn, không phải 8–15).  
- [ ] League totals ST/CAM vẫn ra được mùa lớn (15–25+ G+A) khi đá chính + OVR cao —
      không bị nerf chết sau khi đổi sang `apps × rate`.  
- [ ] FE chỉ hiển thị số từ BE; không có nhánh client tự scale G/A.  
- [ ] Spot-check từng nhóm vị trí: GK/CB (CS), ST (G), CAM/winger (G+A), FB (A+CS).

**Player influence trên team competitions (7.5 / P11)**

- [ ] Domestic & continental: cùng prestige, OVR cao hơn threshold → P(deep run) tăng rõ
      so với OVR thấp (A/B log weights), nhưng không át baseline prestige.  
- [ ] National call-up: không còn phụ thuộc `yearSimResult.matchRating` mùa chưa sim;
      OVR vs tier vẫn là driver chính.  
- [ ] National tournament: OVR ≫ midTier lệch weight sâu bảng theo hướng đúng.  
- [ ] Deep run cup/ĐTQG → apps/G/A cá nhân tăng hợp lý (sau 7.0), có phản ánh trên
      `matchRating` mùa — chứng minh cascade team → individual.

**Increase gate — Development Score (§4.4)**

- [ ] Preview ≡ resolve cùng công thức; không còn age ±10 *cộng thêm* ngoài bảng base.  
- [ ] Cohort debut young + OVR≤75 + rating Trung bình: Yes quan sát **≥ ~45%** (mục tiêu bảng ~58% trước variance).  
- [ ] Cùng cohort rating Kém: Yes vẫn **≥ ~35%** (không về gần 0).  
- [ ] Median net OVR năm 1–2 vẫn trong **+1…+2** — không quay lại inflation OP.  
- [ ] Peak phân phối (§1.1) không xấu đi rõ so với sau soft-cap/count-mag (median vẫn ~82–85).  
- [ ] Không có training / U-team feature mới chỉ để nuôi gate.

---

## 12. Lịch sử quyết định

| Ngày | Thay đổi |
|---|---|
| 2026-07-30 | Tạo SoT: chẩn đoán feedback loop OVR↔apps↔G/A↔rating↔growth; target phân phối peak; redesign count/magnitude (thu hẹp weight 3–5 & biên độ lớn); soft-cap OVR; decline già; phanh overqualify + hạ hệ số rating; supersede balance C/F của review cũ. |
| 2026-07-30 | Bổ sung: nguyên tắc position-specific (P8); chẩn đoán bug G/A cup/continental/national (season-total × playFactor, bỏ qua `apps`, bonus OVR cộng dồn); SoT model `apps × rate(position)` + context competition + sanity clamp; BE-only (P9–P10); DoD UI stats; thứ tự implement ưu tiên 7.0. |
| 2026-07-30 | Làm rõ cascade: fix G/A ngoài league = đổi input `matchRating` → growth tier → OVR (7.0.7); cấm tune growth pools trước khi 7.0 ổn định (tránh over-nerf). |
| 2026-07-30 | §7.5 / P11: xác nhận standing (baseline + quán tính + sức kéo) đúng hướng; domestic/continental phải có player term (hiện thiếu); ĐTQG thống nhất & sửa call-up form chết; cascade team outcome → apps/G/A/rating cá nhân; note `influenceFactor` fallback apps=38. |
| 2026-07-30 | Liên kết `docs/core-game-logic-systems-map.md` — audit toàn cục interconnection; nguyên tắc “không có logic độc lập chỉ hiển thị”. |
| 2026-07-30 | **Ship 7.0:** `lib/season-stat-rates.ts` + `rollCompetitionOutput` trong season-simulator; bỏ season-total×playFactor / ST bonus per-comp; rating G/A & CS coefficients hạ nhẹ (1.8 / 2.2). Pass 0 integrity (O8/O9/O11) ship cùng. **Chưa:** P11 player term cup weights, soft-cap/decline/count pools. |
| 2026-07-30 | **Ship full balance pass:** P11 cup/continental/national player pull + influence proxy; standing apps proxy; call-up form via standing; §4 gate/count/mag pools; soft-cap + decline floor; §7.1/7.3 rating. File mới: `features/wheel/lib/growth-balance.ts`. |
| 2026-07-30 | **Chốt giấy §4.4 Development Score:** increase Yes = progress×headroom base × formMul × soft-cap; form không còn gần-100% input; cấm training/U scope; cấm nới count/mag; DoD cohort debut; supersede base-Yes-theo-tier-rating + age±10. |
| 2026-07-30 | **Ship §4.4:** `getEffectiveIncreaseGate` trong `growth-balance.ts` — DevelopmentBase × FormMultiplier × clamp(8–82) × soft-cap; bỏ age±10 trên increase; preview≡resolve. |
| 2026-07-30 | **§7.6 chốt + ship:** player↔club fit — `lib/club-fit.ts` apps recovery khi xuống CLB vừa tầm; decrease severity/gate nương khi `apps` thấp (không nới increase OP). |
