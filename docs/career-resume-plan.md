# Career Resume — Implementation Plan

> Tracking file cho bug fix: user không thể tiếp tục career sau khi thoát giữa chừng.

---

## Bối cảnh

`updateSeasonProgressAction` đã **lưu** career state lên DB sau mỗi mùa, nhưng chưa bao giờ có flow **đọc lại** (read-back) khi user quay lại trang. Career state sống hoàn toàn trong React `useState` — mất sau mỗi lần unmount.

Trước đây "hoạt động được" là nhờ Zustand store còn trong memory khi navigate đi rồi về trong cùng session. Fix `resetDraft()` on-mount đã expose lỗ hổng này.

---

## Root Cause

```
Mount useEffect (useDraftDrum.ts)
  ├── resetDraft()       ← xóa Zustand cho MỌI trường hợp
  └── setMode("setup")  ← luôn về setup, kể cả khi savedPlayerId tồn tại
```

Không có flow restore career state từ DB → user bị đẩy về setup stage, bị force re-spin 11 wheels cho cùng 1 slot.

---

## Những gì BE đã lưu

`updateSeasonProgressAction` lưu sau mỗi mùa:

| Field | Lưu? |
|---|---|
| `statsTimeline` | ✅ |
| `clubStints` | ✅ |
| `events` | ✅ |
| `currentContinentalCup` | ✅ |
| `achievements` | ❌ Thiếu — chỉ lưu khi `saveCareerPlayer` (retirement) |

---

## Các thay đổi cần làm

### [ ] Fix 1 — Thêm `achievements` vào `updateSeasonProgressAction`

**File:** `actions/season.actions.ts`

Thêm `achievements` vào payload update:

```ts
await prisma.careerPlayer.update({
  where: { id: playerId },
  data: {
    statsTimeline,
    clubStints,
    events,
    currentContinentalCup,
    achievements,   // ← THÊM
  },
});
```

Cập nhật schema Zod `SeasonProgressUpdate` để nhận thêm `achievements`.

Cập nhật call site trong `useDraftDrum.ts` (background save useEffect) để truyền thêm `achievements`.

---

### [ ] Fix 2 — New Server Action: `getCareerPlayerAction`

**File:** `actions/player.actions.ts`

```ts
export async function getCareerPlayerAction(input: unknown) {
  const { playerId } = z.object({ playerId: z.string().uuid() }).parse(input);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const player = await prisma.careerPlayer.findUnique({
    where: { id: playerId },
    select: {
      gameSession: { select: { userId: true } },
      name: true,
      nationality: true,
      debutAge: true,
      careerLengthYears: true,
      statsTimeline: true,
      clubStints: true,
      events: true,
      achievements: true,
      currentContinentalCup: true,
      // hiddenStats: KHÔNG trả về — vi phạm invariant
    },
  });

  if (!player || player.gameSession.userId !== user.id) throw new Error("Forbidden");

  return player;
}
```

**Lưu ý:** `hiddenStats` KHÔNG được trả về client (invariant). Hệ quả: resume session dùng `luckRating = 10` (default). Acceptable.

---

### [ ] Fix 3 — Conditional logic trong mount useEffect

**File:** `features/wheel/hooks/useDraftDrum.ts`

```ts
useEffect(() => {
  const controller = new AbortController();

  if (savedPlayerId) {
    // Resume in-progress career
    getCareerPlayerAction({ playerId: savedPlayerId }).then((player) => {
      if (controller.signal.aborted || !player) return;

      const lastStats = (player.statsTimeline as any[]).at(-1);
      const lastStint = (player.clubStints as any[]).at(-1);
      const fullClub = clubs.find((c) => c.id === lastStint?.clubId);

      // Defensive: nếu không có data thì fallback về setup
      if (!lastStats || !lastStint) {
        resetDraft();
        setMode("setup");
        setIsMounted(true);
        return;
      }

      // Restore identity
      statsProps.setPlayerId(savedPlayerId);
      statsProps.setPlayerName(player.name);
      statsProps.setPlayerNationality(player.nationality);
      statsProps.setPlayerDebutAge(player.debutAge);
      statsProps.setPlayerCareerLength(player.careerLengthYears);

      // Restore timeline & history
      statsProps.setStatsTimeline(player.statsTimeline as any[]);
      statsProps.setClubStints(player.clubStints as any[]);
      statsProps.setEvents(player.events as any[]);
      statsProps.setAchievements(
        (player.achievements as any) ?? { ballonDor: 0, leagues: {}, cups: {}, continentals: {}, internationals: {} }
      );

      // Restore current season state từ last statsTimeline entry
      statsProps.setCurrentAge(lastStats.age);
      statsProps.setCurrentOvr(lastStats.ovr);
      const statKeys = position === "GK"
        ? ["div", "han", "kic", "ref", "spd", "pos"]
        : ["pac", "sho", "pas", "dri", "def", "phy"];
      statsProps.setCurrentStats(
        Object.fromEntries(statKeys.map((k) => [k, lastStats[k] ?? 60]))
      );

      // Restore currentClub từ last clubStint
      statsProps.setCurrentClub({
        id: lastStint.clubId,
        name: lastStint.clubName,
        leagueId: lastStint.leagueId,
        leagueName: lastStint.leagueName,
        prestige: fullClub?.prestige ?? 3,
        continentalType: fullClub?.continentalType ?? "none",
      });

      // currentContinentalCup đã có qua savedContinentalCup prop
      if (savedContinentalCup) {
        statsProps.setCurrentContinentalCup(savedContinentalCup);
      }

      // prevAgeRef phải được sync để tránh background save bắn ngay
      prevAgeRef.current = lastStats.age;

      setCareerSubStep("idle");
      setMode("career");
      setIsMounted(true);
    }).catch(() => {
      // Nếu fetch lỗi, fallback về setup
      if (!controller.signal.aborted) {
        resetDraft();
        setMode("setup");
        setIsMounted(true);
      }
    });
  } else {
    // Fresh slot
    resetDraft();
    setMode("setup");
    setIsMounted(true);
  }

  return () => controller.abort();
}, []);
```

---

## Trade-off chấp nhận được

| | Hành vi trên resume | Lý do chấp nhận |
|---|---|---|
| `hiddenStats` | `null` → `luckRating = 10` cho session đó | Invariant không cho phép đọc từ DB về client |
| `lastYearStanding` | Default 10 | Không có chỗ lưu trong DB |
| `seasonRecords` | Rỗng | UI state thuần túy, re-accumulate khi chơi tiếp |
| Mid-season spin | Mất, user restart mùa từ "idle" | Background save chỉ fire sau mỗi mùa hoàn chỉnh |
| Career ở retirement stage chưa save | Resume vào career mode, spin lại mùa cuối | `statsTimeline` trong DB không có entry `retireAge` (background save không fire khi retire) |

---

## Edge cases phải handle

| Case | Xử lý |
|---|---|
| `statsTimeline` rỗng | Fallback về setup stage |
| Club không tìm thấy trong `clubs` prop | `prestige: 3, continentalType: "none"` |
| Component unmount trước khi fetch xong | `AbortController` — bỏ qua kết quả |
| `prevAgeRef.current` sau restore | Set bằng `lastStats.age` trước khi setMode, tránh background save bắn ngay |
| `getCareerPlayerAction` throw | Fallback về setup stage |
| `achievements` null trong DB | Default `{ ballonDor: 0, leagues: {}, cups: {}, continentals: {}, internationals: {} }` |

---

### [ ] Fix 4 — Squad Board: hiển thị trạng thái "Đang chơi" cho in-progress slot

Hiện tại Squad Board chỉ phân biệt 2 trạng thái: **Empty** (chưa có player) và **Filled** (player đã retired). Cần thêm trạng thái thứ 3: **In-Progress** (player đang chơi mid-career).

#### 4a — Data layer: fetch in-progress slots

**File:** `app/(game)/[gameId]/page.tsx`

Fetch thêm danh sách slot đang có player chưa retired (chỉ lấy `slotIndex`, không lấy career data):

```ts
const inProgressPlayers = await prisma.careerPlayer.findMany({
  where: { gameSessionId: gameId, isRetired: false },
  select: { slotIndex: true },
});
const inProgressSlots = inProgressPlayers.map((p) => p.slotIndex);
```

Truyền `inProgressSlots` xuống:
```
SquadBoardPage → SquadDashboard → PitchBoard
                               → SquadSheet (Starting XI list)
```

#### 4b — UI: `InProgressSlot` component trong `PitchBoard.tsx`

Ba trạng thái hiển thị trên pitch:

| Trạng thái | Visual | Hành động khi click |
|---|---|---|
| **Empty** | Capsule trắng mờ, label = position | Navigate → `/[gameId]/draft/[slotIndex]` |
| **In-Progress** | Capsule amber, icon ▶, label = position | Navigate → `/[gameId]/draft/[slotIndex]` (resume) |
| **Retired** | Mini Panini sticker, có OVR + tên | Mở dialog xem career (read-only) |

Design `InProgressSlot`:
- Background: `rgba(251, 191, 36, 0.25)` (amber mờ)
- Border: `rgba(251, 191, 36, 0.8)` (amber)
- Text color: `#fbbf24`
- Hiển thị: `▶ {position}` hoặc position + dấu hiệu đang active
- Hover: brighten + scale như `EmptySlot`
- Không có animation phức tạp — giữ consistent với retro design system

```tsx
function InProgressSlot({ position, onClick }: { position: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        backgroundColor: "rgba(251,191,36,0.22)",
        border: "1.5px solid rgba(251,191,36,0.85)",
        borderRadius: "20px",
        padding: "6px 14px",
        color: "#fbbf24",
        fontFamily: "var(--font-headline)",
        fontSize: "0.75rem",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
        // ... same hover pattern as EmptySlot
      }}
    >
      ▶ {position}
    </button>
  );
}
```

#### 4c — Starting XI list (SquadSheet / SquadDashboard)

Trong bảng Starting XI bên phải, hàng in-progress slot hiển thị:
- POS: coral (như empty)
- PLAYER: `▶ Đang chơi...` (italic hoặc muted)
- OVR: `—`
- Clickable → navigate to draft page để resume

#### 4d — Logic trong `SquadDashboard.tsx`

```ts
function handleRowClick(slotIndex: number, player?: ClientSafePlayer) {
  if (player) {
    setSelectedPlayer(player); // retired → open dialog
  } else {
    if (status === "completed") return;
    router.push(`/${gameId}/draft/${slotIndex}`); // empty hoặc in-progress → cùng action
  }
}
```

Logic không cần thay đổi — in-progress slot navigate đến draft page giống empty slot. Sự khác biệt chỉ ở **visual**.

---

## Files bị ảnh hưởng

```
actions/player.actions.ts                    ← thêm getCareerPlayerAction
actions/season.actions.ts                    ← thêm achievements vào updateSeasonProgressAction
features/wheel/hooks/useDraftDrum.ts         ← fix mount useEffect, fix background save
app/(game)/[gameId]/page.tsx                 ← fetch inProgressSlots
features/squad/components/SquadDashboard.tsx ← nhận + pass inProgressSlots prop
features/squad/components/PitchBoard.tsx     ← thêm InProgressSlot component + logic
```

Không cần thay đổi schema DB, không cần migration.

---

## Thứ tự implement

1. Fix 1 (achievements trong background save) — nhỏ, nên làm trước để data đúng ngay
2. Fix 2 (getCareerPlayerAction) — viết action mới
3. Fix 3 (mount useEffect) — tích hợp action vào hook
4. Fix 4 (Squad Board UI) — thêm InProgressSlot, fetch inProgressSlots

---

## Định nghĩa "done"

- [ ] User chơi đến mùa 5, thoát ra, quay lại → thấy career panel đúng mùa 5, stats đúng, club đúng
- [ ] Achievements (league, cup, etc.) được giữ lại sau resume
- [ ] Fresh slot vẫn bắt đầu từ setup wheel bình thường
- [ ] Slot đã retired vẫn hiển thị đúng trên Squad Board, không cho resume
- [ ] Slot đang in-progress hiển thị capsule amber `▶ {position}` trên pitch
- [ ] Slot in-progress trong Starting XI list hiển thị `▶ Đang chơi...`
- [ ] Click vào slot in-progress → navigate đúng vào draft page và resume career
