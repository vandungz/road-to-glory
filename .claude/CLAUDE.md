# Football Life — Claude Code Project Guide

> Đọc file này trước khi làm bất kỳ thay đổi nào. Đây là nguồn sự thật duy nhất cho AI agent.

---

## Dự án là gì

**Football Life / Road to Glory** — Web game mô phỏng sự nghiệp cầu thủ bóng đá bằng vòng quay có trọng số (weighted wheel). Không có match engine, không có gameplay trực tiếp. Core loop: Spin Wheel → Nhận outcome → Career state thay đổi → Lặp lại.

Stack: Next.js 15 App Router · TypeScript strict · Prisma 7 · PostgreSQL · Zustand · Framer Motion · Vercel

---

## Trạng thái hiện tại (DEV PHASE)

**Auth tạm thời bị tắt** — đang tập trung vào business logic. Server Actions KHÔNG có `auth()` check. Đây là cố ý, không phải bug. Sẽ bật lại khi logic game ổn định.

Khi thấy `// TODO: auth` hoặc thiếu auth check → KHÔNG tự thêm vào, để yên.

---

## Cấu trúc thực tế (đã implement)

```
app/
  (game)/
    page.tsx                    ← Lobby — Server Component, list game sessions
    layout.tsx
    [gameId]/
      page.tsx                  ← Squad Board — Server Component
      draft/[slotIndex]/page.tsx ← Draft Wheel — Server Component, pass data xuống DraftDrumScreen

actions/
  player.actions.ts             ← saveCareerPlayer, updateCareerPlayer
  season.actions.ts             ← simulatePlayerSeasonAction, generateLeagueTableAction,
                                   startPlayerCareerAction, generateTransferOfferAction,
                                   generateCupJourneyAction, evolvePlayerStatsAction,
                                   saveSeasonProgress, completeGameSession

features/
  career/services/career-setup.service.ts
  player/components/PlayerCareerDialog.tsx, PlayerOvrChart.tsx, PlayerStickerCard.tsx
  player/services/stats-evolution.service.ts
  season/services/cup-journey.service.ts, season-simulator.service.ts, table-simulator.service.ts
  squad/components/SquadDashboard.tsx, PitchBoard.tsx
  transfer/services/transfer.service.ts
  wheel/
    components/DraftDrumScreen.tsx, CareerActionsPanel.tsx, SeasonProfile.tsx,
                PaniniSticker.tsx, TimelineHistory.tsx, RetiredStage.tsx,
                SetupStage.tsx, SpinnerWheel.tsx
    hooks/useDraftDrum.ts, useCareerStats.ts, useCareerWheelItems.ts, useSetupStage.ts,
          useCompetitionFlow.ts, useStatEvolutionFlow.ts
    lib/career-wheel-resolver.ts, simulation-helpers.ts
    stores/useWheelUiStore.ts

lib/
  simulation-engine/match-simulator.ts   ← DEAD CODE, không import ở đâu
  wheel-engine/spin-resolver.ts          ← resolveWeightedOutcome() — Math.random() CHỈ Ở ĐÂY
  wheel-engine/weight-calculator.ts      ← pools, weights, OVR formula
  name-gen.ts
  prisma.ts

types/
  game.ts                       ← GameSession, SeasonRecord, STEP_LABELS, Zod schemas
  squad.ts                      ← SlotConfig, FORMATION_SLOTS, ClientSafePlayer, FLAG_MAP, RARITY_ACCENT

prisma/schema.prisma            ← GameSession, CareerPlayer, League, Club
```

---

## Invariants — KHÔNG ĐƯỢC VI PHẠM

### 1. Math.random() chỉ trong spin-resolver

```ts
// ✅ CHỈ ở lib/wheel-engine/spin-resolver.ts
export function resolveWeightedOutcome<T>(items: WeightedItem<T>[]): T { ... }

// ❌ CẤM ở bất kỳ file nào khác
const luck = Math.random() * 20;  // career-setup.service.ts — PHẢI SỬA
```

Lý do: để có thể mock `Math.random()` trong test và debug deterministic.

### 2. hiddenStats không bao giờ đến client

```ts
// ❌ CẤM
return { ...player, hiddenStats: player.hiddenStats };

// ✅ Chỉ server biết
const player = await prisma.careerPlayer.findUnique({
  select: { id: true, name: true, /* hiddenStats: false */ }
});
```

### 3. Server Action phải validate input bằng Zod

```ts
// ✅ Luôn luôn
export async function myAction(input: unknown) {
  const validated = mySchema.parse(input); // ← bắt buộc, input: unknown
  return myService(validated);
}
```

### 4. OVR không được tính ở client

Sau khi stats thay đổi, gọi `evolvePlayerStatsAction` để BE tính lại OVR. Client không được tự tính.

### 5. lib/ không import React/Next.js/Prisma

```ts
// ❌ lib/wheel-engine/weight-calculator.ts
import { useState } from "react";  // CẤM

// ✅ lib/ chỉ được dùng pure TypeScript
```

### 6. Mỗi file không quá 500 lines

Nếu vượt → split ngay thành hooks, sub-components, hoặc helper functions.

### 7. currentClub và currentContinentalCup PHẢI đổi cùng nhau

Vé cúp châu lục thuộc về CLB, không thuộc về cầu thủ. Khi cầu thủ đổi CLB (transfer,
start career, hay bất kỳ chỗ nào set `currentClub` trong tương lai), `currentContinentalCup`
BẮT BUỘC phải được set lại theo `continentalType` của CLB mới trong CÙNG một lần update —
không set riêng lẻ ở 2 chỗ khác nhau.

```ts
// ✅ features/wheel/hooks/useCareerStats.ts — luôn dùng hàm này khi đổi club
function setClubAndContinental(club: { ...; continentalType: string }) {
  setCurrentClub(club);
  setCurrentContinentalCup(club.continentalType ?? "none");
}

// ❌ CẤM — set currentClub mà không sync currentContinentalCup
setCurrentClub({ ...transferOffer, continentalType: fullClub?.continentalType });
// → currentContinentalCup giữ nguyên giá trị CLB CŨ, gây bug: cầu thủ chuyển
//   sang Bundesliga nhưng wheel vẫn quay AFC Champions League của CLB J1 cũ.
```

Lý do phải ghi rõ thành invariant: state này bị đọc ở 6+ nơi khác nhau
(`useCareerStats.ts`, `useCompetitionFlow.ts`, `useCareerWheelItems.ts`,
`career-wheel-resolver.ts`, và vài component hiển thị UI) mà không có single
source of truth / reducer nào enforce, nên rất dễ tái phát nếu có thêm một
chỗ set `currentClub` trực tiếp mà quên sync theo.

Ngoại lệ: cập nhật `currentContinentalCup` cuối mùa dựa trên
`calculateContinentalQualification` (đứng hạng bao nhiêu → vé mùa sau) là hợp lệ
và KHÔNG đi qua `setClubAndContinental`, vì đó là cùng một CLB, không phải đổi CLB.

**Bẫy liên quan (đã fix, xem `handleNextSeason` trong `useCareerStats.ts`)**: nếu
cầu thủ ACCEPT TRANSFER trong lúc off-season rồi mới bấm "mùa giải tiếp theo",
`currentClub` đã đổi sang CLB mới TRƯỚC KHI `handleNextSeason` chạy — nhưng
`actualStint` (CLB vừa thi đấu mùa đó) vẫn là CLB CŨ. Nếu code cứ vô điều kiện gọi
`calculateContinentalQualification(actualStintLeagueId, standingResult, ...)` rồi
`setCurrentContinentalCup(...)`, nó sẽ **ghi đè** giá trị đúng (CLB mới) bằng vé kiếm
được ở CLB cũ — tái phát đúng loại bug ở trên nhưng qua đường khác. Luôn so sánh
`actualStint.clubId !== currentClub.id` trước khi áp kết quả qualification; nếu khác
nhau (đã transfer đi) thì bỏ qua, giữ nguyên `currentContinentalCup` hiện tại.

---

## Các vi phạm hiện tại (technical debt — cần fix sau)

| File | Vi phạm | Priority |
|---|---|---|
| `features/career/services/career-setup.service.ts` | `Math.random()` không qua spin-resolver (luckRating, professionalism, personality) | Medium |
| `features/transfer/services/transfer.service.ts` | `Math.random()` không qua spin-resolver | Medium |
| `actions/season.actions.ts:generateLeagueTableAction` | `currentLeagueClubsRaw` từ client không qua Zod schema | High |
| `features/wheel/lib/career-wheel-resolver.ts:263` | Cờ `🇸🇬` hardcode cho mọi quốc tịch | Low |
| `lib/simulation-engine/match-simulator.ts` | Dead code — chưa xóa | Low |

Chi tiết xem: `docs/code-review-findings.md`

---

## Cách làm việc đúng

### Thêm logic game mới

1. Viết service function trong `features/<domain>/services/` hoặc `lib/`
2. Thêm Zod schema trong `actions/`
3. Tạo Server Action gọi service đó
4. Client gọi Server Action, không tự compute

### Thêm wheel outcome mới

1. Cập nhật pool trong `lib/wheel-engine/weight-calculator.ts`
2. Cập nhật resolver trong `features/wheel/lib/career-wheel-resolver.ts`
3. Cập nhật UI trong `features/wheel/components/CareerActionsPanel.tsx`
4. KHÔNG thêm `Math.random()` trong bước nào

### Thêm screen mới

1. Server Component trong `app/(game)/`
2. Fetch Prisma trực tiếp trong page
3. Client Component trong `features/<domain>/components/`
4. State UI tạm thời → `useState` local hoặc Zustand store

### Đọc data

- Server Component: Prisma trực tiếp
- Client Component: props từ Server Component, KHÔNG fetch API tùy tiện

---

## Tham chiếu docs

| Muốn biết về | Đọc |
|---|---|
| Game mechanics, wheel rules | `docs/game-design.md` |
| Kiến trúc layer | `docs/architecture.md` + `docs/source-code-architecture-guide.md` |
| State management | `docs/state-management.md` |
| API / Server Action patterns | `docs/api-integration.md` |
| Module boundaries | `docs/module-boundaries.md` |
| Frontend UI tokens | `docs/frontend-style-system-guide.md` |
| Bugs đã biết | `docs/code-review-findings.md` |
| AI agent rules | `docs/ai-agent-rules.md` |
