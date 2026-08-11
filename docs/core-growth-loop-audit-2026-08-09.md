# Audit — Core Loop stats/OVR → apps/G/A/CS → growth → stats/OVR (2026-08-09)

> **Status:** Đang điều tra — checkpoint giữa phiên để không mất phân tích khi context
> reset. Đây là audit thuần (chưa fix gì), tiếp nối `docs/core-game-logic-systems-map.md`
> (O1–O12/B1–B6) nhưng đọc lại code THẬT ở thời điểm 2026-08-09 (sau nhiều balance pass +
> sau khi Wallet/Influence/Shop (Wave 1+2) đã ship) — không tin lại bảng cũ, tất cả finding
> dưới đây đều đã tự đọc code trực tiếp, không chỉ nghe báo cáo subagent.
>
> **Bối cảnh:** user cảm thấy tăng chỉ số quá khó dù đã mua Shop item (Fitness Coach /
> Adaptation Kit) — cảm giác "không thay đổi gì". Đang điều tra thêm: (1) `careerLengthYears`
> (random 8–28 năm, wheel-rolled, ngoài tầm kiểm soát player) có bóp méo độ khó growth
> không, (2) chuỗi phụ thuộc club hiện tại → performance → growth có tạo ra bẫy/tension cấu
> trúc không (không phải bug, nhưng có thể là gốc rễ cảm giác "khó" dù pool đã đúng).

---

## Phần 1 — 5 lỗi nghiêm trọng đã xác nhận (tự đọc code, không phải chỉ nghe agent)

### 1. LM/RM không bao giờ được tính điểm phong độ vào `matchRating`

`features/season/services/season-simulator.service.ts:133` (danh sách được phép có clean
sheet: `["GK","CB","LB","RB","CDM","CM"]` — thiếu LM/RM) vs `:175` (danh sách dùng G/A cho
rating: `["ST","LW","RW","CAM","CM"]` — cũng thiếu LM/RM). LM/RM rơi vào nhánh `else`
(dùng `csFactor`), nhưng CS của họ luôn = 0 → `csFactor` luôn 0 → G/A vẫn được roll (cộng
vào tổng mùa/awards) nhưng **không bao giờ ảnh hưởng matchRating** → đứt kết nối
"đá hay → phát triển" cho đúng 2 vị trí này.

**Fix hướng:** thêm LM/RM vào 1 trong 2 danh sách (attacker-style G/A vì LM/RM không phải
hậu vệ) ở cả 2 chỗ.

### 2. Team Clean Sheet Bound (SoT §7.8) chỉ áp cho giải VĐQG

`season-simulator.service.ts:329-364`. `maxLeagueTeamCS` chỉ tính và chỉ truyền vào lệnh
gọi `"league"` (dòng 354). 3 lệnh gọi `domestic_cup`/`continental`/`national` (356/359/362)
không truyền tham số thứ 7 → không giới hạn → GK/CB/CDM có thể tích CS vô hạn ở cup/châu
lục/ĐTQG bất kể đội thắng thua thật.

**Fix hướng:** tính `maxTeamCS` tương ứng cho mỗi loại giải (dùng số trận + tỉ lệ tương tự)
và truyền vào cả 4 lệnh gọi.

### 3. Wheel "Số Chỉ Số" hướng GIẢM không chặn theo số chỉ số còn khả dụng → có thể kẹt wheel

`features/wheel/hooks/useStatEvolutionFlow.ts:132-134` — chỉ clamp `count` theo
`availableCount` khi `direction === "increase"`. Hướng giảm không có check tương ứng. Cầu
thủ cuối sự nghiệp có nhiều chỉ số đã chạm sàn 10 mà roll `count=3` → `selector` thứ 3 nhận
pool rỗng → resolve thật throw ("Items list is empty"), preview thì `careerWheelItems=[]`
khiến nút quay im lặng không phản ứng (`useDraftDrum.ts` guard `length===0`) → **user bị
kẹt**.

**Fix hướng:** thêm nhánh `else` clamp tương tự cho hướng giảm, dùng
`Object.values(currentStats).filter(v => v > 10).length`.

### 4. Preview ≠ Resolve cho toàn bộ wheel "team" (không chỉ growth)

5 wheel: `standing`, `domestic_cup`, `continental_cup`, `national_callup`,
`national_tournament`. Resolve dùng `effPositionOvr` (đúng SoT §7.10) —
`career-wheel-resolver.ts:182,191,215,239,254`. Preview vẫn dùng `currentOvr` phẳng —
`useCareerWheelItems.ts:177,188,204,220,258`.

Riêng `national_callup` nặng nhất: Resolve gọi
`getNationalCallupWeights(effPositionOvr, midOvr, standingResult, leagueSize, position)` —
**5 tham số** (`career-wheel-resolver.ts:238-240`); Preview gọi cùng hàm nhưng **chỉ 4 tham
số, thiếu hẳn `position`** (`useCareerWheelItems.ts:219-221`) → mất điều chỉnh ±2 theo vị
trí (`getPositionMidOvrModifier`, `simulation-helpers.ts:210-217`). `getInfluenceProxy`
cũng thiếu `standingResult` ở preview (`useCareerWheelItems.ts:84-86` vs resolver `:66`).

**Fix hướng:** đồng bộ preview gọi y hệt resolve — cách chắc nhất là refactor để cả 2 dùng
chung 1 hàm build-params (tránh duplicate logic 2 nơi như hiện tại — đây chính là nguồn
gốc lặp lại của lớp bug này, đã xảy ra ít nhất 2 lần: national_callup ở đây, và cup luck ở
O11 cũ).

### 5. Chuyển nhượng ngay sau khi tăng/giảm chỉ số dùng OVR CŨ (stale closure)

`features/wheel/hooks/useStatEvolutionFlow.ts:164-167`:
```js
.then((res) => {
  p.setCurrentOvr(res.nextOvr);   // chỉ schedule re-render
  triggerTransferCheck();          // đọc p.currentOvr — vẫn giá trị CŨ (closure từ props)
})
```
`triggerTransferCheck` đọc `p.currentOvr` (dòng 82) — closure cũ, `setCurrentOvr` không
mutate được ngay trong cùng callback. Lời mời chuyển nhượng/lương ngay sau mùa vừa phát
triển bị tính trên OVR **trước khi** tăng/giảm. Cùng chỗ thiếu luôn `currentStats` trong
payload (các chỗ gọi `generateTransferMarketAction` khác đều có) → backend fallback
`effPositionOvr` về OVR phẳng riêng lượt này.

**Fix hướng:** dùng `res.nextOvr`/`res.nextStats` trực tiếp (không qua `p.currentOvr`) khi
gọi `triggerTransferCheck` ngay sau `evolvePlayerStatsAction` — có thể cần thêm tham số
override cho `triggerTransferCheck(overrides)`.

## Phần 2 — Vấn đề nhỏ hơn / nghi vấn (agent phát hiện, confidence trung bình–cao, CHƯA tự verify hết)

- `calculateOvrByPosition` lệch bảng trọng số trong `docs/game-design.md §4.3` ở GK/CB/CM
  (CM thiếu hẳn cột PAC)/ST — không rõ code đúng hay doc đúng, cần xác nhận với chủ ý
  balance pass gần đây.
- `evolvePlayerStatsAction`'s Zod schema: `evolutions[].delta` không có `.min()/.max()` —
  không khai thác được (server clamp [10,99] sau) nhưng thiếu defense-in-depth.
- GK assist không scale theo apps (`resolveRandom() > 0.97 ? 1 : 0` cố định mỗi
  competition) — vi phạm nhẹ nguyên tắc "apps × rate" chính file tự ghi.
- `getOverqualifyPerfScale` luôn trả `1.0` (vô hiệu hoá phanh overqualify cũ, có vẻ chủ ý
  theo comment ngày 2026-08-03) — mất 1 cơ chế cân bằng note ở B5 trong systems-map.

---

## Phần 3 — Điều tra mới (đang làm, tiếp tục bên dưới nếu context reset)

Câu hỏi user: (1) Shop item effect quá nhỏ để "cảm" được? (2) `careerLengthYears` (random
8–28, ngoài tầm control) có bóp méo độ khó growth theo cách không công bằng không? (3) chuỗi
club hiện tại → performance → growth có tạo bẫy cấu trúc (không phải bug) khiến "khó" dù
đã tune nhiều lần chưa?

### 3.1 `careerLengthYears` bóp méo độ khó growth thật — XÁC NHẬN, đây là phát hiện lớn nhất

`careerLengthYears` roll ngẫu nhiên 8–28 năm lúc debut (game-design.md — "Career Length
Wheel"), **hoàn toàn ngoài tầm kiểm soát người chơi**, rồi feed thẳng vào
`getCareerProgress(currentAge, debutAge, careerLength) = (currentAge−debutAge)/careerLength`
(`simulation-helpers.ts:400-403`), và `progress` này quyết định băng tuổi (young/mid/old,
`getAgeProgressThresholds`, `:407-412`) cho **cả 2 phía tăng và giảm**:
- Băng "young" (Yes tăng cao nhất + pool count/magnitude được boost — `getGrowthBoost`,
  `:425-428`) chỉ kéo dài `youngThreshold × careerLength` **năm thật**.
- Băng "old" (decrease Yes sàn 55%, `growth-balance.ts` decline floor) bắt đầu từ
  `oldThreshold × careerLength` **năm thật**.

**Ví dụ cụ thể (vị trí ST, young=0.20, old=0.85):**

| Career length | Băng "young" (boosted) | Băng "mid" (base, không boost) | Băng "old" (decline floor) |
|---|---|---|---|
| **8 năm (ngắn, roll ~10%)** | **1.6 năm** | 5.2 năm | 1.2 năm |
| **10 năm** | **2.0 năm** | 6.5 năm | 1.5 năm |
| **25 năm** | **5.0 năm** | 16.25 năm | 3.75 năm |
| **28 năm (dài, roll ~10%)** | **5.6 năm** | 19.0 năm | 3.4 năm |

→ Người roll trúng career ngắn (8-10 năm, ~10% xác suất theo bảng wheel) chỉ có **1.6-2 mùa
thật** hưởng Yes% tăng cao nhất (80%+) trước khi rơi vào băng "mid" (70%) cho phần lớn sự
nghiệp, rồi hết già rất nhanh — tổng số **lượt roll tăng chỉ số thuận lợi** trong cả đời
game ít hơn hẳn (không chỉ % mỗi lượt thấp hơn, mà tổng SỐ LƯỢT ít hơn nhiều). Người roll
career dài (25-28 năm) được 5-5.6 mùa băng young + gần 20 mùa băng mid trước khi mới bắt
đầu suy giảm — tổng cơ hội tích luỹ OVR nhiều hơn hẳn, dù % mỗi mùa y hệt nhau.

**Đây rất có thể là nguồn gốc chính của cảm giác "khó" không nhất quán giữa các lần chơi**:
2 playthrough cùng kỹ năng thao tác, cùng luck spin, nhưng 1 người roll trúng career 9 năm
và 1 người roll trúng 26 năm sẽ có trải nghiệm phát triển OVR khác nhau RẤT NHIỀU — và
player **không có cách nào biết trước hay chuẩn bị tinh thần** cho việc này, vì
`careerLengthYears` chỉ hiện ra sau 1 wheel spin ở Setup, không có cảnh báo hay điều chỉnh kỳ
vọng nào đi kèm.

### 3.2 Chuỗi club hiện tại → performance → growth: rating gần như MIỄN NHIỄM với việc "vượt tầm CLB", nhưng apps ratio thì KHÔNG

Đọc `lib/club-fit.ts` + `lib/season-stat-rates.ts` + `calcRating`
(`season-simulator.service.ts:158-189`):

- **Tỉ lệ ra sân (`estimateAppsRatio`)** biến động RẤT MẠNH theo `diff = ovr − clubThreshold`
  (`clubThreshold = 55 + prestige×6`): ví dụ OVR 78 ở CLB prestige 3 (fit tốt, diff=+5) →
  apps ratio **~94.5%**; CÙNG player OVR 78 chuyển sang CLB prestige 5 (vượt tầm, diff=−7)
  → apps ratio rơi còn **~46%** — gần như giảm một nửa số trận.
- **Nhưng tỉ lệ ghi điểm mỗi trận (`getPerAppRates`, `lib/season-stat-rates.ts`) hoàn toàn
  KHÔNG phụ thuộc `clubPrestige`** (chỉ phụ thuộc OVR/position/loại giải) — nghĩa là dù đá ít
  trận hơn hẳn ở CLB lớn, **tỉ lệ (goals+assists)/apps kỳ vọng không đổi**.
- **`ovrVsClub` trong `calcRating`** (`:170`, `clamp((ovr−clubThreshold)×0.01, −1.2, 1.2)`)
  — với ví dụ trên chỉ là **−0.07**, gần như không đáng kể so với thang rating 5.5–9.0.
- → Với cùng ví dụ: base rating ở CLB fit tốt ≈ **7.22** ("tot" tier); ở CLB vượt tầm ≈
  **7.15** — **chỉ lệch 0.07**, KHÔNG đủ để tự nó đổi tier growth.

**Kết luận:** bản thân "chơi ở CLB lớn hơn khả năng" gần như KHÔNG trực tiếp giết rating/
growth tier như trực giác thường nghĩ — cái thực sự sụt là **số trận + số bàn/kiến tạo
tuyệt đối** (ảnh hưởng tới thành tích mùa hiển thị, Ballon d'Or, milestone), không phải
chất lượng-mỗi-trận. Cơ chế duy nhất khiến growth thực sự tệ đi khi vượt tầm CLB là **gián
tiếp qua wheel Xếp Hạng** (`getStandingWheelPool`, `simulation-helpers.ts:253-294`): khi
`diff<0` (vượt tầm), `ovrModifier` kéo trọng số về phía cuối bảng xếp hạng
(`pos ≥ leagueSize×0.7` được cộng thêm trọng số dương khi diff âm) → dễ đứng hạng thấp hơn
→ `standingBonus` trong `calcRating` âm (−0.06 đến −0.12) + national call-up weight giảm
(đến −18) + khó vé châu lục hơn — cộng dồn thành 1 khoản phạt thật nhưng **đi vòng qua kết
quả đội bóng, không phải phạt trực tiếp trên phong độ cá nhân**.

### 3.3 Vì sao Shop item "cảm giác không thay đổi gì" dù có tác động thật (đã đo ở lượt trước)

Số đã đo lần trước: Fitness Coach dịch mean count giảm 1.650→1.560 (~5.5%), mean magnitude
1.610→1.515 (~6%); Adaptation Kit +3.35 trận/mùa trung bình (~10.6% so với baseline
31.54). Đối chiếu với nhiễu ngẫu nhiên VỐN CÓ SẴN trong cùng hệ thống:
- G/A/CS mỗi trận: `noise()` = ±20% mỗi lần roll (`season-simulator.service.ts:129`).
- Rating: thêm ±0.15 (`:187`) TRÊN NỀN đã noisy từ G/A.
- Magnitude tăng: pool trải 1–6 điểm, độ lệch chuẩn tự nhiên đã > 1 điểm.

→ 5-10% dịch chuyển kỳ vọng của Shop item **nhỏ hơn nhiều lần** so với biên độ nhiễu ngẫu
nhiên tự nhiên của chính hệ thống nó đang tác động vào. Về mặt thống kê tác động là thật
(đã đo được qua averaging 500 lần), nhưng **1 lần chơi đơn lẻ** (n=1, đúng cách người chơi
thực sự trải nghiệm) gần như chắc chắn bị nhiễu ngẫu nhiên che lấp hoàn toàn — đúng như
cảm nhận "mua mà như không mua" của user. Đây không phải bug, mà là **item được tune yếu
hơn ngưỡng có thể cảm nhận được trong 1 lần chơi**.

---

## Phần 4 — Tổng hợp khuyến nghị (thứ tự ưu tiên đề xuất, CHƯA implement)

1. **`careerLengthYears` distortion (3.1)** — mức độ ảnh hưởng lớn nhất, ảnh hưởng tới toàn
   bộ "cảm giác khó" xuyên suốt playthrough. Hướng khả dĩ: (a) hiển thị rõ cho user biết
   career dài/ngắn ảnh hưởng thế nào ngay từ Setup (quản lý kỳ vọng), hoặc (b) đổi
   `getAgeProgressThresholds` từ % sự nghiệp sang công thức có sàn/trần theo NĂM THẬT (vd
   "young" luôn ≥ 3 năm thật bất kể careerLength) để không cho short-career quá thiệt thòi.
2. **Bug #1 (LM/RM) + #3 (count giảm không clamp)** — nghiêm trọng, phạm vi sửa nhỏ, rủi ro
   thấp, nên làm sớm.
3. **Bug #4 (preview≠resolve)** — ảnh hưởng lòng tin UI, nên gộp sửa 1 lần bằng cách
   refactor dùng chung 1 hàm build-params thay vì tiếp tục vá từng wheel.
4. **Bug #2 (Team CS Bound) + #5 (stale OVR transfer)** — đúng nhưng phạm vi hẹp hơn.
5. **Shop effect size (3.3)** — nếu muốn user "cảm" được rõ hơn, cân nhắc tăng
   `FITNESS_COACH_SEVERITY_MULTIPLIER`/`ADAPTATION_KIT_APPS_RATIO_BONUS` mạnh hơn hiện tại,
   HOẶC giữ nguyên độ mạnh nhưng thêm UI hiển thị rõ "trước/sau" để user thấy được tác động
   dù nhỏ (vd hiện severity % cụ thể thay vì chỉ mô tả chữ).
