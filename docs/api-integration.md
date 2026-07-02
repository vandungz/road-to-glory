# API Integration Guide — Football Life

Tài liệu này mô tả cách data flows qua Football Life, khi nào cần Server Actions, khi nào cần Route Handlers, và những quy tắc cần giữ khi thêm endpoint hoặc mutation mới.

Viết cho cả human developer lẫn AI agent. Đọc trước khi thêm bất kỳ data-fetching hay write logic nào.

---

## 1. Kiến trúc Data Flow

Football Life là **Next.js 15 App Router** — không có separate backend API server. Data flow theo hai hướng:

### Read Flow (Server Component)

```txt
Page / Layout (Server Component)
  → Prisma / Supabase Server Client (trực tiếp)
  → Data được truyền vào Client Component qua props
```

### Read Flow (Client Component)

```txt
Client Component
  → TanStack Query hook (useQuery)
  → fetch đến Route Handler (app/api/...)   ← chỉ khi cần client-side refetch
  → Prisma / Supabase
  → Zod validation tại boundary
  → TanStack Query cache
  → UI render
```

### Write Flow (Mutations)

```txt
Client Component (UI event)
  → Server Action (actions/)
  → Zod input validation
  → Feature Service (features/<domain>/services/)
  → Prisma mutation
  → Return result
  → TanStack Query invalidation (queryClient.invalidateQueries)
  → UI refresh
```

**Không có REST API riêng cho internal use.** Server Actions thay thế hoàn toàn cho internal mutations.

---

## 2. Khi nào dùng gì

| Pattern | Dùng khi | Không dùng khi |
|---|---|---|
| **Server Component + Prisma trực tiếp** | Initial page load, SEO-sensitive data, data không cần refetch | Component cần reactive updates |
| **TanStack Query + Route Handler** | Client cần refetch, polling, hoặc data phụ thuộc vào user interaction | Simple one-time read |
| **Server Action** | Mọi mutation (create, update, delete) từ client | Reads — dùng query hooks thay thế |
| **Route Handler (`app/api/`)** | External consumers (future mobile app), hoặc webhooks | Internal mutations — dùng Server Actions |

### Nguyên tắc

- ✅ Server Components đọc data trực tiếp qua Prisma — không cần fetch.
- ✅ Client Components dùng TanStack Query hooks để đọc — không dùng `useEffect + fetch`.
- ✅ Mọi write đi qua Server Actions — không fetch `POST /api/` từ component.
- ❌ Không gọi `fetch` trực tiếp bên trong React component.
- ❌ Không store server truth trong Zustand.

---

## 3. Data Flow Cụ Thể — Football Life

### 3.1 Load danh sách Game Sessions

```txt
/game page (Server Component)
  → prisma.gameSession.findMany({ where: { userId } })
  → truyền vào <GameList sessions={sessions} />
```

### 3.2 Load Squad XI của một game

```txt
/game/[gameId] page (Server Component)
  → prisma.gameSession.findUnique({ include: { players: true } })
  → truyền vào <SquadBoard game={game} />
```

### 3.3 Generate và save Career Player (Wheel Spin Flow)

```txt
User click slot [ST]
  → Wheel spin UI (Client Component)
  → lib/wheel-engine: compute weights
  → SpinResolver: resolve outcomes (Math.random() tại đây)
  → Cầu thủ giải nghệ → có setupResult, statsTimeline, clubStints, events
  → Gọi Server Action: saveCareerPlayer({ setupResult, statsTimeline, clubStints, events }, gameId, slotIndex)
      * Zod validate input
      * careerGenerationService.generateFinalCareerPlayer(...)  ← trích xuất Peak OVR hồi tố
      → prisma.careerPlayer.create(...)
      → return CareerPlayer
  → queryClient.invalidateQueries(['game', gameId])
  → Squad board tự re-render với player mới
```

### 3.4 Xóa một game session

```txt
User click "Delete Game"
  → Gọi Server Action: deleteGameSession(gameId)
      → Verify ownership (userId check)
      → prisma.gameSession.delete({ where: { id: gameId } })
  → queryClient.invalidateQueries(['games'])
  → Redirect về home
```

---

## 4. File Layout

```txt
app/
  (game)/
    page.tsx                    ← Server Component, fetch danh sách games
    [gameId]/
      page.tsx                  ← Server Component, fetch squad data
  api/                          ← Chỉ cho external consumers (future)
    games/
      route.ts                  ← GET /api/games (nếu cần)
    players/
      [playerId]/
        route.ts                ← GET /api/players/:id (nếu cần)

actions/
  game.actions.ts               ← createGameSession, deleteGameSession
  player.actions.ts             ← saveCareerPlayer, deleteCareerPlayer

features/
  career/
    services/
      career-generation.service.ts   ← generate CareerPlayer từ statsTimeline & stints (Peak OVR trích xuất hồi tố)
    queries/
      useCareerPlayerQuery.ts        ← TanStack Query hook
  game/
    services/
      game.service.ts
    queries/
      useGameSessionsQuery.ts
      useGameSessionQuery.ts

lib/
  prisma.ts                     ← Prisma client singleton
  supabase/
    client.ts                   ← Browser Supabase client
    server.ts                   ← Server Supabase client (service role)
  wheel-engine/
    weight-calculator.ts
    spin-resolver.ts

types/
  api.types.ts                  ← Shared DTOs, response types
  game.types.ts
  player.types.ts
```

---

## 5. Server Action Pattern

### Cấu trúc chuẩn

```ts
// actions/player.actions.ts
"use server";

import { z } from "zod";
import { careerGenerationService } from "@/features/career/services/career-generation.service";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/supabase/server";

const saveCareerPlayerSchema = z.object({
  gameId:        z.string().uuid(),
  slotIndex:     z.number().min(0).max(10),
  setupResult:   wheelSetupResultSchema,
  statsTimeline: z.array(statsSnapshotSchema),
  clubStints:    z.array(clubStintSchema),
  events:        z.array(careerEventSchema),
});

export async function saveCareerPlayer(input: unknown) {
  // 1. Auth check
  const session = await auth();
  if (!session) throw new Error("UNAUTHORIZED");

  // 2. Validate input
  const validated = saveCareerPlayerSchema.parse(input);

  // 3. Verify ownership
  const game = await prisma.gameSession.findUnique({
    where: { id: validated.gameId },
  });
  if (!game || game.userId !== session.userId) {
    throw new Error("FORBIDDEN");
  }

  // 4. Generate career player (pure service)
  const careerPlayer = careerGenerationService.generateFinalCareerPlayer(
    validated.setupResult,
    validated.statsTimeline,
    validated.clubStints,
    validated.events
  );

  // 5. Persist
  const saved = await prisma.careerPlayer.create({
    data: {
      ...careerPlayer,
      gameSessionId: validated.gameId,
      slotIndex: validated.slotIndex,
    },
  });

  return saved;
}
```

### Rules cho Server Actions

- ✅ Luôn validate input bằng Zod trước khi làm gì khác.
- ✅ Luôn verify auth + ownership trước khi mutate data.
- ✅ Delegate business logic sang feature service — action chỉ là thin wrapper.
- ❌ Không chứa wheel weight calculation hay career generation logic.
- ❌ Không gọi `Math.random()` trong action.
- ❌ Không return sensitive data (hidden stats, internal IDs không cần thiết).

---

## 6. TanStack Query Hook Pattern

### Query hook (reads)

```ts
// features/game/queries/useGameSessionQuery.ts
import { useQuery } from "@tanstack/react-query";

export function useGameSessionQuery(gameId: string) {
  return useQuery({
    queryKey: ["game", gameId],
    queryFn: async () => {
      const res = await fetch(`/api/games/${gameId}`);
      if (!res.ok) throw new Error("Failed to fetch game session");
      const data = await res.json();
      return gameSessionSchema.parse(data); // ← Zod validate tại boundary
    },
    enabled: !!gameId,
  });
}
```

### Mutation hook (writes via Server Action)

```ts
// features/player/mutations/useSaveCareerPlayerMutation.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveCareerPlayer } from "@/actions/player.actions";

export function useSaveCareerPlayerMutation(gameId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveCareerPlayerInput) => saveCareerPlayer(input),
    onSuccess: () => {
      // Invalidate để Squad board tự re-fetch
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
    },
    onError: (error) => {
      // Handle error — show toast, etc.
      console.error("Failed to save player:", error);
    },
  });
}
```

---

## 7. Route Handlers (app/api/) — Scope & Rules

Route Handlers chỉ tồn tại cho:

1. **External consumers** — future mobile app, webhooks.
2. **TanStack Query reads** — nếu client component cần refetch data mà Server Component không cover được.

**Không được dùng Route Handlers cho:**
- Internal mutations — dùng Server Actions.
- Logic mà Server Component có thể xử lý trực tiếp.

### Route Handler pattern chuẩn

```ts
// app/api/games/[gameId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/supabase/server";
import { gameSessionSchema } from "@/types/game.types";

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const game = await prisma.gameSession.findUnique({
    where: { id: params.gameId },
    include: { players: true },
  });

  if (!game || game.userId !== session.userId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(gameSessionSchema.parse(game));
}
```

---

## 8. Zod Schema Validation

Mọi data crossing boundary (API response, Server Action input) phải qua Zod schema.

### Vị trí schema

```txt
types/
  game.types.ts          ← GameSession, Squad schemas
  player.types.ts        ← CareerPlayer, ClubStint, CareerEvent schemas
  wheel.types.ts         ← WheelCascadeResult, WheelOutcome schemas
  api.types.ts           ← Request/Response DTO schemas cho Route Handlers
```

### Pattern

```ts
// types/player.types.ts
import { z } from "zod";

export const careerPlayerSchema = z.object({
  id:             z.string().uuid(),
  name:           z.string(),
  nationality:    z.string(),
  position:       z.enum(["GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "ST", "RW"]),
  debutAge:       z.number().int().min(15).max(22),
  retireAge:      z.number().int().min(23).max(43),
  peakOvr:        z.number().int().min(45).max(99),
  cardRarity:     z.enum(["bronze", "silver", "gold", "rare_gold", "epic", "legendary"]),
  clubStints:     z.array(clubStintSchema),
  // hiddenStats KHÔNG được trả về trong API response
});

export type CareerPlayer = z.infer<typeof careerPlayerSchema>;
```

---

## 9. Error Shape

Tất cả error response từ Route Handlers dùng shape nhất quán:

```json
{
  "error": "NOT_FOUND",
  "message": "Game session not found or access denied.",
  "details": {}
}
```

### Error codes chuẩn

| Code | HTTP Status | Khi nào |
|---|---|---|
| `UNAUTHORIZED` | 401 | Chưa đăng nhập |
| `FORBIDDEN` | 403 | Đăng nhập rồi nhưng không có quyền |
| `NOT_FOUND` | 404 | Resource không tồn tại |
| `VALIDATION_FAILED` | 422 | Input không hợp lệ |
| `INTERNAL_ERROR` | 500 | Lỗi server không mong đợi |

Server Actions throw Error với message là error code — caller tự handle.

---

## 10. Danh sách Endpoints Hiện Tại

### Server Actions (Internal Mutations)

| Action | File | Mô tả |
|---|---|---|
| `createGameSession` | `actions/game.actions.ts` | Tạo game session mới |
| `deleteGameSession` | `actions/game.actions.ts` | Xóa game session |
| `saveCareerPlayer` | `actions/player.actions.ts` | Save player sau wheel cascade |
| `deleteCareerPlayer` | `actions/player.actions.ts` | Xóa player khỏi slot |

### Route Handlers (External / Client Refetch)

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| `GET` | `/api/games` | Danh sách game sessions của user | ✅ Required |
| `GET` | `/api/games/[gameId]` | Chi tiết một game + squad | ✅ Required |
| `GET` | `/api/players/[playerId]` | Chi tiết một career player | ✅ Required |

> **Note:** Route Handlers trên chỉ được tạo khi TanStack Query thực sự cần — Server Component có thể serve data trực tiếp trong nhiều trường hợp.

---

## 11. Hidden Stats Rule

`hiddenStats` (personality, professionalism, luckRating) **không bao giờ** được trả về trong API response hay expose ra client:

```ts
// ❌ BAD — expose hidden stats
return NextResponse.json({
  ...player,
  hiddenStats: player.hiddenStats,
});

// ✅ GOOD — strip hidden stats
const { hiddenStats, ...publicPlayer } = player;
return NextResponse.json(careerPlayerSchema.parse(publicPlayer));
```

Hidden stats chỉ được đọc bởi `features/career` service khi generate career events — không bao giờ đến client.

---

## 12. Checklist

### Trước khi thêm Server Action mới

- [ ] Input được validate bằng Zod schema.
- [ ] Auth + ownership được verify trước khi mutate.
- [ ] Business logic delegate sang feature service — action là thin wrapper.
- [ ] Không gọi `Math.random()` trong action.
- [ ] Caller invalidate đúng TanStack Query keys sau khi action success.
- [ ] Hidden stats không bị trả về trong response.

### Trước khi thêm Route Handler mới

- [ ] Xác nhận Server Component không thể phục vụ use case này.
- [ ] Auth check ở đầu handler.
- [ ] Response được parse qua Zod schema trước khi return.
- [ ] Error response dùng shape và code chuẩn.
- [ ] Không có business logic trong handler — delegate sang service.

### Trước khi thêm TanStack Query hook mới

- [ ] `queryKey` nhất quán và documented.
- [ ] Response được validate bằng Zod tại boundary.
- [ ] UI có loading, empty, và error state.
- [ ] Không store kết quả vào Zustand.

---

## 13. AI Agent Rules

Khi AI agent thêm hoặc sửa data integration:

1. Đọc `docs/module-boundaries.md` để hiểu module nào được làm gì.
2. Đọc `docs/environment-variables.md` để biết biến nào được dùng ở client vs server.
3. Tìm Server Action và query hook hiện có trước khi tạo mới.
4. Không gọi `fetch` trực tiếp từ React component — dùng TanStack Query hook.
5. Không store server truth trong Zustand.
6. Không expose `hiddenStats` ra bất kỳ API response hay client component nào.
7. Không đặt business logic trong Server Action hay Route Handler — delegate sang service.
8. Validate input/output bằng Zod tại mọi data boundary.
9. Sau mỗi mutation, invalidate đúng TanStack Query keys.
10. Không dùng Route Handler cho internal mutations — dùng Server Actions.

### Common mistakes cần tránh

- Fetch `POST /api/` từ component thay vì dùng Server Action.
- Store `CareerPlayer` hay `GameSession` data trong Zustand.
- Bỏ qua Zod validation vì "data đã được validate ở client rồi".
- Expose `hiddenStats` trong API response để debug.
- Đặt `Math.random()` trong Server Action hoặc Route Handler.
- Tạo Route Handler cho use case mà Server Component có thể xử lý.
