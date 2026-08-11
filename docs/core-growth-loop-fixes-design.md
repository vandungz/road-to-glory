# Design Discussion — Growth Loop Fixes (5 vấn đề, v1 DRAFT)

> **Status:** Thiết kế hướng sửa — **chưa code**. Nối tiếp
> [`core-growth-loop-audit-2026-08-09.md`](./core-growth-loop-audit-2026-08-09.md) (nguồn
> chẩn đoán — đọc file đó trước để biết TẠI SAO từng vấn đề tồn tại; file này chỉ bàn
> HƯỚNG SỬA). Theo đúng convention các SoT khác trong repo: chốt nguyên tắc trước, khoá số
> sau khi playtest, không code trong file này.
>
> Tài liệu liên quan:
> - [`core-growth-loop-audit-2026-08-09.md`](./core-growth-loop-audit-2026-08-09.md) — 5
>   vấn đề + bằng chứng số liệu đã verify trực tiếp trên code thật.
> - [`core-growth-balance.md`](./core-growth-balance.md) — chủ của toàn bộ công thức gate/
>   count/magnitude/soft-cap/decline hiện tại; mọi sửa đổi ở §1–§2 file này đều phải supersede
>   đúng phần tương ứng trong file đó (ghi rõ trong §1.4/§1.5) — không đổi số cân bằng nào
>   khác ngoài phần đang bàn.
> - [`core-game-logic-systems-map.md`](./core-game-logic-systems-map.md) — bản đồ phụ
>   thuộc toàn cục; §3 dưới đây (Preview≠Resolve) là 1 lớp bug đã xảy ra lặp lại (O11 cũ,
>   giờ thêm national_callup) — cần đọc §4b file đó trước khi refactor.
>
> **Thứ tự ưu tiên đã thống nhất với user (2026-08-09):**
> 1. `careerLengthYears` distortion (§1) — ảnh hưởng lớn nhất, xuyên suốt playthrough.
> 2. Bug LM/RM (§2.1) + count giảm không clamp (§2.2) — sửa nhỏ, rủi ro thấp.
> 3. Preview≠Resolve 5 wheel team (§3) — refactor gộp 1 lần.
> 4. Team CS Bound (§4.1) + stale OVR transfer (§4.2).
> 5. Tune độ mạnh Shop item (§5).

---

## §1. `careerLengthYears` distortion — ưu tiên #1

### 1.1 Chốt hướng (cập nhật sau phản biện user 2026-08-09 — thay bản v1 "thêm sàn")

**User chọn Hướng A (sửa công thức BE), từ chối hoàn toàn Hướng B (UI)** — đây là vấn đề
logic, không phải communication/UX. Đồng thời user đặt câu hỏi đúng trọng tâm: liệu
`careerLength` (1 số random tại debut) có nên là **input chính** quyết định band tuổi hay
không, khi thực tế phát triển cầu thủ phụ thuộc vào tuổi sinh học tuyệt đối (càng già càng
khó lên) nhiều hơn là "% một con số mà chính player còn chưa biết trước".

**Nhận định lại (quan trọng — đổi hướng so với bản v1):** bản vá "thêm sàn 3 mùa" ở draft
đầu chỉ **che triệu chứng** (nới rộng băng young cho career ngắn), không sửa **nguyên nhân
gốc**: mô hình hiện tại dùng `% = (currentAge−debutAge)/careerLength` làm input duy nhất —
mà **ngoài đời không ai biết trước mình sẽ chơi bao lâu năm 18 tuổi**. Một cầu thủ 18 tuổi
mới debut là "trẻ, đang phát triển" theo đúng nghĩa sinh học, bất kể sau này anh ta chơi 9
năm hay 26 năm — bản thân việc dùng % của 1 số tương lai làm nền cho quyết định hiện tại
mới là chỗ **kém thực tế nhất** trong mô hình, không phải chỉ mỗi việc career ngắn bị thiệt.

### 1.2 Mô hình "2 đồng hồ" (dual-clock) — LOCKED nguyên tắc, số DRAFT

Tách hẳn 2 tín hiệu độc lập, mỗi cái đại diện đúng 1 hiện tượng sinh học/thực tế khác nhau,
thay vì gộp chung vào 1 con số % duy nhất:

```text
// Đồng hồ 1 — KINH NGHIỆM (dùng cho băng "young"): số mùa THẬT đã chơi kể từ debut.
// Tuyệt đối, KHÔNG phụ thuộc careerLength của riêng player này — khớp đúng cách con người
// thật đánh giá "cầu thủ trẻ" (theo số mùa đã đá, không ai tính theo % quãng đời sự nghiệp
// còn chưa biết trước).
yearsInCareer = currentAge − debutAge
youngYears(position) = round(youngThresholdPct(position) × REFERENCE_CAREER_LENGTH)
  // REFERENCE_CAREER_LENGTH = 16 (DRAFT) — dùng trung vị bell curve của chính Career Length
  // Wheel (game-design.md §4.4: đỉnh phân phối 14–18 năm) làm mốc quy đổi 1 LẦN, DUY NHẤT,
  // không đổi theo player — biến % hiện tại (đã tune hợp lý theo vị trí) thành số năm tuyệt
  // đối áp dụng ĐỒNG ĐỀU cho mọi player bất kể họ roll career dài hay ngắn.
isYoung = yearsInCareer < youngYears(position)

// Đồng hồ 2 — SINH HỌC + ĐỘ BỀN CÁ NHÂN (dùng cho băng "old"): GIỮ tinh thần "gần retirement
// CỦA CHÍNH MÌNH" hiện tại (đây là phần model đã hợp lý — đại diện độ bền/gen khác nhau giữa
// các player, không nên bỏ), NHƯNG cộng thêm 1 trần tuyệt đối theo tuổi sinh học thật, để
// không có player nào "mãi trẻ" chỉ vì roll trúng career cực dài.
isOldByOwnCareer = getCareerProgress(currentAge, debutAge, careerLength) >= oldThresholdPct(position)  // % hiện tại, GIỮ NGUYÊN
isOldByAbsoluteAge = currentAge >= ABSOLUTE_OLD_AGE(position)  // MỚI — DRAFT, xem bảng dưới
isOld = isOldByOwnCareer || isOldByAbsoluteAge
```

**Vì sao giữ đồng hồ 2 kiểu cũ cho "old" nhưng đổi hẳn đồng hồ 1 cho "young":** "gần
retirement của chính mình" là 1 proxy hợp lý cho **độ bền/gen** (real-world: có cầu thủ đá
đỉnh cao tới 38-40 tuổi, có người xuống dốc từ 30) — không nên xoá. Nhưng "trẻ" thì khác hẳn
về bản chất: không ai — kể cả chính cầu thủ — biết trước sự nghiệp mình dài bao nhiêu lúc
còn trẻ, nên lấy % của số đó làm cơ sở "còn trẻ hay không" là sai logic nhân-quả (nhân quả
đảo ngược: tương lai quyết định hiện tại). Đồng hồ 1 sửa đúng chỗ sai logic đó; đồng hồ 2
thêm trần tuyệt đối chỉ để chặn trường hợp cực đoan (career quá dài khiến "old" không bao
giờ tới), không thay thế phần % vốn đã hợp lý.

**Bảng số DRAFT (dựa theo đúng thứ tự bền bỉ đã ngầm định trong bảng % hiện tại — GK bền
nhất, ST/winger ngắn nhất):**

| Vị trí | `youngYears` (đồng hồ 1, DRAFT) | `ABSOLUTE_OLD_AGE` (đồng hồ 2, DRAFT) |
|---|---|---|
| GK | 2 | 38 |
| CB / CDM / CM | 2–3 | 36 |
| LB / RB / CAM | 3 | 35 |
| ST / LW / RW / LM / RM | 3 | 34 |

*(Số cụ thể cần playtest — đây là điểm quan trọng nhất cần khoá trước khi code, xem §1.6.)*

### 1.3 Vì sao đây là "output chính xác hơn" đúng như user hỏi

- **Young không còn phụ thuộc may rủi careerLength** — 2 player debut cùng tuổi, cùng
  performance, sẽ có đúng số mùa "trẻ" như nhau, bất kể sau này 1 người roll career 9 năm và
  người kia 26 năm. Đây là điểm user phản biện đúng nhất — đã sửa tận gốc, không phải vá.
- **Old vẫn phản ánh "càng già càng khó"** đúng tinh thần real-world user muốn, nhưng giờ có
  2 lớp: cá nhân (gen/độ bền, giữ nguyên % cũ) + tuyệt đối (sinh học chung, mới thêm) — thay
  vì chỉ 1 lớp như trước.
- Không đụng `getCareerProgress` (vẫn dùng nguyên cho `isOldByOwnCareer` + Influence Score) —
  chỉ đổi CÁCH DÙNG nó ở đúng 2-3 chỗ gọi trong `growth-balance.ts`.

### 1.4 Preview ≡ Resolve

Vì đây là hàm helper dùng chung trong `growth-balance.ts` (không phải logic riêng ở
`career-wheel-resolver.ts`/`useCareerWheelItems.ts`), sửa 1 chỗ tự động áp cho cả preview
và resolve — **không có nguy cơ lệch** giống lớp bug ở §3.

### 1.5 KHÔNG làm UI (chốt theo yêu cầu user 2026-08-09)

User từ chối rõ ràng: đây là vấn đề BE logic, không phải FE/communication. **Không** thêm
diễn giải/cảnh báo nào ở Setup hay bất kỳ đâu về ảnh hưởng của `careerLength` — sửa im lặng
ở tầng công thức, player chỉ cảm nhận qua trải nghiệm chơi công bằng hơn, không qua thông báo.

### 1.6 Định nghĩa xong bàn

- [x] Khoá `REFERENCE_CAREER_LENGTH=16` và bảng `youngYears`/`ABSOLUTE_OLD_AGE` theo vị trí
      (§1.2) — implemented 2026-08-09 in `simulation-helpers.ts`. `youngYears` derived by
      formula (`round(youngPct × 16)`) from the existing pct table rather than a second
      hand-picked table, so relative ordering can't drift from it.
- [x] Xác nhận thứ tự bền bỉ theo vị trí trong bảng DRAFT khớp ý đồ ban đầu — preserved by
      construction (derived from the existing pct table).
- [ ] Playtest: so peak OVR distribution giữa nhóm career 8-10 năm vs 23-28 năm trước/sau —
      chưa chạy (cần data thật từ nhiều playthrough, không thể verify trong session code).
- [x] Xác nhận `ABSOLUTE_OLD_AGE` không xung đột vô lý với debut muộn — added a 1-season
      guard (`currentAge - debutAge >= 1`) before the absolute-age branch can fire, so a
      33yo debutant isn't "old" on their very first season; verified via scratch script.

---

## §2. Bug nhỏ, rủi ro thấp — ưu tiên #2

### 2.1 LM/RM không được tính điểm phong độ vào `matchRating`

**Cập nhật sau phản biện user 2026-08-09 — bỏ hướng "thêm LM/RM vào bucket có sẵn".**

User chỉ ra đúng: bucket hiện tại (`["ST","LW","RW","CAM","CM"]` dùng chung 1 hệ số
`gaFactor×1.8`) là **gộp theo vùng thi đấu** (attacker nói chung), trong khi nguyên tắc gốc
của game (đã LOCKED ở `core-transfer-design.md §12.1` cho `effectivePositionOvr` — ma trận
9 vị trí cụ thể: ST/CF, LW/RW, CAM, CM, CDM, LM/RM, LB/RB, CB, GK) là **mỗi vị trí cụ thể có
trọng số riêng**. Thêm LM/RM vào bucket có sẵn chỉ vá đúng triệu chứng "luôn = 0", không sửa
kiến trúc "gộp vùng" vốn đang lệch nguyên tắc.

**Rà lại trong lúc phân tích, phát hiện thêm 1 bug cùng loại:** CM đã được sim ra clean sheet
thật (nằm trong danh sách CS-eligible `:133`, `getPerAppRates` cũng có định nghĩa
`csLow/csHigh` riêng cho CM), nhưng `calcRating` hiện tại **không bao giờ dùng `csFactor` cho
CM** — chỉ `gaFactor×1.8` — nên đóng góp phòng ngự thật sự của CM (dù được mô phỏng) không hề
ảnh hưởng rating, cùng lớp lỗi với LM/RM nhưng kín đáo hơn (không phải luôn-bằng-0, mà là
"1 nửa dữ liệu đã tính ra nhưng bị bỏ rơi").

**Hướng sửa — thay 3 bucket hiện tại (`gaFactor×1.8` / CDM riêng / `else csFactor×2.2`)
bằng 1 bảng trọng số theo TỪNG vị trí cụ thể**, khớp đúng 9-11 vị trí đã dùng ở
`effectivePositionOvr`, mỗi vị trí có cặp hệ số riêng `{ ga, cs }`:

```text
POSITION_RATING_WEIGHTS: Record<Position, { ga: number; cs: number }> = {
  ST:        { ga: 2.0, cs: 0 },
  LW:  RW:   { ga: 1.8, cs: 0 },
  CAM:       { ga: 1.9, cs: 0 },
  LM:  RM:   { ga: 1.6, cs: 0 },    // MỚI — hệ số riêng, không dùng chung với LW/RW/CAM
  CM:        { ga: 1.2, cs: 1.0 },  // SỬA — thêm lại csFactor đã bị bỏ rơi
  CDM:       { ga: 0.9, cs: 1.3 },  // giữ nguyên logic đã có (không đổi)
  LB:  RB:   { ga: 0.3, cs: 1.8 },  // MỚI — hiện đang gộp chung "else" với CB/GK, tách riêng
                                     // vì hậu vệ cánh có đóng góp tấn công (assist) rõ hơn CB
  CB:        { ga: 0,   cs: 2.2 },  // giữ nguyên số của "else" hiện tại
  GK:        { ga: 0,   cs: 2.2 },  // giữ nguyên số của "else" hiện tại
}

base += (compStats.goals + compStats.assists) / apps × weights.ga
      + compStats.cleanSheets / apps × weights.cs
```

Tất cả số trong bảng là **DRAFT hoàn toàn** (LB/RB/LM/RM/CM là suy luận theo tương quan thứ
tự với per-app rate table đã có ở `season-stat-rates.ts`, chưa playtest) — chỉ có ST/LW/RW/
CAM/CDM/CB/GK giữ nguyên số cũ đã tune, không đổi.

**Không** đổi danh sách CS-eligible ở `rollCompetitionOutput` (`:133`) — LM/RM vẫn không có
`csLow/csHigh` trong `season-stat-rates.ts` nên CS của họ tự nhiên = 0, khớp `cs: 0` trong
bảng trên, không cần sửa gì thêm ở đó.

### 2.2 Wheel "Số Chỉ Số" hướng GIẢM không clamp theo số chỉ số còn khả dụng

**Sửa tại `useStatEvolutionFlow.ts`, subStep `"count"`** — thêm nhánh đối xứng cho hướng
giảm, dùng `filter(v => v > 10)` (khác `< 99` bên tăng):

```text
if (direction === "increase") {
  count = min(count, max(1, statsAbove10... đã có, giữ nguyên))  // hiện tại
} else if (direction === "decrease") {
  const availableCount = Object.values(currentStats).filter(v => v > 10).length;
  count = Math.min(count, Math.max(1, availableCount));   // MỚI
}
```

Áp dụng **cả 2 phía** preview (`useCareerWheelItems.ts` không cần đổi — nó không tự tính
`count`, nhận từ `useStatEvolutionFlow`'s state) và resolve (`career-wheel-resolver.ts`
`selector` exclusion filter đã đúng sẵn, chỉ thiếu chặn từ nguồn `count`).

### 2.3 Định nghĩa xong bàn

- [x] Khoá bảng `POSITION_RATING_WEIGHTS` §2.1 — implemented 2026-08-09 in
      `season-simulator.service.ts` (`calcRating`). LM/RM/CM/LB/RB numbers still DRAFT per
      the table above; needs playtest to confirm they don't shift those positions' growth
      difficulty unintentionally.
- [x] Xác nhận việc thêm `csFactor` cho CM không làm CM growth dễ hẳn — mitigated by
      lowering `ga` from 1.8→1.2 for CM at the same time `cs: 1.0` was added, per plan; not
      yet playtest-confirmed the net expectation stayed flat.
- [x] Count-giảm: dùng `> 10` — implemented in `useStatEvolutionFlow.ts`, matches the
      existing `<= 10` selector-exclusion filter exactly.

---

## §3. Preview ≠ Resolve cho 5 wheel "team" — ưu tiên #3

### 3.1 Vấn đề

`standing`, `domestic_cup`, `continental_cup`, `national_callup`, `national_tournament` —
mỗi wheel có 2 bản build-params riêng biệt (1 ở `career-wheel-resolver.ts` cho resolve, 1 ở
`useCareerWheelItems.ts` cho preview), tự nhiên trôi dần theo thời gian mỗi lần 1 trong 2
bên được sửa mà bên kia quên theo — đã xảy ra ít nhất 2 lần (cup luck cũ — O11, giờ thêm
`national_callup` thiếu `position`).

### 3.2 Hướng sửa — hàm build-params dùng chung (LOCKED nguyên tắc, chưa code)

Tạo `features/wheel/lib/wheel-team-params.ts` (mới) — 5 hàm thuần, mỗi hàm nhận đúng 1
`ctx`-like object và trả về **pool đầy đủ** (không chỉ params) cho từng wheel:

```text
buildStandingPool(ctx): WeightedItem<number>[]
buildDomesticCupPool(ctx): WeightedItem<string>[]
buildContinentalCupPool(ctx): WeightedItem<string>[]
buildNationalCallupPool(ctx): WeightedItem<string>[]
buildNationalTournamentPool(ctx): WeightedItem<string>[]
```

- `career-wheel-resolver.ts`: gọi hàm tương ứng lấy pool, rồi `resolveWeightedOutcome(pool)`.
- `useCareerWheelItems.ts`: gọi CÙNG hàm, map sang format hiển thị (label/value/weight) —
  không tự tính lại bất kỳ trọng số nào.
- `ctx` truyền vào phải **luôn dùng `effPositionOvr`** (tính 1 lần ở nơi gọi, giống cách
  `fitnessCoachActive` đã làm ở Wave 2) — không còn chỗ nào dùng `currentOvr` phẳng cho 5
  wheel này nữa.

**Vì sao đây là hướng đúng, không phải vá từng chỗ lệch:** vá từng tham số (thêm `position`
vào lệnh gọi preview, thêm `standingResult` vào `getInfluenceProxy` preview...) chỉ xoá bug
hiện tại, không xoá **nguyên nhân** (2 bản logic song song). Gộp về 1 hàm khiến lệch preview/
resolve **không thể xảy ra về mặt cấu trúc** nữa, không phải nhờ kỷ luật nhớ sửa 2 chỗ.

### 3.3 Rủi ro & phạm vi

- Đây là refactor, không đổi số cân bằng nào — rủi ro chính là lỗi sao chép khi gộp code,
  không phải rủi ro balance. Nên làm sau khi §1/§2 ổn định (đừng gộp refactor lớn với đổi
  số cùng 1 PR).
- KHÔNG mở rộng sang wheel `dir_increase/dir_decrease/count/selector/magnitude` (nhóm
  growth) — nhóm đó đã audit kỹ, KHÔNG có lệch preview/resolve (xem audit §Phần 1, "Scope
  confirmed clean").

### 3.4 Định nghĩa xong bàn

- [x] File mới tại `features/wheel/lib/wheel-team-params.ts` — implemented 2026-08-09.
- [x] Không đổi số trọng số nào — refactor chỉ di chuyển code; 2 divergence bug thật (raw
      `currentOvr` thay vì `effPositionOvr` ở cả 5 wheel, `getInfluenceProxy` thiếu
      `standingResult` ở preview) được sửa như 1 phần của việc gộp về 1 hàm, không phải đổi
      số cân bằng.
- [x] Test riêng: script tạm ở `scratch/` xác nhận `buildXPool` deterministic + `position`
      ảnh hưởng đúng `national_callup` — chạy xong, xoá script theo convention.

---

## §4. Team CS Bound + stale OVR transfer — ưu tiên #4

### 4.1 Team Clean Sheet Bound chỉ áp cho giải VĐQG

**Sửa tại `season-simulator.service.ts`** — tính `maxTeamCS` tương ứng cho mỗi loại giải,
theo đúng tinh thần công thức đã có cho league (tỉ lệ theo standing/vị trí bảng xếp hạng),
thay vì chỉ 1 biến `maxLeagueTeamCS` áp riêng league:

```text
// hiện tại: chỉ có maxLeagueTeamCS, truyền vào đúng 1 trong 4 lệnh gọi rollCompetitionOutput

// đề xuất: hàm chung, gọi theo match-count từng giải thay vì hardcode leagueMatches
function estimateMaxTeamCS(matches: number, standingResult: number | null, leagueSize: number): number | undefined

maxLeagueTeamCS = estimateMaxTeamCS(leagueMatches, standingResult, leagueClubsCount)
maxCupTeamCS = estimateMaxTeamCS(cupMatches, ???, ???)          // cup không có "standing" — cần định nghĩa proxy
maxContinentalTeamCS = estimateMaxTeamCS(continentalMatches, ???, ???)
maxNationalTeamCS = estimateMaxTeamCS(nationalMatches, ???, ???)
```

**Điểm cần quyết trước khi code:** league có `standingResult` (1..N) làm input tự nhiên cho
tỉ lệ thắng/hoà giả định; cup/continental/national dùng kết quả vòng loại (Winner/Runner-Up/
Semi-Finals/...) chứ không phải standing số — cần 1 bảng map kết quả→tỉ lệ CS giả định
tương tự (vd Winner → tỉ lệ cao, Early Exit → tỉ lệ thấp). **Chưa khoá bảng này, DRAFT hoàn
toàn** — cần bàn thêm trước khi code, không tự chọn số.

### 4.2 Stale OVR trong transfer check ngay sau growth

**Sửa tại `useStatEvolutionFlow.ts`, cuối nhánh `magnitude` (lượt cuối cùng)** — dùng thẳng
`res.nextOvr`/`res.nextStats` (giá trị `evolvePlayerStatsAction` vừa trả về) thay vì để
`triggerTransferCheck` tự đọc `p.currentOvr` (closure cũ):

```text
// hiện tại
.then((res) => {
  p.setCurrentOvr(res.nextOvr);
  triggerTransferCheck();              // đọc p.currentOvr — CŨ
})

// đề xuất — truyền override, triggerTransferCheck ưu tiên override nếu có
.then((res) => {
  p.setCurrentOvr(res.nextOvr);
  p.setCurrentStats(res.nextStats);
  triggerTransferCheck({ overrideOvr: res.nextOvr, overrideStats: res.nextStats });
})
```

`triggerTransferCheck` cần thêm 2 field override tuỳ chọn trong tham số `overrides` đã có
sẵn (hiện chỉ có `willingToMove`/`stayOnWindow`), dùng `overrides?.overrideOvr ?? p.currentOvr`
khi build payload gửi `generateTransferMarketAction`. Đồng thời thêm `currentStats` vào
payload đó (hiện đang thiếu hẳn, khác các lệnh gọi khác trong cùng codebase).

### 4.3 Định nghĩa xong bàn

- [x] Khoá bảng map kết quả cup/continental/national → tỉ lệ CS (`CUP_CS_RATIO`,
      `CONTINENTAL_CS_RATIO`, `NATIONAL_CS_RATIO`) — implemented 2026-08-09, numbers still
      DRAFT. Verified the bound actually binds (CB continental Early Exit hit its cap in
      500/500 trial runs).
- [x] `overrideOvr`/`overrideStats` on `triggerTransferCheck`'s existing `overrides` param —
      implemented, simplest option that didn't require touching any other call site.

---

## §5. Tune độ mạnh Shop item — ưu tiên #5

### 5.1 Vấn đề

Tác động đo được thật (Fitness Coach ~5-6%, Adaptation Kit ~10.6%) nhỏ hơn nhiều lần biên độ
nhiễu ngẫu nhiên tự nhiên của hệ thống (±20% G/A mỗi roll, ±0.15 rating) — 1 lần chơi đơn lẻ
gần như chắc chắn không "cảm" được tác động dù nó có thật.

### 5.2 Chốt: kết hợp cả (A) và (B) (user quyết 2026-08-09)

**(A) Tăng độ mạnh + tăng giá tương ứng (giữ cân bằng kinh tế):**

| Item | Độ mạnh hiện tại | Độ mạnh DRAFT mới | Giá hiện tại | Giá DRAFT mới |
|---|---|---|---|---|
| Fitness Coach | `SEVERITY_MULTIPLIER = 0.8` | **~0.5–0.6** | €600k | **~€900k–1.1M** |
| Adaptation Kit | `APPS_RATIO_BONUS = 0.10` | **~0.15–0.20** | €500k | **~€800k–1M** |

Tăng giá cùng lúc với tăng độ mạnh để **giữ nguyên tỉ lệ giá-trị/hiệu-quả** (không phải chỉ
buff miễn phí) — đúng tinh thần cân bằng kinh tế đã đặt ra ở
`core-currency-shop-design.md §6.4`. Đây là điểm rủi ro cao nhất trong 5 vấn đề (đụng số đã
tune nhiều lần) — **nên làm SAU CÙNG**, sau khi §1-§4 đã ổn định, để không lẫn lộn nguyên
nhân nếu playtest thấy growth vẫn "khó" (không biết do §1-§4 chưa đủ hay do (A) gây thêm
nhiễu).

**(B) Minh bạch UI — không đụng khu vực wheel:** `ShopModal.tsx` là **floating modal độc
lập**, không nằm trong "khu vực wheel chỉ-để-quay" mà `core-ui-ux-design.md` D7 khoá cứng
(D7 chỉ áp cho cột wheel chính giữa lúc đang quay) — nên thêm minh bạch số ở đây **không vi
phạm** invariant UI nào. Cụ thể: mỗi item card hiện thêm dòng "trước → sau" (vd "Giảm mức
độ nghiêm trọng giảm điểm: hiện tại → sau khi mua"), tính từ state thật của player
(`seasonApps` gần nhất) thay vì chỉ mô tả chữ chung chung như hiện tại.

### 5.3 Định nghĩa xong bàn

- [x] Khoá số mới cho (A) — implemented 2026-08-09: Fitness Coach 0.8→0.55 / €600k→€950k,
      Adaptation Kit 0.10→0.18 / €500k→€900k. Bundled fix: `growth-balance.ts` had its own
      duplicate local `FITNESS_COACH_SEVERITY_MULTIPLIER` const instead of importing
      `lib/shop-catalog.ts`'s — now imports it, single source of truth.
- [x] (B) minh bạch — implemented differently than drafted: instead of a separate "trước →
      sau" line (would need `seasonApps` threading into `ShopModal.tsx`), the effect % is
      baked directly into each item's `description` string in `shop-catalog.ts` (e.g. "Giảm
      45%...", "+18%..."). Simpler, zero new props, same transparency outcome — flagged to
      user as a deliberate scope simplification.
- [ ] Playtest lại sau khi tăng số (A) — chưa chạy, cần data thật.

---

## Lịch sử

| Ngày | Thay đổi |
|---|---|
| 2026-08-09 | v1 DRAFT — tạo SoT theo yêu cầu, gộp hướng sửa cho 5 vấn đề từ audit cùng ngày. §1 (careerLength) chốt nguyên tắc hybrid + công thức sàn năm-thật DRAFT (MIN_YOUNG_SEASONS=3). §2 (LM/RM + count clamp) chốt hướng sửa cụ thể, rủi ro thấp. §3 (preview≠resolve) chốt hướng refactor dùng chung build-params thay vì vá từng chỗ. §4.1 (Team CS Bound) còn mở bảng map cup/continental/national → tỉ lệ CS. §4.2 (stale OVR) chốt hướng dùng override thay vì đọc closure cũ. §5 (Shop tuning) để 2 hướng, chưa chọn — cần user quyết. |
| 2026-08-09 | **v1.1 — cập nhật sau 3 phản biện của user, cùng ngày:** (1) §1 đổi hẳn từ "vá sàn 3 mùa" sang mô hình **2 đồng hồ** (yearsInCareer tuyệt đối cho "young" — không phụ thuộc careerLength của riêng player; giữ %-của-chính-mình + thêm trần tuổi tuyệt đối cho "old") — sửa đúng chỗ nhân-quả bị đảo ngược trong mô hình cũ, đúng yêu cầu "công thức liên kết tốt hơn, chính xác hơn"; **bỏ hẳn phần UI** theo yêu cầu (đây là BE logic). (2) §2.1 đổi từ "thêm LM/RM vào bucket có sẵn" sang **bảng trọng số theo từng vị trí cụ thể** (`POSITION_RATING_WEIGHTS`, khớp nguyên tắc `effectivePositionOvr` đã LOCKED ở `core-transfer-design.md §12.1`) — phát hiện thêm bug cùng loại ở CM (có CS thật nhưng bị bỏ rơi khỏi rating), sửa gộp luôn. (3) §5 chốt **kết hợp cả (A) tăng độ mạnh + tăng giá tương ứng và (B) minh bạch UI trên ShopModal** (không vi phạm D7 vì Shop là floating modal, không thuộc khu vực wheel) — (A) xếp làm sau cùng vì rủi ro cao nhất, tránh lẫn nguyên nhân với §1-§4. |
| 2026-08-09 | **v1.2 — tất cả 5 mục đã code xong, theo đúng thứ tự ưu tiên đã thống nhất.** §1: `getYoungYears`/`getAbsoluteOldAge`/`isYoungByYears`/`isOldDualClock` mới trong `simulation-helpers.ts`, wired vào `growth-balance.ts` (`getEffectiveGrowthBoost`, `getProgressBand`, `getEffectiveDecreaseGate`, `getSelectorStatWeight`); thêm 1-season guard trước khi trần tuổi tuyệt đối áp dụng (giải quyết checklist mở của chính §1.6). §2.1: `POSITION_RATING_WEIGHTS` thay 3-bucket if/else trong `calcRating`; §2.2: nhánh clamp decrease `> 10` trong `useStatEvolutionFlow.ts`. §3: file mới `wheel-team-params.ts` — trong lúc gộp code phát hiện thêm 1 divergence chưa từng ghi trong SoT (preview's `getInfluenceProxy` thiếu `standingResult`, ảnh hưởng domestic_cup/continental_cup/national_tournament), sửa gộp luôn cùng bug `national_callup`/`effPositionOvr` đã biết. §4.1: `CUP_CS_RATIO`/`CONTINENTAL_CS_RATIO`/`NATIONAL_CS_RATIO` + `estimateMaxTeamCS`; §4.2: `overrideOvr`/`overrideStats` trên `triggerTransferCheck`. §5: số mới cho Fitness Coach (0.55/€950k) và Adaptation Kit (0.18/€900k), dedupe `FITNESS_COACH_SEVERITY_MULTIPLIER` (từng bị khai 2 lần ở 2 file); phần (B) minh bạch UI làm đơn giản hơn dự thảo — bake % thẳng vào `description` thay vì thêm dòng "trước→sau" riêng (không cần prop `seasonApps` mới). Verify: `npx tsc --noEmit` sau mỗi section (đều pass), script tạm ở `scratch/` xác nhận preview≡resolve deterministic cho cả 5 team wheel, dual-clock hết phụ thuộc careerLength, LM rating corr(G+A, rating)=0.54 và CM corr(CS, rating)=0.33 qua 300 trial (trước fix ~0 cho cả 2), CS Bound thật sự bind (CB continental Early Exit chạm trần 500/500 trial). Còn mở, cần playtest thật (không thể verify bằng code): peak-OVR-theo-careerLength distribution (§1.6), CM growth-difficulty net-flat (§2.3), balance tổng thể sau khi tăng số Shop item (§5.3). |
