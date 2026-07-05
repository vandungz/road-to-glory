# State Management — Football Life

Football Life tách biệt rõ ràng giữa **UI state**, **server/cache state**, và **game logic**. Ba thứ này không được trộn lẫn.

```txt
React local state  →  State trong một component, không cần share
Zustand            →  Transient UI state shared across components
TanStack Query     →  Server/cache state — data đến từ database
Server Actions     →  Mutations — write game truth qua Prisma
Feature Services   →  Game logic — pure functions, no side effects
```

---

## Zustand — UI State Only

Zustand chỉ được dùng cho **transient UI state** — state không cần persist và không phải game truth.

### Allowed in Zustand

```txt
Wheel Spin UI
  activeWheelStep         Bước hiện tại trong cascade (0–6)
  spinState               'idle' | 'spinning' | 'result'
  resolvedSteps[]         Kết quả tạm thời từng bước (cleared sau persist)

Career Modal
  isCareerModalOpen       Modal đang mở hay không
  selectedPlayerId        Player đang được xem trong modal

Game Setup
  pendingSlotIndex        Slot nào đang được fill (khi vào wheel screen)
```

### Forbidden in Zustand

```txt
CareerPlayer data         → Dùng TanStack Query
GameSession data          → Dùng TanStack Query
Wheel weights             → Tính tại thời điểm spin, không cache
Club / League pool        → Server data, dùng query
Squad Rating              → Derived từ CareerPlayer[], tính inline
hiddenStats               → Server-only, không bao giờ đến client
```

### Store locations

```txt
features/wheel/stores/useWheelUiStore.ts     Wheel spin flow state
features/player/stores/usePlayerModalStore.ts Career modal state
```

### Ví dụ Wheel UI Store

```ts
// features/wheel/stores/useWheelUiStore.ts
import { create } from "zustand";
import type { WheelStepResult } from "@/types/wheel.types";

type WheelUiState = {
  activeStep:     number;
  spinState:      "idle" | "spinning" | "result";
  resolvedSteps:  WheelStepResult[];
  pendingSlotIndex: number | null;

  setActiveStep:      (step: number) => void;
  setSpinState:       (state: "idle" | "spinning" | "result") => void;
  addResolvedStep:    (step: WheelStepResult) => void;
  setPendingSlot:     (index: number | null) => void;
  reset:              () => void;
};

const initialState = {
  activeStep:       0,
  spinState:        "idle" as const,
  resolvedSteps:    [],
  pendingSlotIndex: null,
};

export const useWheelUiStore = create<WheelUiState>((set) => ({
  ...initialState,
  setActiveStep:   (step)  => set({ activeStep: step }),
  setSpinState:    (state) => set({ spinState: state }),
  addResolvedStep: (step)  => set((s) => ({ resolvedSteps: [...s.resolvedSteps, step] })),
  setPendingSlot:  (index) => set({ pendingSlotIndex: index }),
  reset:           ()      => set(initialState),
}));
```

### Ví dụ Career Modal Store

```ts
// features/player/stores/usePlayerModalStore.ts
import { create } from "zustand";

type PlayerModalState = {
  isOpen:           boolean;
  selectedPlayerId: string | null;
  openModal:        (playerId: string) => void;
  closeModal:       () => void;
};

export const usePlayerModalStore = create<PlayerModalState>((set) => ({
  isOpen:           false,
  selectedPlayerId: null,
  openModal:  (id) => set({ isOpen: true, selectedPlayerId: id }),
  closeModal: ()   => set({ isOpen: false, selectedPlayerId: null }),
}));
```

### Selector pattern — tránh re-render không cần thiết

```ts
// ✅ Chỉ subscribe vào slice cần thiết
const spinState      = useWheelUiStore((s) => s.spinState);
const activeStep     = useWheelUiStore((s) => s.activeStep);

// ❌ Subscribe toàn bộ store — re-render mọi lúc
const store = useWheelUiStore();
```

---

## TanStack Query — Server / Cache State

TanStack Query owns mọi data đến từ server. Không copy data này vào Zustand.

### Managed by TanStack Query

```txt
GameSession[]       Danh sách game sessions của user
GameSession         Chi tiết một game + players
CareerPlayer        Chi tiết một career player
Club[]              Danh sách clubs (for wheel config display)
```

### Query Key Registry

Tất cả query keys được centralize tại một file:

```ts
// lib/query-keys.ts
export const QUERY_KEYS = {
  games:    ()          => ["games"]           as const,
  game:     (id: string) => ["game", id]       as const,
  player:   (id: string) => ["player", id]     as const,
  clubs:    ()          => ["clubs"]           as const,
} as const;
```

### Query hooks

```ts
// features/game/queries/useGameSessionQuery.ts
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/query-keys";
import { gameSessionSchema } from "@/types/game.types";

export function useGameSessionQuery(gameId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.game(gameId),
    queryFn:  async () => {
      const res = await fetch(`/api/games/${gameId}`);
      if (!res.ok) throw new Error("Failed to fetch game session");
      return gameSessionSchema.parse(await res.json());
    },
    enabled: !!gameId,
  });
}
```

### Mutation hooks — gọi Server Action + invalidate

```ts
// features/player/mutations/useSaveCareerPlayerMutation.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveCareerPlayer } from "@/actions/player.actions";
import { QUERY_KEYS } from "@/lib/query-keys";
import { useWheelUiStore } from "@/features/wheel/stores/useWheelUiStore";

export function useSaveCareerPlayerMutation(gameId: string) {
  const queryClient = useQueryClient();
  const resetWheel  = useWheelUiStore((s) => s.reset);

  return useMutation({
    mutationFn: saveCareerPlayer,
    onSuccess: () => {
      // Invalidate game data → Squad board tự re-render
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.game(gameId) });
      // Clear Zustand UI state sau khi persist xong
      resetWheel();
    },
    onError: (err) => {
      console.error("[useSaveCareerPlayerMutation]", err);
    },
  });
}
```

### Rules

- ✅ Sau mỗi mutation, invalidate đúng query keys.
- ✅ Validate response bằng Zod schema tại `queryFn`.
- ✅ Dùng `enabled: !!id` để tránh fetch khi chưa có params.
- ❌ Không copy query result vào Zustand.
- ❌ Không gọi `fetch` trực tiếp trong component — dùng query hook.
- ❌ Không dùng `useEffect + fetch` cho data fetching.

---

## Feature Services — Game Logic

Game logic nằm trong `features/<domain>/services/`. Services là pure functions — không import React, không có side effects, không gọi database trực tiếp.

### Managed by Feature Services

```txt
Career generation       features/career/services/career-generation.service.ts
Club stint distribution features/career/services/club-stint.service.ts
Career event linking    features/career/services/career-events.service.ts
Sub-stats calculation   features/career/services/stats.service.ts
```

### Pattern

```ts
// features/career/services/career-generation.service.ts

// ✅ Pure function — nhận toàn bộ lịch sử giả lập, trả về CareerPlayer hoàn chỉnh có Peak OVR trích xuất hồi tố
export function generateFinalCareerPlayer(
  setupResult: WheelSetupResult,
  statsTimeline: StatsSnapshot[],
  clubStints: ClubStint[],
  events: CareerEvent[],
): GeneratedCareerPlayer {
  const name        = generateName(setupResult.nationality);
  const hiddenStats = generateHiddenStats(setupResult);
  
  // Trích xuất Peak OVR hồi tố từ timeline có OVR cao nhất
  const peakSnapshot = extractPeakSeason(statsTimeline, setupResult.position);
  const peakOvr      = peakSnapshot.ovr;

  return {
    name,
    nationality:       setupResult.nationality,
    position:          setupResult.position,
    debutAge:          setupResult.debutAge,
    retireAge:         setupResult.debutAge + setupResult.careerLengthYears,
    peakOvr,
    cardRarity:        resolveRarity(peakOvr),
    statsTimeline,
    clubStints,
    events,
    hiddenStats,       // ← lưu ở server-side, không truyền về client
  };
}
```

Services không được:

- Import React.
- Import Next.js APIs.
- Gọi Prisma trực tiếp.
- Có side effects (logging, fetch, filesystem).
- Gọi `Math.random()` — chỉ `lib/wheel-engine/spin-resolver.ts` được làm điều này.

---

## Luồng State Hoàn Chỉnh — Wheel Spin

Đây là luồng từ lúc user click slot đến khi Squad board cập nhật:

```txt
1. User click slot [ST] trên SquadBoard
       ↓
2. useWheelUiStore.setPendingSlot(slotIndex)           ← Zustand UI state
       ↓
3. Navigate sang WheelSpinScreen (Phase 1: Setup Wheels)
       ↓
4. Spin 6 Setup Wheels (Nationality, Position, Debut Age, Debut Stats, Length, Clubs count)
   → Lưu thông tin cơ bản vào Zustand
       ↓
5. Chuyển sang Giao diện Giả lập Sự nghiệp (Phase 2: Career Loop)
   → Lặp lại các vòng quay chuyển nhượng CLB (League, Club, Years)
   → Giả lập từng năm thi đấu: BE auto-calculate G/A, rating, cúp
   → Quay Stats Update Wheels (Direction, Quantity, Magnitude) cuối năm → Client cập nhật stats timeline
   → Quay NT Wheels (nếu đến năm ĐTQG) hoặc Ballon d'Or
       ↓
6. Hết length sự nghiệp → Cầu thủ giải nghệ → Hiện nút "Confirm & Persist"
       ↓
7. useSaveCareerPlayerMutation.mutate({ setupResult, statsTimeline, clubStints, events })
       ↓
8. Server Action saveCareerPlayer()
   → Zod validate
   → careerGenerationService.generateFinalCareerPlayer(...)
      * Rút trích Peak OVR từ timeline cao nhất
      * Xác định Card Rarity và sinh chỉ số ẩn hiddenStats
   → prisma.careerPlayer.create(...)
   → Return saved player
       ↓
9. onSuccess:
   → queryClient.invalidateQueries(QUERY_KEYS.game(gameId))
   │ (Squad board tự động re-render với Player Card vừa lật mở thành công)
   → useWheelUiStore.reset()                           ← Clear Zustand state
```

---

## Bảng phân loại nhanh

| State | Loại | Lưu ở đâu |
|---|---|---|
| Wheel đang ở step nào | UI | Zustand |
| Spin animation đang chạy | UI | Zustand |
| Kết quả tạm các wheel steps | UI (temporary) | Zustand → cleared sau persist |
| Modal career đang mở | UI | Zustand |
| Player nào đang được xem | UI | Zustand |
| Slot nào đang được fill | UI | Zustand |
| Danh sách game sessions | Server | TanStack Query |
| Squad XI data | Server | TanStack Query |
| CareerPlayer detail | Server | TanStack Query |
| hiddenStats | Server-only | Chỉ Prisma, không đến client |
| Wheel weight table | Computed | Không cache — tính tại thời điểm spin |
| Squad Rating | Derived | Tính inline từ CareerPlayer[], không cache |
| Career generation logic | Game logic | Feature service (pure function) |

---

## React Key Reset — Automatic State Clearing

In Next.js, navigate transitions (Soft Navigation) preserve the state of layout/page components. To guarantee that a complex interactive client screen (like the Career Simulation/Draft board) is completely reset when switching players, creating a new session, or switching slots, we use the React `key` prop at the page-compose level:

```tsx
// app/(game)/[gameId]/draft/[slotIndex]/page.tsx
export default async function DraftPage({ params }: { params: { gameId: string; slotIndex: string } }) {
  // ...
  return (
    <DraftDrumScreen
      key={`${gameId}_${slotIndex}`} // ← Force unmount & clean state whenever slotIndex/gameId changes
      gameId={gameId}
      slotIndex={Number(slotIndex)}
    />
  );
}
```

### Why it is used:
* **Garbage Collection**: Avoids manual, tedious resetting of dozens of local hooks (`useState`) which are prone to bugs and memory leaks.
* **Fresh Context**: When React detects a change in the `key` prop, it completely destroys the old component instance (running standard cleanups) and mounts a brand new component starting with pristine initial states.

---

## Anti-patterns

```ts
// ❌ Store server data trong Zustand
const useGameStore = create((set) => ({
  currentGame: null,         // server truth — không được lưu ở đây
  setCurrentGame: (g) => set({ currentGame: g }),
}));

// ✅ Dùng TanStack Query
const { data: currentGame } = useGameSessionQuery(gameId);
```

```ts
// ❌ Fetch trong component
function SquadBoard({ gameId }) {
  const [game, setGame] = useState(null);
  useEffect(() => {
    fetch(`/api/games/${gameId}`).then(r => r.json()).then(setGame);
  }, [gameId]);
}

// ✅ Dùng query hook
function SquadBoard({ gameId }) {
  const { data: game } = useGameSessionQuery(gameId);
}
```

```ts
// ❌ Copy query result vào Zustand
const { data } = useGameSessionQuery(gameId);
useEffect(() => {
  if (data) setGameInZustand(data); // không bao giờ làm thế này
}, [data]);

// ✅ Dùng trực tiếp từ query
const { data: game } = useGameSessionQuery(gameId);
```

```ts
// ❌ Game logic trong component
function onSpinComplete(result) {
  const peakOvr = result.debutOvr + result.yearsCareer * 1.5; // ← game logic không ở đây
  setState({ peakOvr });
}

// ✅ Delegate sang feature service
function onSpinComplete(result) {
  const generated = careerGenerationService.generate(result); // ← ở đây
  saveCareerPlayer({ ...generated, gameId, slotIndex });
}
```
