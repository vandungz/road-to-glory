# Source Code Architecture Guide — Football Life

## 1. Mục tiêu của tài liệu

Tài liệu này giúp developer (và AI coding agent) nhanh chóng hiểu cách tổ chức source code và cách làm việc an toàn trong codebase Football Life.

Sau khi đọc tài liệu này, developer cần nắm được:

- Cấu trúc thư mục chính của project.
- Cách phân biệt Server Component, Client Component, Server Action và Route Handler.
- Cách phân biệt `features/`, `lib/`, `components/`, `actions/`.
- Quy tắc quản lý state bằng React local state, Zustand và TanStack Query.
- Cách thêm một screen mới, một component mới, một Server Action mới.
- Cách tổ chức Wheel Engine và career generation logic.
- Quy tắc testing và naming convention.

Tài liệu này không giải thích game design hay product requirement. Mục tiêu duy nhất là hướng dẫn làm việc đúng kiến trúc source code.

---

## 2. Tổng quan kiến trúc

```txt
Browser (Client)
  ↓
Next.js App Router (Server Components + Client Components)
  ↓
Server Actions / Route Handlers
  ↓
Feature Services (domain logic)
  ↓
Lib Layer (Wheel Engine, Probability, Name Gen)
  ↓
Prisma ORM / Supabase
  ↓
PostgreSQL (Supabase)
```

Mỗi layer có trách nhiệm riêng:

- **Server Components**: fetch data trực tiếp, render HTML, không có interactivity.
- **Client Components**: UI interactivity, animation, Zustand UI state, TanStack Query.
- **Server Actions**: thin mutation layer — validate input, delegate sang feature service, persist.
- **Feature Services**: business/game logic — pure functions, không import React.
- **Lib Layer**: core domain utilities — Wheel Engine, probability math, name generation.
- **Prisma / Supabase**: data persistence.

Nguyên tắc quan trọng: layer phía trên gọi layer phía dưới qua interface rõ ràng. UI không chứa game logic. Game logic không biết về UI. Server Actions không chứa business rules.

---

## 3. Cấu trúc thư mục tổng quan

```txt
football-life/
├── app/                    # Next.js App Router — pages, layouts, route handlers
│   ├── (auth)/             # Auth routes: login, register, callback
│   ├── (game)/             # Game routes: home, game session, wheel spin
│   └── api/                # Route Handlers (external consumers only)
│
├── features/               # Feature-scoped modules (co-locate logic + UI)
│   ├── career/             # Career player generation — core domain
│   ├── game/               # Game session management
│   ├── player/             # Player card + career modal display
│   ├── squad/              # Pitch board, slot management
│   └── wheel/              # Wheel spin UI flow + animation
│
├── actions/                # Server Actions (thin — validate + delegate)
│   ├── game.actions.ts
│   └── player.actions.ts
│
├── components/             # Shared, domain-agnostic UI components
│   ├── ui/                 # shadcn/ui base components
│   └── shared/             # Shared game-agnostic components
│
├── lib/                    # Core domain utilities (no React, no Next.js)
│   ├── wheel-engine/       # Dynamic Weighted Wheel algorithm
│   ├── probability/        # Bell curve, math helpers
│   ├── name-gen/           # Fictional name generation by nationality
│   ├── supabase/           # Supabase client factory
│   └── prisma.ts           # Prisma client singleton
│
├── types/                  # Shared TypeScript types + Zod schemas
│   ├── game.types.ts
│   ├── player.types.ts
│   ├── wheel.types.ts
│   └── api.types.ts
│
├── prisma/                 # Prisma schema + migrations
│   └── schema.prisma
│
├── scripts/                # One-off scripts: data seeding, import
│
├── docs/                   # Technical documentation
│
└── public/                 # Static assets
```

---

## 4. App Router (`app/`) — Rules

### Server Components (mặc định)

Tất cả files trong `app/` là Server Components trừ khi có `"use client"`.

**Được dùng cho:**

- Fetch data trực tiếp qua Prisma hoặc Supabase server client.
- Render HTML tĩnh, SEO metadata.
- Truyền data xuống Client Components qua props.
- Auth check + redirect.

**Không được:**

- Dùng React hooks (`useState`, `useEffect`, v.v.).
- Dùng event handlers (`onClick`, v.v.).
- Import Zustand stores.
- Import browser-only APIs.

Ví dụ Server Component đúng:

```tsx
// app/(game)/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/supabase/server";
import { GameList } from "@/features/game/components/GameList";

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const games = await prisma.gameSession.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return <GameList games={games} />;
}
```

### Client Components (`"use client"`)

**Được dùng cho:**

- UI interactivity (click, hover, animation).
- React hooks.
- TanStack Query hooks.
- Zustand UI state.
- Framer Motion animations.

**Không được:**

- Import Prisma hoặc Supabase server client.
- Gọi server-only utilities.
- Chứa business/game logic.

Ví dụ Client Component đúng:

```tsx
"use client";

// features/squad/components/SquadBoard.tsx
import { useGameSessionQuery } from "@/features/game/queries/useGameSessionQuery";
import { SlotDisc } from "./SlotDisc";

export function SquadBoard({ gameId }: { gameId: string }) {
  const { data: game, isLoading } = useGameSessionQuery(gameId);

  if (isLoading) return <SquadBoardSkeleton />;

  return (
    <div className="relative aspect-[3/4] w-full rounded-xl bg-pitch">
      {game?.players.map((player, i) => (
        <SlotDisc key={i} slotIndex={i} player={player} gameId={gameId} />
      ))}
    </div>
  );
}
```

### Route Handlers (`app/api/`)

Chỉ tạo khi:

1. External consumers cần (future mobile app, webhooks).
2. TanStack Query cần client-side refetch mà Server Component không phục vụ được.

**Không tạo Route Handler cho internal mutations** — dùng Server Actions.

---

## 5. Features Layer (`features/`) — Structure

Mỗi feature module theo pattern:

```txt
features/<domain>/
  components/       # UI components của domain này
  services/         # Business/game logic — pure functions, no React
  queries/          # TanStack Query read hooks
  mutations/        # TanStack Query mutation hooks (gọi Server Actions)
  stores/           # Zustand UI state stores (nếu cần)
  types.ts          # Local types dùng riêng trong module
  index.ts          # Public exports
```

Chỉ tạo folder khi có nhu cầu thật. Module nhỏ có thể bắt đầu với `components/` và `services/`, mở rộng khi cần.

### `features/career/` — Core Domain

Đây là module quan trọng nhất. Career generation service nhận kết quả thiết lập (setupResult), lịch sử giả lập chỉ số (statsTimeline), lịch sử câu lạc bộ (clubStints), sự kiện (events) và trả về CareerPlayer hoàn chỉnh.

```txt
features/career/
  services/
    career-generation.service.ts   # Main generation logic
    club-stint.service.ts          # Club stint distribution
    career-events.service.ts       # Event generation (trophy linkage)
    stats.service.ts               # Sub-stats calculation
  queries/
    useCareerPlayerQuery.ts
  types.ts
```

Services trong `features/career/services/` không được import React, Next.js, hoặc bất kỳ UI library nào. Chúng là pure functions.

### `features/wheel/` — Spin UI

```txt
features/wheel/
  components/
    DraftDrumScreen.tsx            # Main career simulation page & orchestrator
    PaniniSticker.tsx              # Renders the live Panini sticker card (stamps & stats evolution)
    SeasonProfile.tsx              # Accordion layout for standings, domestic/continental cups, and NT
    TimelineHistory.tsx            # Career timeline event logs at the bottom
    SpinnerWheel.tsx               # Reusable SVG wheel + Framer Motion spin animation
    WheelStepProgress.tsx          # Step indicator (Step 2/7)
    PreviousStepsStrip.tsx         # Already-resolved setup steps summary
  stores/
    useWheelUiStore.ts             # Spin UI state (step, animation state)
  types.ts
```

`features/wheel/` gọi `lib/wheel-engine` để tính weights — không tự tính.

### `features/squad/` — Pitch Board

```txt
features/squad/
  components/
    SquadBoard.tsx                 # Pitch + 11 slots
    SlotDisc.tsx                   # Individual slot (empty/filled)
    SquadRatingBadge.tsx           # Squad Rating display
  queries/
    useGameSessionQuery.ts
```

### `features/player/` — Display

```txt
features/player/
  components/
    PlayerCard.tsx                 # FIFA-style card
    CareerModal.tsx                # Full career detail modal
    OvrChart.tsx                   # Line chart OVR progression
    ClubTimeline.tsx               # Club stints + events list
```

### `features/game/` — Session Management

```txt
features/game/
  components/
    GameList.tsx
    GameCard.tsx
    CreateGameButton.tsx
  queries/
    useGameSessionsQuery.ts
    useGameSessionQuery.ts
  mutations/
    useCreateGameMutation.ts
    useDeleteGameMutation.ts
```

---

## 6. Actions Layer (`actions/`) — Rules

Server Actions là lớp mỏng duy nhất được phép mutate database từ client.

**Cấu trúc chuẩn:**

```ts
// actions/player.actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { careerGenerationService } from "@/features/career/services/career-generation.service";

const saveCareerPlayerSchema = z.object({
  gameId:        z.string().uuid(),
  slotIndex:     z.number().int().min(0).max(10),
  setupResult:   wheelSetupResultSchema,
  statsTimeline: z.array(statsSnapshotSchema),
  clubStints:    z.array(clubStintSchema),
  events:        z.array(careerEventSchema),
});

export async function saveCareerPlayer(input: unknown) {
  // 1. Auth
  const session = await auth();
  if (!session) throw new Error("UNAUTHORIZED");

  // 2. Validate input
  const validated = saveCareerPlayerSchema.parse(input);

  // 3. Ownership check
  const game = await prisma.gameSession.findUnique({
    where: { id: validated.gameId },
  });
  if (!game || game.userId !== session.userId) throw new Error("FORBIDDEN");

  // 4. Generate (pure service)
  const careerPlayer = careerGenerationService.generateFinalCareerPlayer(
    validated.setupResult,
    validated.statsTimeline,
    validated.clubStints,
    validated.events
  );

  // 5. Persist
  return prisma.careerPlayer.create({
    data: { ...careerPlayer, gameSessionId: validated.gameId, slotIndex: validated.slotIndex },
  });
}
```

**Rules:**

- ✅ Luôn validate input bằng Zod.
- ✅ Luôn verify auth + ownership.
- ✅ Delegate business logic sang feature service.
- ❌ Không chứa game logic (wheel weights, career generation).
- ❌ Không gọi `Math.random()`.
- ❌ Không có JSX hay React imports.

---

## 7. Lib Layer (`lib/`) — Rules

### `lib/wheel-engine/`

Core game algorithm. Không phụ thuộc React, Next.js, hay database.

```txt
lib/wheel-engine/
  weight-calculator.ts     # Tính FinalWeight cho mỗi outcome
  spin-resolver.ts         # Math.random() duy nhất — resolve outcome từ weight table
  wheel-configs/           # Outcome pools cho từng wheel type
    nationality.config.ts
    debut-age.config.ts
    debut-stats.config.ts
    career-length.config.ts
    clubs.config.ts
  modifiers/               # Modifier functions
    age.modifier.ts
    position.modifier.ts
    nationality.modifier.ts
    user-bias.modifier.ts
```

**Invariant bắt buộc:**

```ts
// spin-resolver.ts — Math.random() chỉ ở đây, không có exception
export function resolveSpinOutcome<T>(weightTable: WeightedOutcome<T>[]): T {
  const totalWeight = weightTable.reduce((sum, item) => sum + item.weight, 0);
  const random = Math.random() * totalWeight; // ← DUY NHẤT
  let cumulative = 0;
  for (const item of weightTable) {
    cumulative += item.weight;
    if (random <= cumulative) return item.outcome;
  }
  return weightTable[weightTable.length - 1].outcome;
}
```

### `lib/probability/`

Pure math utilities:

```ts
// Tính OVR tại một tuổi theo bell curve
export function bellCurveOvr(age: number, params: BellCurveParams): number

// Phân bổ số năm cho N clubs
export function distributeYears(total: number, count: number): number[]

// Clamp value trong khoảng
export function clamp(value: number, min: number, max: number): number
```

### `lib/name-gen/`

```ts
// Sinh tên theo nationality
export function generateName(nationality: string): string

// name-pools/brazil.ts, name-pools/england.ts, ...
```

### `lib/prisma.ts`

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

---

## 8. State Management — Rules

```txt
React local state  = UI state trong một component
Zustand            = Transient UI state shared across components
TanStack Query     = Server/cache state
Server Actions     = Mutations + persistence
Feature Services   = Business/game logic (pure functions)
```

### Zustand — Chỉ cho UI state

✅ Được dùng cho:

- `activeWheelStep: number`
- `spinState: 'idle' | 'spinning' | 'result'`
- `resolvedSteps: WheelStepResult[]` (temporary, cleared sau persist)
- `isCareerModalOpen: boolean`
- `selectedPlayerId: string | null`

❌ Không dùng cho:

- `CareerPlayer` data
- `GameSession` data
- Wheel weights
- Club/League data
- Bất kỳ server truth nào

Ví dụ Zustand store đúng:

```ts
// features/wheel/stores/useWheelUiStore.ts
import { create } from "zustand";

type WheelUiState = {
  activeStep: number;
  spinState: "idle" | "spinning" | "result";
  resolvedSteps: WheelStepResult[];
  setActiveStep: (step: number) => void;
  setSpinState: (state: "idle" | "spinning" | "result") => void;
  addResolvedStep: (step: WheelStepResult) => void;
  reset: () => void;
};

export const useWheelUiStore = create<WheelUiState>((set) => ({
  activeStep: 0,
  spinState: "idle",
  resolvedSteps: [],
  setActiveStep: (step) => set({ activeStep: step }),
  setSpinState: (state) => set({ spinState: state }),
  addResolvedStep: (step) =>
    set((s) => ({ resolvedSteps: [...s.resolvedSteps, step] })),
  reset: () => set({ activeStep: 0, spinState: "idle", resolvedSteps: [] }),
}));
```

### TanStack Query — Server State

✅ Được dùng cho mọi data đến từ server:

```ts
// features/game/queries/useGameSessionQuery.ts
import { useQuery } from "@tanstack/react-query";
import { gameSessionSchema } from "@/types/game.types";

export function useGameSessionQuery(gameId: string) {
  return useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const res = await fetch(`/api/games/${gameId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return gameSessionSchema.parse(await res.json());
    },
    enabled: !!gameId,
  });
}
```

**Không sync query result vào Zustand.** Nếu nhiều component cần cùng data, chúng dùng cùng query hook.

---

## 9. Query và Mutation Hooks

### Naming convention

- Read: `useXxxQuery`
- Write: `useXxxMutation`

### Mutation hook — gọi Server Action + invalidate

```ts
// features/player/mutations/useSaveCareerPlayerMutation.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveCareerPlayer } from "@/actions/player.actions";
import { useWheelUiStore } from "@/features/wheel/stores/useWheelUiStore";

export function useSaveCareerPlayerMutation(gameId: string) {
  const queryClient = useQueryClient();
  const resetWheel = useWheelUiStore((s) => s.reset);

  return useMutation({
    mutationFn: (input: SaveCareerPlayerInput) => saveCareerPlayer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      resetWheel(); // Clear Zustand UI state sau khi persist xong
    },
  });
}
```

**Query keys phải nhất quán:**

```ts
// Centralize query keys
export const QUERY_KEYS = {
  games:       () => ["games"] as const,
  game:        (id: string) => ["game", id] as const,
  player:      (id: string) => ["player", id] as const,
} as const;
```

---

## 10. UI Component Rules

### Page Components (Server Component)

- Route-level, thin, compose layout + feature components.
- Fetch data trực tiếp qua Prisma.
- Truyền data xuống Client Components qua props.

### Feature Components (Client Component)

- Nằm trong `features/<domain>/components/`.
- Hiểu types của domain.
- Có thể gọi query hooks, mutation hooks.
- Không chứa business logic.

### Shared Components

- Nằm trong `components/shared/` hoặc `components/ui/`.
- Không có business assumption.
- Nhận data qua props.
- Không gọi query hooks cụ thể của một module.

**Ví dụ phân loại:**

| Component | Đặt ở đâu |
|---|---|
| `PlayerCard` | `features/player/components/` — gắn với player domain |
| `SlotDisc` | `features/squad/components/` — gắn với squad domain |
| `WheelCanvas` | `features/wheel/components/` — gắn với wheel |
| `EmptyState` | `components/shared/` — generic, nhận text/action qua props |
| `OvrBadge` | `components/shared/` nếu generic, hoặc `features/player/` nếu có logic |

---

## 11. Cách thêm screen mới

1. Tạo Server Component page trong `app/(game)/`.
2. Fetch data trực tiếp qua Prisma trong page.
3. Tạo Client Component trong `features/<domain>/components/`.
4. Tạo query hook nếu component cần client-side refetch.
5. Tạo mutation hook nếu có action write.
6. Tạo Zustand store chỉ khi UI state cần share giữa nhiều component.

Ví dụ — thêm màn hình Game Detail:

```txt
Bước 1: app/(game)/[gameId]/page.tsx
Bước 2: fetch prisma.gameSession.findUnique(...)
Bước 3: features/squad/components/SquadBoard.tsx (Client Component)
Bước 4: features/game/queries/useGameSessionQuery.ts (nếu cần refetch)
Bước 5: features/player/mutations/useSaveCareerPlayerMutation.ts
Bước 6: (không cần Zustand mới — dùng WheelUiStore đã có)
```

---

## 12. Cách thêm Server Action mới

1. Tạo hoặc mở file trong `actions/`.
2. Thêm `"use server"` ở đầu file.
3. Định nghĩa Zod schema cho input.
4. Validate auth + ownership.
5. Gọi feature service.
6. Persist qua Prisma.
7. Return result hoặc throw error với code rõ ràng.

Không thêm business logic vào action. Nếu logic phức tạp, tạo hoặc mở rộng service trong `features/<domain>/services/`.

---

## 13. Cách thêm Wheel outcome mới

Khi thêm outcome mới cho bất kỳ wheel nào:

1. Cập nhật `WheelOutcome` discriminated union trong `types/wheel.types.ts`.
2. Cập nhật `WheelConfig` của wheel đó trong `lib/wheel-engine/wheel-configs/`.
3. Cập nhật modifier function nếu outcome ảnh hưởng đến weight calculation.
4. Cập nhật career generation service nếu outcome tạo ra state mới.
5. Viết unit test cho weight calculation với outcome mới.

**Không thay đổi `spin-resolver.ts`** trừ khi có bug trong random resolution logic.

---

## 14. Testing Rules

Football Life không dùng MSW. Testing strategy:

### Unit Tests (Vitest)

Dùng cho:

- `lib/wheel-engine/` — weight calculation, outcome resolution.
- `lib/probability/` — bell curve, year distribution.
- `lib/name-gen/` — name generation.
- `features/career/services/` — career generation logic.
- Zod schemas — parse/validation.

Ví dụ unit test cho wheel engine:

```ts
// lib/wheel-engine/__tests__/spin-resolver.test.ts
import { vi, describe, it, expect } from "vitest";
import { resolveSpinOutcome } from "../spin-resolver";

describe("resolveSpinOutcome", () => {
  it("resolves to the outcome covering the random value", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.7);

    const table = [
      { outcome: "A", weight: 50 },
      { outcome: "B", weight: 30 },
      { outcome: "C", weight: 20 },
    ];

    expect(resolveSpinOutcome(table)).toBe("B");
  });
});
```

Ví dụ unit test cho career generation:

```ts
describe("careerGenerationService.generateFinalCareerPlayer", () => {
  it("generates retire age = debut age + career length", () => {
    const result = careerGenerationService.generateFinalCareerPlayer(
      {
        nationality: "Brazil",
        position: "ST",
        debutAge: 17,
        debutOvr: 62,
        careerLengthYears: 16,
        numberOfClubs: 4,
      },
      mockStatsTimeline,
      mockClubStints,
      mockEvents
    );

    expect(result.retireAge).toBe(33);
    expect(result.clubStints).toHaveLength(4);
    expect(result.statsTimeline).toHaveLength(16);
  });
});
```

### Component Tests (React Testing Library + Vitest)

Dùng cho:

- `features/player/components/PlayerCard` — render đúng rarity, stats.
- `features/squad/components/SlotDisc` — empty vs filled state.
- `features/wheel/components/WheelStepProgress` — hiển thị đúng step.
- Empty state, loading state, error state của các screen chính.

### E2E Tests (Playwright) — Chỉ cho critical flows

Dùng cho:

- Toàn bộ wheel spin flow (click slot → spin 7 wheels → player generated).
- Tạo game session mới.
- Xóa game session.
- Xem career detail modal.

---

## 15. Naming Conventions

| Loại | Convention | Ví dụ |
|---|---|---|
| File (component) | `PascalCase.tsx` | `PlayerCard.tsx` |
| File (utility) | `kebab-case.ts` | `spin-resolver.ts` |
| File (service) | `kebab-case.service.ts` | `career-generation.service.ts` |
| Component | `PascalCase` | `PlayerCard`, `SlotDisc` |
| Hook | `useXxx` | `useWheelUiStore`, `useGameSessionQuery` |
| Query hook | `useXxxQuery` | `useGameSessionQuery` |
| Mutation hook | `useXxxMutation` | `useSaveCareerPlayerMutation` |
| Zustand store | `useXxxStore` | `useWheelUiStore` |
| Server Action | `verbNoun` | `saveCareerPlayer`, `deleteGameSession` |
| Type / Interface | `PascalCase` | `CareerPlayer`, `GameSession` |
| Zod schema | `camelCaseSchema` | `careerPlayerSchema`, `wheelCascadeResultSchema` |
| Constants | `SCREAMING_SNAKE_CASE` | `QUERY_KEYS`, `WHEEL_STEP_COUNT` |

---

## 16. Import Rules

Dependency direction:

```txt
app/           → features, components, lib, types
features/      → lib, types, components/ui
actions/       → features/*/services, lib, types, prisma
components/    → types (no feature imports)
lib/           → types (no React, no Next.js, no feature imports)
types/         → (standalone — no imports from app/features/lib)
```

**Không được:**

- `lib/` import React, Next.js, hoặc Prisma.
- `components/shared/` import feature-specific code.
- `features/` import từ `app/` hoặc `actions/`.
- Circular imports giữa các features.

Dùng path aliases để tránh deep relative imports:

```ts
// GOOD
import { careerGenerationService } from "@/features/career/services/career-generation.service";
import { bellCurveOvr } from "@/lib/probability";
import { careerPlayerSchema } from "@/types/player.types";

// BAD
import { careerGenerationService } from "../../../features/career/services/career-generation.service";
```

---

## 17. AI Agent Rules

Khi AI coding agent chỉnh sửa project này:

- ✅ Đọc tài liệu này và `docs/module-boundaries.md` trước.
- ✅ Tìm component, hook, service hiện có trước khi tạo mới.
- ✅ Đặt file đúng layer (lib không có React, features không có Prisma inline...).
- ✅ Validate input bằng Zod trong mọi Server Action.
- ✅ Invalidate đúng query keys sau mỗi mutation.
- ✅ Thêm hoặc cập nhật unit test khi thêm game/wheel logic.
- ❌ Không gọi `Math.random()` ngoài `lib/wheel-engine/spin-resolver.ts`.
- ❌ Không store server truth trong Zustand.
- ❌ Không viết career generation logic trong Server Action hay component.
- ❌ Không expose `hiddenStats` trong API response hay client component.
- ❌ Không tạo circular imports giữa features.
- ❌ Không đặt game logic trong JSX hay event handler.
- ❌ Không thêm Zustand store mới nếu React local state đủ dùng.

AI agent nên ưu tiên thay đổi nhỏ, đúng scope. Nếu cần refactor lớn, tách thành nhiều bước rõ ràng và hỏi trước.

---

## 18. Common Mistakes To Avoid

- Gọi `Math.random()` ngoài `spin-resolver.ts`.
- Lưu `CareerPlayer` hay `GameSession` trong Zustand.
- Đặt career generation logic trong Server Action thay vì feature service.
- Import Prisma trong Client Component.
- Import React trong `lib/wheel-engine/` hoặc `lib/probability/`.
- Tạo component lớn chứa cả fetch logic, animation và business logic.
- Bỏ qua query invalidation sau mutation.
- Expose `hiddenStats` trong bất kỳ response nào.
- Tạo shared component nhưng import feature-specific hook bên trong.
- Đặt wheel weight configuration hardcode trong component thay vì `lib/wheel-engine/wheel-configs/`.
- Dùng Route Handler cho internal mutation thay vì Server Action.
- Copy query result từ TanStack Query vào Zustand.

---

## 19. PR Checklist

Trước khi commit hoặc mở PR, kiểm tra:

- [ ] File đặt đúng layer và đúng feature folder.
- [ ] Không có `Math.random()` ngoài `spin-resolver.ts`.
- [ ] Server Action có Zod validation + auth check.
- [ ] Business logic nằm trong feature service, không trong Action hay Component.
- [ ] `hiddenStats` không bị expose ra client hay API response.
- [ ] TanStack Query keys được invalidate sau mutation.
- [ ] Zustand store chỉ chứa UI state.
- [ ] `lib/` không import React, Next.js, Prisma.
- [ ] `components/shared/` không import feature-specific code.
- [ ] Unit test thêm hoặc cập nhật nếu có logic mới trong `lib/` hay `features/*/services/`.
- [ ] Naming convention đúng (hook, query, mutation, store, service).
- [ ] Không có circular imports.
- [ ] Không có deep relative imports — dùng `@/` alias.
