# Season Profile — Modal Redesign Plan

> Tạo ngày: 2026-07-14
> Trạng thái: THIẾT KẾ HOÀN CHỈNH — SẴN SÀNG IMPLEMENT

---

## Vấn đề hiện tại

1. **Stats phi logic** — stats được gen ngay đầu mùa, trước tất cả wheel spins. Outcomes (standing, cups) không ảnh hưởng gì đến stats của player.
2. **Stats bar hiện `-`** trong suốt quá trình spin.
3. **4 dropdown** khi expand đẩy layout xuống → layout rối.
4. **seasonRecords không persist** — mất khi resume career.

---

## Quyết định đã thống nhất

| # | Quyết định |
|---|---|
| 1 | Bỏ stats bar khỏi cột giữa |
| 2 | Thay 4 dropdown bằng 4 status row tĩnh (không expand inline) |
| 3 | Modal trigger: auto-open sau mỗi wheel spin + user có thể click mở lại |
| 4 | Modal vị trí: center screen overlay |
| 5 | Modal content: tên giải đúng + kết quả + **stats của riêng giải đó từ server** |
| 6 | Giữ dropdown chọn mùa để xem lại lịch sử |
| 7 | **seasonRecords phải persist vào DB** — không được mất khi resume |
| 8 | **Stats gen SAU standing/cups/national, TRƯỚC OVR wheels** |
| 9 | **High impact**: outcomes ảnh hưởng trực tiếp và có trọng lượng lên stats |
| 10 | **Server trả về stats chia theo từng giải** — FE không tự tính |

---

## Flow mùa giải mới

```
[BẮT ĐẦU MÙA GIẢI]
       │
       ▼
  STANDING spin
       │
       ▼
  DOMESTIC CUP spin
       │
       ▼
  CONTINENTAL CUP spin (nếu có)
       │
       ▼
  NATIONAL CALLUP spin (năm chẵn)
       │
       ▼
  NATIONAL TOURNAMENT spin (nếu được gọi)
       │
       ▼
  ── GỌI simulatePlayerSeasonAction(outcomes) ──
  Truyền vào: standingResult, domesticCupResult,
  continentalCupResult, nationalCallupResult,
  nationalTournamentResult
       │
       ▼
  [SEASON STATS MODAL auto-open]
  Hiện toàn bộ stats + awards cá nhân
       │  user đóng modal
       ▼
  OVR EVOLUTION wheels (dir_increase → count → selector → magnitude)
       │
       ▼
  TRANSFER check
       │
       ▼
  [SANG MÙA MỚI]
```

**Lý do ordering này đúng**: OVR evolution wheels thể hiện player phát triển/tụt lùi dựa trên phong độ mùa vừa rồi. Phải biết phong độ (stats) trước mới spin OVR wheels có nghĩa.

---

## Logic fix: Stats generation

### SimulatedSeasonResult mới

```ts
export interface CompetitionStats {
  apps: number;
  goals: number;
  assists: number;
  cleanSheets?: number;
  rating?: number;
}

export interface SimulatedSeasonResult {
  // Tổng toàn mùa (để backward compat với statsTimeline)
  apps: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  matchRating: number;
  hasBallonDorWinner: boolean;
  events: { type: string; label: string }[];

  // Chia theo giải — server tính, FE chỉ hiển thị
  leagueStats: CompetitionStats;
  domesticCupStats: CompetitionStats;
  continentalStats?: CompetitionStats;
  nationalStats?: CompetitionStats;
}
```

### Input mới cho simulatePlayerSeasonService

```ts
export interface PlayerSeasonInput {
  // ... existing fields
  // NEW: outcomes để stats reflect thực tế
  standingResult?: number | null;         // 1 = vô địch, 18 = xuống hạng
  domesticCupResult?: string | null;      // "Winner" | "Runner-Up" | "Semi-Finals" | "Early Exit"
  continentalCupResult?: string | null;
  nationalCallupResult?: string | null;   // "called_up" | "not_called"
  nationalTournamentResult?: string | null;
}
```

### High impact logic

| Outcome | Ảnh hưởng lên stats |
|---|---|
| `standingResult === 1` | `appsRatio += 0.10`, `matchRating += 0.20` |
| `standingResult <= 4` | `appsRatio += 0.05`, `matchRating += 0.10` |
| `standingResult >= 16` | `appsRatio -= 0.10`, `matchRating -= 0.15` |
| `domesticCupResult === "Winner"` | +6 matches vào `domesticCupMatches`, goals/assists scale theo |
| `domesticCupResult === "Runner-Up"` | +5 matches |
| `domesticCupResult === "Semi-Finals"` | +4 matches |
| `continentalCupResult === "Winner"` | +13 matches vào `continentalMatches` |
| `continentalCupResult === "Runner-Up"` | +12 matches |
| `nationalTournamentResult === "Winner"` | +7 matches vào `nationalMatches` |
| `nationalTournamentResult === "Runner-Up"` | +6 matches |

Stats từng giải được tính tỉ lệ theo số trận của giải đó so với tổng (`leagueMatches / maxSeasonMatches`).

---

## DB persistence: seasonHistory

### Schema change

```prisma
model CareerPlayer {
  // ... existing fields
  seasonHistory Json @default("{}") // Record<number, SeasonRecord>
}
```

### Save/Load

- **Save**: `updateSeasonProgressAction` thêm `seasonHistory` parameter — gọi sau mỗi mùa (background save)
- **Load**: `getCareerPlayerAction` select thêm `seasonHistory` → restore `seasonRecords` state khi resume
- **Type**: `seasonHistory` = `Record<age, SeasonRecord>` — cùng structure với in-memory state hiện tại

---

## Kiến trúc UI

### Cột giữa mới (SeasonProfile)

```
╔══════════════════════════════╗
║ 🗓 HỒ SƠ MÙA GIẢI           ║
║ [Dropdown: MÙA 2040/41 ★]   ║
║ ─────────────────────────── ║
║ CLB: TOTTENHAM HOTSPUR       ║
║      Premier League          ║
║ ─────────────────────────── ║
║ 🏆 Premier League  Hạng #7 [>]║
║ 🛡️ FA Cup          Bán kết  [>]║
║ 🌍 UEFA CL         Vòng bảng[>]║
║ 🌎 FIFA World Cup  Á quân   [>]║
╚══════════════════════════════╝
```

- Row chưa có kết quả: mờ, không có `[>]`
- Row đã có kết quả: đậm + nút `[>]`
- Row không tham gia: ẩn hoặc mờ hoàn toàn

### Competition Result Modal (Loại A)

Auto-open sau mỗi wheel spin, click `[>]` để mở lại:

```
╔══════════════════════════════════╗
║ 🏆 PREMIER LEAGUE — MÙA 2040/41 ║
║ ─────────────────────────────── ║
║ KẾT QUẢ: HẠNG #7                ║
║                                  ║
║ THỐNG KÊ LEAGUE                  ║
║ APPS  GOALS  ASSISTS  RATING     ║
║  32     12      8      7.45      ║
║ ─────────────────────────────── ║
║ BẢNG XẾP HẠNG                   ║
║  1. Manchester City   94 pts     ║
║  2. Arsenal           88 pts     ║
║  ...                             ║
║  7. Tottenham         64 pts ◄   ║
╚══════════════════════════════════╝
```

### Season Stats Modal (Loại B)

Auto-open sau khi `simulatePlayerSeasonAction` resolve (giữa national và OVR wheels):

```
╔══════════════════════════════════╗
║ 📊 THỐNG KÊ MÙA 2040/41         ║
║ ─────────────────────────────── ║
║ TỔNG MÙA GIẢI                   ║
║ APPS  GOALS  ASSISTS  RATING     ║
║  47     18      12     7.52      ║
║ ─────────────────────────────── ║
║ 🏆 Premier League (32 apps)      ║
║ 🛡️ FA Cup (9 apps · 4G 2A)       ║
║ 🌍 UEFA CL (6 apps · vòng bảng)  ║
║ ─────────────────────────────── ║
║ 🥇 Đoạt chiếc giày vàng CLB (18) ║
║ ⭐ Vào đội hình tiêu biểu        ║
╚══════════════════════════════════╝
```

---

## Tên giải

| League | Cup QG |
|---|---|
| Premier League | FA Cup |
| La Liga | Copa del Rey |
| Serie A | Coppa Italia |
| Bundesliga | DFB-Pokal |
| Ligue 1 | Coupe de France |

Continental: `getContinentalCupLabel(currentContinentalCup)` — đã có sẵn.
National: World Cup năm chia 4, continental cup năm lẻ — `getNationalContinentalCup(nationality)`.

---

## Modal state management

```ts
type ModalType = "league" | "cup" | "continental" | "national" | "season_stats" | null;

// Trong useDraftDrum
const [activeModal, setActiveModal] = useState<ModalType>(null);
```

Auto-open triggers:
- Sau `generateLeagueTableAction` resolve → `setActiveModal("league")`
- Sau `generateCupJourneyAction` (domestic) resolve → `setActiveModal("cup")`
- Sau `generateCupJourneyAction` (continental) resolve → `setActiveModal("continental")`
- Sau `generateCupJourneyAction` (national) resolve → `setActiveModal("national")`
- Sau `simulatePlayerSeasonAction` resolve (trước OVR wheels) → `setActiveModal("season_stats")`

Manual trigger: click `[>]` → `setActiveModal(type)`

**Quan trọng**: Khi `activeModal !== null`, OVR wheel spin bị block cho đến khi user đóng `season_stats` modal.

---

## Substep mới trong useDraftDrum

Thêm substep `"season_stats"` sau national, trước `"dir_increase"`:

```ts
type CareerSubStep =
  | "idle" | "standing" | "domestic_cup" | "continental_cup"
  | "national_callup" | "national_tournament"
  | "season_stats"   // ← MỚI: chờ simulatePlayerSeasonAction + show modal
  | "dir_increase" | "dir_decrease" | "count" | "selector" | "magnitude"
  | "transfer" | "resolved";
```

Transition: sau `national_tournament` (hoặc `national_callup` nếu không được gọi) → `"season_stats"` → gọi `simulatePlayerSeasonAction` với đủ outcomes → set `yearSimResult` → `setActiveModal("season_stats")` → user đóng modal → `"dir_increase"`.

---

## Files cần thay đổi

| File | Thay đổi |
|---|---|
| `prisma/schema.prisma` | Thêm `seasonHistory Json @default("{}")` |
| `actions/player.actions.ts` | Select thêm `seasonHistory` trong `getCareerPlayerAction` |
| `actions/season.actions.ts` | `updateSeasonProgressAction` thêm `seasonHistory`; `simulatePlayerSeasonAction` thêm outcome params |
| `features/season/services/season-simulator.service.ts` | Nhận outcomes, tính high-impact stats, trả về stats per-competition |
| `features/wheel/hooks/useCareerStats.ts` | Bỏ 4 boolean open states; load `seasonHistory` khi resume; `applySimResultToRecords` ghi cả per-competition stats |
| `features/wheel/hooks/useDraftDrum.ts` | Bỏ `isLeagueOpen/...`; thêm `activeModal`; thêm substep `season_stats`; move `simulatePlayerSeasonAction` call sang transition `season_stats` |
| `features/wheel/components/SeasonProfile.tsx` | Rewrite — 4 status row + dropdown + `onOpenModal` prop |
| `features/wheel/components/SeasonResultModal.tsx` | Tạo mới — Competition modal với per-competition stats |
| `features/wheel/components/SeasonStatsModal.tsx` | Tạo mới — Season Stats modal (tổng + per-comp + awards) |
| `features/wheel/components/DraftDrumScreen.tsx` | Render 2 modal components; truyền `activeModal` + `setActiveModal` |

---

## Thứ tự implement

1. `prisma/schema.prisma` — thêm `seasonHistory` + migration
2. `season-simulator.service.ts` — thêm outcome params + per-competition stats
3. `actions/season.actions.ts` — update `simulatePlayerSeasonAction` signature + `updateSeasonProgressAction`
4. `actions/player.actions.ts` — update `getCareerPlayerAction` select
5. `useCareerStats.ts` — bỏ open states, update `applySimResultToRecords`, load `seasonHistory`
6. `useDraftDrum.ts` — move sim call, thêm `season_stats` substep, thêm `activeModal`
7. `SeasonProfile.tsx` — rewrite UI
8. `SeasonResultModal.tsx` — tạo mới
9. `SeasonStatsModal.tsx` — tạo mới
10. `DraftDrumScreen.tsx` — wire modals
