# Module Boundaries — Football Life

Mỗi feature module là một **UI và logic boundary** rõ ràng. Module không được tự ý truy cập data hoặc business logic của module khác nếu không qua interface được định nghĩa.

**Nguyên tắc cốt lõi:**

- `CareerPlayer` là source of truth duy nhất cho mọi dữ liệu của một cầu thủ.
- Wheel Engine là service duy nhất được phép tính weight và resolve spin.
- Club/League là reference data — không bị mutate bởi game logic.
- UI component không chứa business logic — chỉ render và dispatch action.

---

## `features/game`

Game Session là **container cao nhất** của một lần chơi. Nó quản lý vòng đời của một Squad XI từ lúc tạo đến khi hoàn thành hoặc xóa.

**Chứa:**
- CRUD cho `GameSession` (tạo, lưu, xóa game).
- Danh sách game sessions của user.
- Điều phối trạng thái của Squad XI (bao nhiêu slot đã filled).

**Không được:**
- Tính toán bất kỳ wheel weight nào.
- Trực tiếp mutate `CareerPlayer` — chỉ nhận kết quả từ `features/career`.
- Chứa logic hiển thị player card hay wheel animation.

**Boundary rule:** `game` biết về `GameSession` và mảng slot. Nó không biết bên trong mỗi slot có gì cho đến khi `features/career` trả về một `CareerPlayer` hoàn chỉnh.

---

## `features/squad`

Squad module quản lý **bàn đội hình** — 11 slot theo formation 4-3-3, hiển thị trạng thái filled/empty, và điều hướng user click vào slot để bắt đầu player generation.

**Chứa:**
- Pitch board component với 11 slot disc.
- Formation layout (vị trí % của từng slot trên pitch).
- Slot state: empty, loading (đang spin), filled.
- Squad Rating display (average peak OVR của 11 players).

**Không được:**
- Chứa wheel logic hay career generation logic.
- Trực tiếp tạo hay mutate `CareerPlayer`.
- Lưu squad state vào Zustand — squad data đến từ TanStack Query (server state).

**Boundary rule:** `squad` nhận `CareerPlayer[]` từ server và render chúng. Khi user click slot trống, nó chỉ trigger navigation hoặc open wheel flow — không tự xử lý logic bên trong.

---

## `features/wheel`

Wheel module là **UI layer của quá trình spin** — hiển thị từng wheel một theo cascade, animate vòng quay, và thu thập kết quả từng bước.

**Chứa:**
- Wheel spin screen (full-screen overlay hoặc dedicated view).
- Wheel visual component (SVG segments + Framer Motion animation).
- Step progress indicator (Step 1/7, Step 2/7...).
- Previous steps summary strip.
- Continue / Confirm button flow.

**Không được:**
- Tự tính wheel weights — phải gọi `lib/wheel-engine`.
- Gọi `Math.random()` trực tiếp — chỉ `lib/wheel-engine/spin-resolver` được làm điều này.
- Lưu intermediate spin results vào Zustand như game truth — chỉ lưu UI state tạm thời.
- Mutate `CareerPlayer` hay `GameSession` trực tiếp — sau khi spin xong, gọi Server Action.

**Zustand (UI state only):**
- `activeWheelStep: number` — bước hiện tại trong cascade.
- `spinState: 'idle' | 'spinning' | 'result'` — trạng thái animation wheel.
- `resolvedSteps: WheelStepResult[]` — kết quả tạm của từng bước (chưa persist).

**Boundary rule:** `wheel` là một UI orchestrator. Nó điều phối flow nhưng không quyết định kết quả — `lib/wheel-engine` quyết định. Sau khi cascade hoàn tất, toàn bộ kết quả được gửi đến `features/career` để generate `CareerPlayer` và persist.

---

## `features/career`

Career module là **trung tâm domain logic** của Football Life. Nó nhận seed data từ wheel cascade và generate toàn bộ career arc của một fictional player.

**Chứa:**
- `CareerGenerationService` — nhận `WheelCascadeResult` và trả về `CareerPlayer` đầy đủ.
- Recalculate dynamic stats and OVR timeline based on year-by-year wheels, plus retrospective Peak OVR extraction.
- Club stint distribution logic (phân bổ số năm cho từng club).
- Career events generation (link với real-world trophy history của club).
- Sub-stats generation theo position và OVR.
- Hidden stats generation.
- Server Actions để persist `CareerPlayer` sau generation.

**Không được:**
- Import React hoặc bất kỳ UI framework nào trong service files.
- Gọi `Math.random()` ngoài hàm được chỉ định — tất cả randomness đã xảy ra ở wheel engine, career chỉ dùng kết quả đó.
- Trực tiếp query Supabase hay Prisma — dùng data-access functions trong `lib/`.

**Boundary rule:** `career` nhận input (seed data từ wheel) và trả output (`CareerPlayer`). Đây là pure transformation service. Toàn bộ career data sau khi tạo được persist server-side — không bao giờ chỉ sống trong Zustand.

---

## `features/player`

Player module là **display layer** cho một `CareerPlayer` đã được generated và persisted.

**Chứa:**
- `PlayerCard` component (FIFA-style card với rarity style).
- `CareerModal` component (full career detail: OVR chart, club timeline, stats).
- `OvrChart` — line chart hiển thị OVR từ debut đến retirement.
- `ClubTimeline` — list các club stint với events.
- Name, flag, position, rarity badge display.

**Không được:**
- Tính toán bất kỳ game logic nào.
- Modify hay re-generate career data.
- Trực tiếp fetch data ngoài custom hook — dùng TanStack Query hooks.

**Boundary rule:** `player` là read-only presentation. Nó nhận `CareerPlayer` qua props hoặc query hook và chỉ render. Không có business logic nào sống trong module này.

---

## `features/modal` (Career Detail Modal)

Module quản lý **trạng thái UI của Career Detail Modal** — khi nào modal mở, player nào đang được xem.

**Chứa:**
- Zustand store: `selectedPlayerId`, `isModalOpen`.
- Modal wrapper component (overlay, close behavior, animation).
- Kết nối với `features/player` để render nội dung.

**Không được:**
- Chứa player data.
- Thực hiện bất kỳ computation nào.

**Boundary rule:** `modal` là UI state only. Nó biết modal đang mở hay đóng và đang xem player nào — không hơn không kém.

---

## `lib/wheel-engine`

Wheel Engine là **core domain library** của Football Life. Đây là nơi duy nhất chứa toàn bộ weight calculation logic và spin resolution.

**Chứa:**
- `WeightCalculator` — tính `FinalWeight` cho mỗi outcome dựa trên `CareerState` hiện tại.
- `SpinResolver` — nhận bảng weights, gọi `Math.random()` **một lần duy nhất**, trả về outcome.
- `WheelConfig` — định nghĩa outcome pool cho từng loại wheel (Nationality, Age, Debut Stats, v.v.).
- Modifier functions: `CareerModifier`, `AgeModifier`, `PositionModifier`, `NationalityModifier`.

**Formula:**
```
FinalWeight = BaseWeight
            + AgeModifier(age)
            + PositionModifier(position)
            + NationalityModifier(nationality)
            + UserBiasModifier(userInput)
```

**Không được:**
- Import React hay bất kỳ UI library nào.
- Gọi `Math.random()` ngoài `SpinResolver`.
- Biết về database schema hay Prisma.
- Chứa bất kỳ side effect nào (no I/O, no logging, no fetch).

**Boundary rule:** `lib/wheel-engine` là pure functional library. Cùng inputs → cùng weight table. Chỉ `SpinResolver` mới được gọi `Math.random()`, và chỉ một lần cho mỗi spin. Bất kỳ test nào cũng có thể mock `Math.random` để kiểm tra deterministically.

---

## `lib/probability`

Thư viện helper cho các phép tính xác suất và phân phối được dùng bởi `lib/wheel-engine` và `features/career`.

**Chứa:**
- `bellCurve(age, peakAge, debutOvr, peakOvr)` — tính OVR tại một độ tuổi.
- `distributeYears(total, count)` — phân bổ số năm cho N clubs.
- `weightedRandom(table)` — utility helper dùng bởi SpinResolver.
- `clamp(value, min, max)` — utility.

**Không được:**
- Import React.
- Gọi `Math.random()` trực tiếp — chỉ `weightedRandom` được làm điều này và phải được gọi qua `SpinResolver`.
- Biết về domain types ngoài số học thuần túy.

**Boundary rule:** Pure math utilities. Không có side effects.

---

## `lib/name-gen`

Thư viện sinh tên cầu thủ fictional theo quốc tịch.

**Chứa:**
- Name pools theo quốc gia (first name + surname arrays).
- `generateName(nationality: string): string` — pick random first + last name từ pool.

**Không được:**
- Gọi API hay database.
- Biết về game state.

**Boundary rule:** Stateless utility. Input nationality → output string name.

---

## `lib/supabase`

Chứa Supabase client instances. Không chứa business logic.

**Chứa:**
- `client.ts` — browser-side Supabase client (anon key).
- `server.ts` — server-side Supabase client (service role key).

**Boundary rule:** Chỉ export client instances. Business logic nằm ở domain services, không nằm ở đây.

---

## `actions/`

Server Actions là lớp mỏng giữa client và domain services.

**Quy tắc:**
- Validate input bằng Zod schema trước khi truyền vào service.
- Delegate toàn bộ business logic sang `features/<domain>/services/`.
- Không chứa game logic trực tiếp.
- Không import `lib/wheel-engine` trực tiếp — wheel resolution đã hoàn tất ở client trước khi gọi action.

```ts
// GOOD
export async function saveCareerPlayer(input: unknown) {
  const validated = saveCareerPlayerSchema.parse(input);
  return careerService.persist(validated);
}

// BAD
export async function saveCareerPlayer(input: unknown) {
  // ❌ business logic không được sống ở đây
  const player = { ...input, ovr: Math.random() * 100 };
  await db.insert(player);
}
```

---

## Dependency Graph

```
UI Layer (React Components)
    │
    ├── features/squad          reads  →  CareerPlayer[] (via query)
    ├── features/wheel          calls  →  lib/wheel-engine (weight calc)
    │                           calls  →  actions/ (persist result)
    ├── features/player         reads  →  CareerPlayer (via query/props)
    ├── features/career         reads  →  WheelCascadeResult
    │                           calls  →  lib/probability
    │                           calls  →  lib/name-gen
    │                           calls  →  actions/ (persist)
    └── features/game           reads  →  GameSession[] (via query)
    
Domain Layer (No React)
    │
    ├── lib/wheel-engine        depends on  →  lib/probability
    ├── lib/probability         (standalone)
    ├── lib/name-gen            (standalone)
    └── lib/supabase            (client factory only)

Data Layer
    │
    ├── actions/                calls  →  features/<domain>/services/
    │                           calls  →  prisma
    └── prisma/                 (schema + migrations)

Reference Data (Read-only)
    └── Club / League data      seeded via  →  scripts/
                                queried by  →  lib/wheel-engine (club pool)
                                             features/career (trophy history)
```

---

## Cross-Module Rules

| Từ module | Có thể gọi | Không được gọi |
|---|---|---|
| UI component | Query hooks, Server Actions, Zustand UI store | Domain services trực tiếp, Prisma, wheel engine trực tiếp |
| `features/wheel` | `lib/wheel-engine`, Zustand UI state, Actions | `features/career` service trực tiếp |
| `features/career` | `lib/probability`, `lib/name-gen`, Actions | React, Next.js, UI components |
| `lib/wheel-engine` | `lib/probability` | Anything else |
| `actions/` | Feature services, Prisma | React components, UI state |
| Server Components | Prisma, Supabase server client | Zustand, browser APIs |

---

## Zustand UI State — Allowed vs Forbidden

| State | Zustand? | Lý do |
|---|---|---|
| `activeWheelStep` | ✅ Yes | UI-only, không cần persist |
| `spinAnimationState` | ✅ Yes | UI-only animation state |
| `selectedPlayerId` | ✅ Yes | Which modal is open |
| `isCareerModalOpen` | ✅ Yes | Modal visibility |
| `resolvedWheelSteps[]` | ✅ Temporary | Cleared sau khi persist xong |
| `CareerPlayer` data | ❌ No | Server truth — dùng TanStack Query |
| `GameSession` data | ❌ No | Server truth — dùng TanStack Query |
| `WheelWeights` | ❌ No | Tính tại thời điểm spin, không cache |
| `ClubPool` | ❌ No | Server data — dùng query |
