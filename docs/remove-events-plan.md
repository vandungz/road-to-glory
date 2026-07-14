# Remove Events Array — Implementation Plan

> Tracking file: bỏ `events[]` + `TimelineHistory` UI, giữ nguyên đầy đủ feature logic game.

---

## Bối cảnh & Mục tiêu

`events` array hiện đang làm 3 việc:
1. **Hiển thị Timeline UI** (`TimelineHistory.tsx`) → muốn bỏ để tránh scroll
2. **Tính `careerTotalStats`** (apps/goals/assists tổng) → thay bằng `statsTimeline.reduce()`
3. **Lưu trophies + individual awards** → thay bằng cấu trúc `achievements` mới

---

## Audit kết quả — Những gì bị ảnh hưởng

### Những gì CÓ THỂ xóa hoàn toàn (không cần thay thế)
| Thứ | Lý do |
|---|---|
| `TimelineHistory.tsx` | UI component đang bị bỏ |
| `initEvent` (DEBUT event) trong `career-setup.service.ts` | Chỉ dùng cho Timeline |
| `PlayerCareerDialog.tsx` — fallback regex parse trophies từ events (80 dòng) | Không còn events để parse |
| `PlayerCareerDialog.tsx` — `timelineYears` / per-year event cards block | Không còn events để render |
| Milestone "Cầu thủ then chốt" trong `season-simulator.service.ts` | Bỏ hoàn toàn, không lưu lại |

### Những gì CẦN THAY THẾ (có nguy cơ mất feature)

| Feature hiện dùng events | Nằm ở đâu | Thay thế bằng |
|---|---|---|
| `careerTotalStats` (apps/goals/assists) | `useCareerStats.ts` line 119–131 | `statsTimeline.reduce()` — data đã có |
| Ballon d'Or badge ở RetiredStage | `RetiredStage.tsx` line 91 — `events.some(...)` | `achievements.ballonDor > 0` |
| Trophies list trong PlayerCareerDialog | parse events text | `achievements.trophies[]` mới |
| **Individual awards** (giày vàng, găng tay vàng, đội hình tiêu biểu) | `yearSimResult.events` → stored vào career events | `achievements.seasonAwards[]` mới |
| Season stats per year trong PlayerCareerDialog | `year.snap` từ `statsTimeline` | Đã ok — `statsTimeline` đã có |
| Transfer history per year trong PlayerCareerDialog | `year.events.filter(type=TRANSFER)` | `clubStints` — đã có startAge/endAge |
| Resume career: `getCareerPlayerAction` trả về events | `actions/player.actions.ts` | Xóa `events` khỏi select |
| Background save: `updateSeasonProgressAction` lưu events | `actions/season.actions.ts` | Xóa `events` khỏi payload |

---

## ⚠️ Điểm quan trọng nhất: Individual Awards bị mất nếu không xử lý

`yearSimResult.events` (sinh bởi `season-simulator.service.ts`) tạo ra các loại event sau:

```ts
{ type: "milestone",          label: "Cầu thủ then chốt thi đấu 32 trận" }  ← XÓA, không lưu
{ type: "individual_award",   label: "Đoạt chiếc giày vàng CLB với 22 bàn" }
{ type: "individual_award",   label: "Đoạt Găng tay vàng với 16 trận giữ sạch" }
{ type: "individual_award",   label: "Lọt vào Đội hình tiêu biểu mùa giải với Rating 7.82" }
```

Milestone bị bỏ hoàn toàn — không generate, không lưu.
Individual awards vẫn được lưu vào `achievements.seasonAwards[]`.

---

## Schema mới cho `achievements`

### Hiện tại (không thể biết mùa giải nào)
```ts
{
  ballonDor: 2,
  leagues:       { "Premier League (Arsenal)": 2 },
  cups:          { "FA Cup (Chelsea)": 1 },
  continentals:  { "UCL (Real Madrid)": 1 },
  internationals:{ "FIFA World Cup (Vietnam)": 1 }
}
```

### Mới (có ngữ cảnh đầy đủ)
```ts
{
  ballonDor: 2,

  // Mỗi phần tử = 1 lần đoạt danh hiệu, có age để tính mùa giải
  trophies: [
    { type: "league",        name: "Premier League",         club: "Arsenal",     age: 21 },
    { type: "league",        name: "Premier League",         club: "Arsenal",     age: 23 },
    { type: "cup",           name: "FA Cup",                 club: "Chelsea",     age: 27 },
    { type: "continental",   name: "UEFA Champions League",  club: "Real Madrid", age: 29 },
    { type: "international", name: "FIFA World Cup",         club: "🇻🇳",          age: 25 },
  ],

  // Chỉ individual awards, có age để gắn vào đúng mùa
  seasonAwards: [
    { type: "individual_award", label: "Chiếc giày vàng CLB với 22 bàn",              age: 21 },
    { type: "individual_award", label: "Đội hình tiêu biểu mùa giải với Rating 7.82", age: 23 },
    { type: "individual_award", label: "Găng tay vàng với 16 trận giữ sạch",           age: 25 },
  ]
}
```

Mùa giải được tính ngay tại UI: `2025 + (age - debutAge)` — không cần lưu string.

**DB:** Không cần thay đổi schema (cột `achievements` đã là `Json`). Cầu thủ cũ trong DB sẽ bị xóa — không cần backward compat.

---

## Verify: Tất cả feature hiện có có bị mất không?

| Feature | Hiện dùng events? | Sau khi xóa events |
|---|---|---|
| Tổng apps/goals/assists trên Panini sticker | ✅ parse events | ✅ statsTimeline.reduce — KHÔNG MẤT |
| Tổng apps/goals/assists trong PlayerCareerDialog | ✅ parse events | ✅ statsTimeline.reduce — KHÔNG MẤT |
| Ballon d'Or badge (RetiredStage) | ✅ events.some() | ✅ achievements.ballonDor > 0 — KHÔNG MẤT |
| Ballon d'Or count (PlayerCareerDialog) | ✅ events parse | ✅ achievements.ballonDor — KHÔNG MẤT |
| Trophy list: leagues/cups/continental/international | ✅ events parse (fallback) | ✅ achievements.trophies[] — KHÔNG MẤT |
| Trophy có tên CLB + mùa giải | ❌ không có mùa giải | ✅ achievements.trophies[].age — SẼ CÓ THÊM |
| Individual awards (giày vàng, găng tay vàng, tiêu biểu) | ✅ events | ⚠️ CẦN chuyển vào achievements.seasonAwards |
| Milestone (cầu thủ then chốt) | ✅ events | 🗑️ BỎ HOÀN TOÀN — không generate, không lưu |
| Stats per season (apps/goals/rating mỗi mùa) | ✅ year.snap từ statsTimeline | ✅ statsTimeline đã có — KHÔNG MẤT |
| Transfer history per year | ✅ events TRANSFER | ✅ clubStints có startAge/endAge — KHÔNG MẤT |
| Resume career: restore events | ✅ getCareerPlayerAction | ✅ không cần restore nữa |
| Timeline UI | ✅ events render | 🗑️ BỎ ĐI (mục tiêu) |

---

## Files bị ảnh hưởng — chi tiết

### XÓA
```
features/wheel/components/TimelineHistory.tsx       ← xóa file
```

### SỬA — Logic

```
season-simulator.service.ts
  └── Xóa toàn bộ block milestone: if (apps >= Math.round(maxSeasonMatches * 0.8)) {
        events.push({ type: "milestone", label: "Cầu thủ then chốt..." })
      }

useCareerStats.ts
  ├── Xóa state: events, setEvents
  ├── Xóa tất cả setEvents() calls (8 chỗ + forEach từ yearSimResult.events)
  ├── Cập nhật setAchievements trong handleNextSeason:
  │     thay vì { leagues: { key: count } }
  │     → push vào achievements.trophies[] với { type, name, club, age }
  │     → push vào achievements.seasonAwards[] chỉ những event type === "individual_award"
  │       (bỏ qua type === "milestone")
  ├── Đổi careerTotalStats (useMemo):
  │     from: parse events PERFORMANCE regex
  │     to:   statsTimeline.reduce(apps/goals/assists)
  └── handleSavePlayer: bỏ finalEvents (RETIREMENT event append)

actions/season.actions.ts
  ├── SeasonProgressUpdate interface: xóa field events
  └── updateSeasonProgressAction: xóa events khỏi prisma update data

actions/player.actions.ts
  ├── InitCareerParams: xóa field events
  ├── SavePlayerParams: xóa field events  
  ├── initCareerPlayerAction: xóa events từ create/update
  ├── saveCareerPlayer: xóa events từ create/update
  └── getCareerPlayerAction: xóa events: true khỏi select

useDraftDrum.ts
  ├── Xóa events khỏi destructure statsProps
  ├── Xóa statsProps.setEvents(player.events) khỏi mount useEffect
  ├── Xóa events khỏi updateSeasonProgressAction call
  └── Xóa events khỏi initCareerPlayerAction call

career-setup.service.ts
  ├── Xóa initEvent (type CareerEvent, const initEvent, return initEvent)
  └── Cập nhật return type CareerSetupResult: xóa initEvent field

DraftDrumScreen.tsx
  ├── Xóa events khỏi destructure useDraftDrum
  ├── Xóa <TimelineHistory events={events} ... />
  └── Xóa events prop truyền xuống RetiredStage
```

### SỬA — UI

```
RetiredStage.tsx
  ├── Xóa events từ props interface + destructure
  └── Đổi: events.some(e => e.label.includes("BALLON D'OR"))
       thành: achievements?.ballonDor > 0
       (cần nhận thêm prop achievements hoặc đọc từ prop đã có)

PlayerCareerDialog.tsx
  ├── Xóa: const events = player?.events ?? []
  ├── Xóa: timelineYears useMemo (toàn bộ logic merge events + snap)
  ├── Xóa: trophiesList fallback parse từ events (80 dòng)
  ├── Đổi trophiesList: đọc từ achievements.trophies[] mới
  ├── Đổi per-year display:
  │     - Stats: vẫn dùng statsTimeline (ok)
  │     - Awards per year: achievements.seasonAwards.filter(a => a.age === age)
  │     - Transfer per year: clubStints (ok)
  └── Xóa: events?: any[] khỏi dependency

types/squad.ts
  └── ClientSafePlayer: xóa field events?: any[]

app/(game)/[gameId]/page.tsx
  └── prisma select players: xóa events: true
```

---

## Thứ tự implement

1. **Xóa milestone block** trong `season-simulator.service.ts`
2. **Đổi schema `achievements`** trong `useCareerStats.ts` (handleNextSeason) — thêm trophies[] + seasonAwards[], chỉ filter `individual_award`
3. **Đổi `careerTotalStats`** trong `useCareerStats.ts` — sang statsTimeline.reduce()
4. **Xóa `events` state + setEvents calls** trong `useCareerStats.ts`
5. **Cập nhật `career-setup.service.ts`** — xóa initEvent
6. **Cập nhật actions** — `season.actions.ts`, `player.actions.ts`
7. **Cập nhật `useDraftDrum.ts`** — xóa events refs, cập nhật mount useEffect
8. **Cập nhật `RetiredStage.tsx`** — achievements.ballonDor thay events.some()
9. **Cập nhật `PlayerCareerDialog.tsx`** — đọc từ schema mới
10. **Xóa `TimelineHistory.tsx`** + dọn DraftDrumScreen
11. **Dọn types** — ClientSafePlayer, Squad Board page

---

## Định nghĩa "done"

- [ ] Không còn `events` state ở bất kỳ hook nào
- [ ] `careerTotalStats` tính từ `statsTimeline.reduce()` — số liệu khớp với trước
- [ ] Ballon d'Or badge ở RetiredStage vẫn hiển thị đúng
- [ ] `PlayerCareerDialog` hiển thị: trophies (có tên CLB + mùa giải), individual awards per mùa, stats per mùa
- [ ] Individual awards (giày vàng, găng tay vàng, đội hình tiêu biểu) vẫn được lưu và hiển thị
- [ ] Milestone "cầu thủ then chốt" không còn được generate hoặc hiển thị ở bất kỳ đâu
- [ ] Layout game không còn phải scroll để xem Timeline
- [ ] Build TypeScript clean, không có lỗi
