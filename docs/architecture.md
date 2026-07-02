# Football Life — Architecture

Football Life là một web game mô phỏng sự nghiệp cầu thủ bóng đá, chạy trên nền Next.js 15 App Router. Đây không phải là CRUD app hay dashboard — đây là một **probability-driven simulation game** có nguồn gốc từ trend Random Wheel Football Career trên social media, được productize thành một standalone game với career persistence và dynamic weighted outcomes.

---

## Layer Boundaries

### App Layer (`app/`)

Next.js App Router định nghĩa routing và layout. Tất cả pages trong `app/` đều là Server Components theo mặc định — chúng fetch data trực tiếp qua Prisma hoặc Supabase server client và pass xuống Client Components qua props.

- `app/(auth)/` — Auth-gated routes: login, register, callback.
- `app/(game)/` — In-game routes: home, game session, squad board, wheel spin.
- `app/api/` — Route Handlers dành cho external consumers và TanStack Query reads. Không chứa internal mutation logic.

### Feature Layer (`features/`)

Domain-scoped modules. Mỗi feature co-locate logic và UI của một domain cụ thể. Feature modules không được import lẫn nhau trực tiếp — communication đi qua shared types, Server Actions, hoặc TanStack Query.

- `features/game/` — Game session lifecycle.
- `features/squad/` — Pitch board, slot management, Squad Rating.
- `features/wheel/` — Wheel spin UI flow, step orchestration, animation.
- `features/career/` — Career player generation từ wheel cascade results. Đây là core domain logic của game.
- `features/player/` — Player card display, career detail modal.

### Actions Layer (`actions/`)

Server Actions là lớp mỏng duy nhất được phép mutate database từ phía client. Actions validate input bằng Zod, verify auth và ownership, rồi delegate toàn bộ business logic sang feature services. Actions không chứa game logic.

### Library Layer (`lib/`)

Core domain utilities không phụ thuộc vào React hay Next.js.

- `lib/wheel-engine/` — Dynamic Weighted Wheel: weight calculation và spin resolution. Đây là algorithmic core của game. `Math.random()` chỉ được gọi trong `spin-resolver.ts` — không có exception.
- `lib/probability/` — Bell curve weight distribution, year distribution, math helpers.
- `lib/name-gen/` — Fictional player name generation theo nationality.
- `lib/supabase/` — Supabase client factory. Không chứa business logic.
- `lib/prisma.ts` — Prisma client singleton.

### Component Layer (`components/`)

Shared, domain-agnostic UI components. Components không chứa business logic — chỉ render và emit events.

- `components/ui/` — shadcn/ui base components.
- `components/shared/` — Shared game-agnostic components: layout, navigation, toast.

### Types Layer (`types/`)

Shared TypeScript types và Zod schemas. Types trong đây được dùng bởi cả feature services, Server Actions, Route Handlers, và client components.

---

## Truth Model

**`CareerPlayer`** là source of truth duy nhất cho một cầu thủ fictional. Một khi được generated và persisted, career data không bị mutate bởi bất kỳ UI interaction nào — nó chỉ được đọc và display.

**`GameSession`** là container của một Squad XI. Nó biết có bao nhiêu slot đã được filled và tổng Squad Rating.

**Wheel Engine** quyết định outcomes — không phải UI. UI orchestrate flow, hiển thị animation, và collect user preference (nationality bias), nhưng tất cả probability logic nằm trong `lib/wheel-engine/`.

**Hidden Stats** (personality, professionalism, luckRating) là internal-only — chúng ảnh hưởng career event generation nhưng không bao giờ được expose ra client hay API response.

Official writes phải đi qua Server Actions → Feature Services → Prisma. Không có direct database access từ client components.

---

## State Management

**Zustand** chỉ dùng cho transient UI state: active wheel step, spin animation state, modal open/close, selected player ID. Không có game truth sống trong Zustand.

**TanStack Query** là cache layer cho server state: game sessions, squad data, player detail. Query keys phải được invalidate sau mỗi successful mutation.

**Server Components** fetch initial page data trực tiếp — không cần TanStack Query cho first load.

---

## Wheel Engine Invariant

Toàn bộ wheel weight calculation là deterministic. `Math.random()` chỉ được gọi một lần duy nhất tại `lib/wheel-engine/spin-resolver.ts` để resolve final outcome từ bảng weights đã tính. Bất kỳ test nào cũng có thể mock `Math.random()` để verify outcomes một cách deterministic.

```
FinalWeight = BaseWeight
            + AgeModifier
            + PositionModifier
            + NationalityModifier
            + UserBiasModifier
```

Wheel outcomes phải được logged vào `WheelSpin` record trước khi career state được mutate.

---

## Current Scaffold

Dự án hiện tại ở giai đoạn **documentation only** — chưa có implementation code. Tài liệu đã có:

- `docs/game-design.md` — Game mechanics, wheel cascade, career simulation rules.
- `docs/module-boundaries.md` — Module responsibilities và cross-module rules.
- `docs/api-integration.md` — Server Actions vs Route Handlers, data flow patterns.
- `docs/environment-variables.md` — Environment variable scope và rules.
- `docs/frontend-style-system-guide.md` — Design system, tokens, component patterns.
- `docs/ai-agent-rules.md` — Rules cho AI coding agents.

Implementation bắt đầu từ Phase 1: project setup, auth, database schema, và data seeding.
