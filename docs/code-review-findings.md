# Code Review Findings

> Ngày kiểm tra: 2026-07-11  
> Người kiểm tra: Claude (AI review)  
> Branch: main

---

## Tóm tắt

7 vấn đề được phát hiện, từ bug logic đến code smell. Không có vấn đề nào gây crash ngay lập tức, nhưng có 2 vấn đề ảnh hưởng đến gameplay correctness (#1, #2) và 1 vấn đề bảo mật tiềm ẩn (#6).

---

## Danh sách vấn đề

### [BUG-01] World Cup year check không nhất quán

**Mức độ:** Medium  
**Files:**
- `features/wheel/lib/career-wheel-resolver.ts:284`
- `features/wheel/hooks/useDraftDrum.ts:129`

**Mô tả:**  
Hai nơi tính năm World Cup bằng logic khác nhau:

```ts
// career-wheel-resolver.ts — dùng tuổi cầu thủ
const tourney = ctx.currentAge % 4 === 0 ? "FIFA World Cup" : nationCup;

// useDraftDrum.ts — dùng năm thực
const currentYear = 2026 + (currentAge - playerDebutAge);
const tourney = currentYear % 4 === 2 ? "FIFA World Cup" : nationCup;
```

`currentAge % 4 === 0` không liên quan đến lịch thi đấu thực. Logic đúng là kiểm tra `currentYear % 4 === 2` (World Cup diễn ra năm 2026, 2030, 2034...).

**Cách fix:**  
Trong `career-wheel-resolver.ts`, tính `currentYear` từ context và dùng `currentYear % 4 === 2`.

---

### [BUG-02] Cờ quốc gia Singapore hardcode

**Mức độ:** Medium  
**File:** `features/wheel/lib/career-wheel-resolver.ts:263`

**Mô tả:**  
```ts
tempValue = result === "called_up" ? "ĐƯỢC TRIỆU TẬP ĐTQG! 🇸🇬" : "Không được gọi";
```
Cờ `🇸🇬` (Singapore) bị hardcode cho mọi quốc tịch.

**Cách fix:**  
```ts
import { getFlagEmoji } from "@/types/squad";

tempValue = result === "called_up"
  ? `ĐƯỢC TRIỆU TẬP ĐTQG! ${getFlagEmoji(ctx.playerNationality)}`
  : "Không được gọi";
```

---

### [BUG-03] Personality distribution bị bias

**Mức độ:** Low  
**File:** `features/career/services/career-setup.service.ts:58`

**Mô tả:**  
```ts
const personality = personalityPool[Math.floor(Math.random() * professionalism) % personalityPool.length];
```
Khi `professionalism = 1`, `Math.floor(Math.random() * 1) = 0` — luôn ra `personalityPool[0]` ("Loyal").  
Khi `professionalism = 6`, chỉ các index 0..5 xuất hiện, bỏ qua "Temperamental" (index 5 bị `% 6` = 0) và "Normal" (index 6).

**Cách fix:**  
```ts
const personality = personalityPool[Math.floor(Math.random() * personalityPool.length)];
```

---

### [CODE-01] Typo / duplicate field trong hiddenStats

**Mức độ:** Low  
**File:** `features/career/services/career-setup.service.ts:60-65`

**Mô tả:**  
```ts
const hiddenStats = {
  luckRating,
  professionalness: professionalism,  // ← typo, cùng giá trị với dòng dưới
  professionalism,
};
```
`professionalness` là lỗi đánh máy, lưu cùng giá trị với `professionalism`.  
Điều này cũng được phản ánh trong interface `CareerSetupResult` tại dòng 43: comment nói "Tên biến trong DB là professionalism nhưng DB Schema map Json. Ta dùng professionalism".

**Cách fix:**  
Xóa dòng `professionalness: professionalism` và kiểm tra toàn bộ codebase không còn reference đến `professionalness`.

---

### [CODE-02] Global window hack trong career spin

**Mức độ:** Medium  
**File:** `features/wheel/hooks/useDraftDrum.ts:223`

**Mô tả:**  
```ts
(window as any)._tempCareerResult = result;
```
Kết quả spin được lưu vào `window` object để truyền từ `handleCareerSpin` sang `handleCareerSpinComplete`. Đây là anti-pattern:
- Race condition nếu user trigger spin nhanh
- Không testable (cần `window` mock)
- Không rõ ràng về data flow

**Cách fix:**  
Dùng `useRef`:
```ts
const tempCareerResultRef = useRef<any>(null);

// Trong handleCareerSpin:
tempCareerResultRef.current = result;

// Trong handleCareerSpinComplete:
const result = tempCareerResultRef.current;
```

---

### [CODE-03] Dead code — match-simulator.ts

**Mức độ:** Low  
**File:** `lib/simulation-engine/match-simulator.ts`

**Mô tả:**  
File này là phiên bản cũ của season simulator (trước khi migrate sang `features/season/services/season-simulator.service.ts`). Hiện tại không có file nào import từ đây.

**Cách fix:**  
Xóa file `lib/simulation-engine/match-simulator.ts` và thư mục `lib/simulation-engine/` nếu không còn dùng.

---

### [SEC-01] Dữ liệu club từ client không được validate trong Server Action

**Mức độ:** Medium  
**File:** `actions/season.actions.ts:184-203`

**Mô tả:**  
`generateLeagueTableAction` nhận `currentLeagueClubsRaw` từ client nhưng Zod schema không khai báo field này:

```ts
const generateLeagueTableSchema = z.object({
  leagueId: z.string(),
  playerClubId: z.string(),
  playerClubName: z.string(),
  playerStanding: z.number().int().min(1),
  // currentLeagueClubsRaw không có ở đây!
});
```

Dữ liệu club thô từ client được parse bên ngoài schema rồi pass vào `simulateDynamicLeagueTableService` — client có thể inject club data tùy ý.

Contrast với `generateTransferOfferAction` xử lý đúng: bỏ qua clubs từ client, tự query DB.

**Cách fix:**  
Bỏ `currentLeagueClubsRaw` khỏi client call. Trong action, tự query DB bằng `leagueId` đã được validate:

```ts
export async function generateLeagueTableAction(input: unknown): Promise<TableRow[]> {
  const validated = generateLeagueTableSchema.parse(input);

  const dbClubs = await prisma.club.findMany({
    where: { leagueId: validated.leagueId },
    select: { id: true, name: true, leagueId: true, prestige: true, continentalType: true },
  });

  return simulateDynamicLeagueTableService(
    validated.playerStanding,
    validated.playerClubName,
    dbClubs
  );
}
```

---

## Điểm tốt cần giữ nguyên

- `hiddenStats` không bao giờ lọt ra client types (`ClientSafePlayer`) — boundary được giữ tốt
- `resolveWeightedOutcome` centralized — toàn bộ random đi qua 1 hàm, dễ test
- Server Actions validate input bằng Zod nhất quán (trừ SEC-01)
- `calculateOvrByPosition` có weight theo vị trí thực tế, đúng bóng đá
- Feature folder isolation tốt, services không cross-import lộn xộn

---

## Vấn đề kiến trúc chưa giải quyết (ghi chú thêm)

- **Auth**: `userId` tồn tại trong `GameSession` nhưng không có middleware kiểm tra ownership. Ai biết `gameId` đều có thể đọc/ghi data. Cần implement auth guard khi Supabase Auth được bật.
- **Type safety cho Json fields**: `statsTimeline`, `clubStints`, `events` trong Prisma là `Json` — không có runtime validation khi đọc từ DB. Cân nhắc dùng `z.parse` hoặc Prisma extension để validate khi read.
