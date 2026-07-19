# Ballon d'Or Wheel Feature — Plan

> Trạng thái: ĐANG THIẾT KẾ — chưa implement

---

## Mục tiêu

Thay thế logic Ballon d'Or boolean đơn giản hiện tại bằng một mini-flow wheel riêng biệt, xuất hiện sau `season_stats` và trước OVR evolution wheels. Gồm 2 vòng quay tuần tự:

1. **Wheel 1 — Đề cử Top 10**: Có được xướng tên không? (Yes / No)
2. **Wheel 2 — Xếp hạng**: Nếu có → thuộc top mấy? (1–10)

Kết quả rank #1 = đoạt Ballon d'Or. Rank #2–#10 = ghi nhận thành tích đề cử.

---

## Điều kiện thay đổi so với hiện tại

| | Hiện tại | Sau feature |
|---|---|---|
| Logic | `ovr >= 85 && rating >= 7.80 && random < 0.35` | Server trả về eligibility score → client spin wheels |
| Kết quả | `hasBallonDorWinner: boolean` | `ballonDorRank: number \| null` (1 = winner, 2–10 = nominee) |
| UX | Silent trigger trong modal | Substep riêng với 2 vòng quay có drama |
| Thành tích lưu | Chỉ count QBV | Lưu cả rank (nominee cũng có giá trị) |

---

## Career Flow mới

```
season_stats modal đóng
  ↓
[Check: server đã trả về ballonDorEligible = true?]
  │
  ├── Không đủ điều kiện → dir_increase (flow cũ)
  │
  └── Đủ điều kiện → "ballon_dor_nomination" (Wheel 1: Yes/No)
        │
        ├── No → thông báo ngắn → dir_increase
        │
        └── Yes → "ballon_dor_ranking" (Wheel 2: #1–#10)
              │
              ├── Rank #1 → hiển thị QBV celebration → dir_increase
              └── Rank #2–#10 → hiển thị nominee badge → dir_increase
```

**Substep mới thêm vào union type:**
```ts
| "ballon_dor_nomination"   // Wheel 1: Yes/No
| "ballon_dor_ranking"      // Wheel 2: #1–#10
```

---

## Phần 1 — Server: Eligibility & Weights

### 1.1 eligibilityScore — Score-based, gate = 75

Trigger wheel khi **eligibilityScore ≥ 75** (top 10 thế giới — ngưỡng cực kỳ cao).

> **Nguyên tắc cốt lõi (từ research thực tế):** Goals/G+A **không tính vào eligibilityScore**. Bàn thắng không có "giá trị tập thể" nên không thể compensate cho việc thiếu trophy. Goals chỉ tác động vào `rankScore` ở Wheel 2 (sau khi đã được đề cử).

**Individual score** (chỉ OVR + Rating):

| Yếu tố | Điểm |
|---|---|
| OVR 88–89 | +10 |
| OVR 90–92 | +20 |
| OVR 93–95 | +35 |
| OVR 96+ | +45 |
| Rating 7.80–7.99 | +10 |
| Rating 8.00–8.29 | +20 |
| Rating 8.30+ | +30 |

**Trophy score** (không mandatory, nhưng thực tế gần như bắt buộc để đủ điểm):

| Trophy | Điểm |
|---|---|
| Champions League / World Cup winner | +40 |
| Copa America / AFCON / Euro winner | +25 |
| Top league title (club prestige 4–5) | +20 |
| League title (prestige 3) | +10 |
| Domestic cup winner | +5 |

**Position modifier:**

| Vị trí | Modifier |
|---|---|
| ST / LW / RW / CAM | 0 (baseline) |
| CM / CDM / LB / RB | −20 |
| CB | −25 |
| GK | −30 |

**Ví dụ kiểm chứng:**

| Scenario | Tính | Score | Trigger (≥75)? |
|---|---|---|---|
| ST OVR 90, rating 8.00, không trophy | 20+20 | 40 | ✗ |
| ST OVR 90, rating 8.00, CL winner | 20+20+40 | 80 | ✓ |
| ST OVR 93, rating 8.30, 30 bàn, không trophy | 35+30 | 65 | ✗ — goals không tính |
| ST OVR 93, rating 8.30, league title prestige 4 | 35+30+20 | 85 | ✓ |
| ST OVR 96, rating 8.30, không trophy | 45+30 | 75 | ✓ — đẳng cấp tuyệt đối hiếm gặp |
| CB OVR 93, rating 8.30, CL winner | 35+30+40−25 | 80 | ✓ |
| CB OVR 93, rating 8.30, league title prestige 4 | 35+30+20−25 | 60 | ✗ |
| CB OVR 96, rating 8.30, CL winner | 45+30+40−25 | 90 | ✓ — Cannavaro-level |
| GK OVR 93, rating 8.30, CL winner | 35+30+40−30 | 75 | ✓ — vừa đủ |
| GK OVR 90, rating 8.30, CL winner | 20+30+40−30 | 60 | ✗ |

→ Thực tế: attacker cần CL/World Cup hoặc top league title để trigger, trừ khi OVR 96+ (siêu hiếm). Defender/GK cần CL/World Cup + OVR 93+ mới vào được.

Nếu không đủ → `ballonDorEligible = false`, flow không trigger.

### 1.2 nominationWeight — Xác suất Yes trong Wheel 1

`eligibilityScore` và `nominationWeight` là **2 số khác nhau, phục vụ 2 mục đích khác nhau**:
- `eligibilityScore` → gate kiểm tra có trigger wheel không
- `nominationWeight` → % xác suất "Yes — được đề cử" trong Wheel 1

Convert score sang probability:

| eligibilityScore | nominationWeight (% Yes) |
|---|---|
| 75–84 | 20% |
| 85–94 | 35% |
| 95–104 | 55% |
| 105–114 | 70% |
| 115+ | 82% |

Cap: tối đa 85%, tối thiểu 10%.

**Ví dụ:** ST OVR 93, rating 8.30, CL winner → eligibilityScore = 35+30+40 = **105** → nominationWeight = **70%**.

Server trả về `nominationWeight: number` để client dùng build Wheel 1 pool.

### 1.3 rankScore — Weight cho Wheel 2 (#1–#10)

Chỉ chạy khi Wheel 1 = Yes. **Goals/assists được tính ở đây** — sau khi đã được đề cử, số bàn thắng phân biệt rank trong top 10.

```
rankScore = (ovr - 88) * 2 + (rating - 7.80) * 20 + trophyBonus + goalBonus
```

| Trophy | trophyBonus |
|---|---|
| World Cup winner | +35 |
| Champions League winner | +30 |
| Copa America / AFCON / Euro winner | +20 |
| Top league title (prestige 4–5) | +15 |
| League title (prestige 3) | +8 |

| Goals (attacker) | goalBonus |
|---|---|
| 20–29 bàn | +10 |
| 30+ bàn | +20 |

Bảng weight mẫu theo rankScore:

| rankScore | #1 | #2 | #3 | #4–5 | #6–10 |
|---|---|---|---|---|---|
| < 10 | 3% | 7% | 10% | 20% | 60% |
| 10–20 | 8% | 12% | 15% | 25% | 40% |
| 20–30 | 15% | 18% | 17% | 25% | 25% |
| > 30 | 25% | 22% | 18% | 20% | 15% |

Server trả về `rankWeights: number[]` (10 phần tử, index 0 = rank #1).

---

## Phần 2 — Client: State & Wheels

### 2.1 State mới cần thêm

```ts
// Trong useDraftDrum
const [ballonDorEligible, setBallonDorEligible] = useState(false);
const [ballonDorNominationWeight, setBallonDorNominationWeight] = useState(0);
const [ballonDorRankWeights, setBallonDorRankWeights] = useState<number[]>([]);
const [ballonDorRank, setBallonDorRank] = useState<number | null>(null);
```

### 2.2 Trigger point

Khi `handleSeasonStatsModalClose()` được gọi:
- Nếu `ballonDorEligible = true` → set `careerSubStep = "ballon_dor_nomination"`
- Nếu không → set `careerSubStep = "dir_increase"` (giữ nguyên flow cũ)

### 2.3 Wheel 1 — "ballon_dor_nomination"

Pool:
```ts
[
  { value: "yes", label: "CÓ — ĐƯỢC ĐỀ CỬ!", weight: nominationWeight },
  { value: "no",  label: "KHÔNG — Năm này chưa được", weight: 100 - nominationWeight },
]
```

Sau spin:
- `"yes"` → set substep `"ballon_dor_ranking"`
- `"no"` → set substep `"dir_increase"`, hiển thị `careerTempValue` ngắn

### 2.4 Wheel 2 — "ballon_dor_ranking"

Pool (10 items):
```ts
[
  { value: 1,  label: "🏅 HẠNG #1 — BALLON D'OR!", weight: rankWeights[0] },
  { value: 2,  label: "Hạng #2",  weight: rankWeights[1] },
  ...
  { value: 10, label: "Hạng #10", weight: rankWeights[9] },
]
```

Sau spin:
- Set `ballonDorRank = result`
- Nếu rank = 1 → `hasBallonDorWinner = true`
- Chuyển sang `"ballon_dor_result"` (substep trung gian hiển thị kết quả) → sau đó `dir_increase`

---

## Phần 3 — Server Action thay đổi

### 3.1 `simulatePlayerSeasonAction` — thay đổi return

Bỏ `hasBallonDorWinner: boolean` ra khỏi `SimulatedSeasonResult`.

Thêm vào:
```ts
ballonDorEligible: boolean;
nominationWeight: number;      // chỉ có nếu eligible = true
rankWeights: number[];          // 10 phần tử, chỉ có nếu eligible = true
```

### 3.2 Không còn random Ballon d'Or trong service

`resolveRandom()` cho Ballon d'Or bị **xóa khỏi** `season-simulator.service.ts`. Toàn bộ randomness chuyển sang client wheels (vẫn tuân thủ invariant: `Math.random()` chỉ qua `spin-resolver`).

---

## Phần 4 — UI / UX

### 4.1 CareerActionsPanel — label mới

```ts
{careerSubStep === "ballon_dor_nomination" && "🏅 Ballon d'Or: Được đề cử Top 10?"}
{careerSubStep === "ballon_dor_ranking"    && "🏅 Ballon d'Or: Xếp hạng Top 10"}
```

### 4.2 SeasonStatsModal

Bỏ phần hiển thị `hasBallonDorWinner` ra khỏi modal (vì chưa biết kết quả). Thay bằng text "Kiểm tra đề cử Ballon d'Or..." nếu `ballonDorEligible = true`.

### 4.3 Celebration sau Wheel 2

Khi rank = 1 → hiển thị animation/highlight đặc biệt trên `careerTempValue`. Có thể thêm 1 substep `"ballon_dor_result"` chỉ để hiển thị kết quả với button "TIẾP TỤC" trước khi vào OVR wheels.

---

## Phần 5 — Achievements / Lưu trữ

Cần lưu thêm vào `achievements`:

```ts
interface BallonDorEntry {
  rank: number;   // 1 = winner, 2–10 = nominee
  age: number;
  season: string;
}

// Trong achievements object
ballonDorHistory: BallonDorEntry[];  // thay cho ballonDor: number (count)
```

`ballonDor` count giữ nguyên (đếm số lần rank = 1), thêm `ballonDorNominations` count.

---

## Files cần thay đổi

| File | Thay đổi |
|---|---|
| `features/season/services/season-simulator.service.ts` | Bỏ random QBV, thêm `ballonDorEligible` + `nominationWeight` + `rankWeights` |
| `actions/season.actions.ts` | Cập nhật Zod schema + return type |
| `types/game.ts` | Thêm `BallonDorEntry`, cập nhật `achievements` type |
| `features/wheel/hooks/useDraftDrum.ts` | Thêm 4 state mới, logic trigger, 2 substep handlers |
| `features/wheel/hooks/useCareerWheelItems.ts` | Thêm 2 case mới cho `ballon_dor_nomination` + `ballon_dor_ranking` |
| `features/wheel/lib/career-wheel-resolver.ts` | Thêm 2 case mới |
| `features/wheel/components/CareerActionsPanel.tsx` | Thêm label 2 substep mới |
| `features/wheel/hooks/useCareerStats.ts` | Cập nhật `handleNextSeason` nhận `ballonDorRank` thay `hasBallonDorWinner` |

---

## Open Questions

1. **Substep `"ballon_dor_result"`**: Có cần substep riêng để hiển thị kết quả (đặc biệt khi rank = 1) hay chỉ dùng `careerTempValue` là đủ?
2. **Nominee badge**: Top 2–10 có cần hiển thị gì đặc biệt trong SeasonProfile / SeasonStatsModal không?
3. **Hiển thị trong RetiredStage**: Career summary có nên show `ballonDorNominations` bên cạnh số QBV đoạt được không?
4. **Reset state**: `ballonDorRank` có cần reset trong `resetSeasonState()` không?
