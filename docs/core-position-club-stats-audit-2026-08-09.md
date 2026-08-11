# Audit — Vị trí cụ thể + Club hiện tại → apps/G/A/CS (2026-08-09)

> **Status:** Audit thuần, đọc trực tiếp code thật tại thời điểm 2026-08-09 (sau khi 5 fix
> `core-growth-loop-fixes-design.md` v1.1 và Shop redesign — Fitness Coach + Training Camp —
> đã ship). Không fix gì trong báo cáo này, chỉ mô tả chính xác pipeline hiện tại + liệt kê
> điểm cần lưu ý. Yêu cầu gốc: "rà soát lại các SoT liên quan đến việc các stats cụ thể của
> vị trí player cụ thể cùng với club current đang tính toán thế nào để có các con số
> apps/ga/cs."
>
> Tài liệu liên quan:
> - [`core-growth-balance.md`](./core-growth-balance.md) — công thức gate/count/magnitude
>   phía sau (không thuộc phạm vi báo cáo này — báo cáo này dừng ở "ra được apps/G/A/CS",
>   không đi tiếp vào "G/A/CS → tăng/giảm chỉ số").
> - [`core-transfer-design.md §12.1`](./core-transfer-design.md) — nơi LOCK nguyên tắc
>   "9-11 vị trí cụ thể, không theo vùng thi đấu" mà `effectivePositionOvr` tuân theo.
> - [`core-growth-loop-audit-2026-08-09.md`](./core-growth-loop-audit-2026-08-09.md) — audit
>   trước đó cùng ngày, tập trung vào 5 bug/gap cụ thể; báo cáo này khác trọng tâm — không
>   tìm bug mới, mà mô tả đầy đủ + rà soát tính nhất quán của toàn bộ pipeline tính số.

---

## 1. Sơ đồ pipeline tổng quan

```text
currentStats (11 raw attributes, vd pac/sho/pas/dri/def/phy hoặc div/han/kic/ref/spd/pos GK)
  + position (vị trí cụ thể, KHÔNG phải vùng thi đấu)
  + currentOvr
        │
        ▼
① computeEffectivePositionOvr(position, currentStats, currentOvr)   [lib/transfer-economy.ts]
   → effPositionOvr (1 số, dùng CHUNG cho toàn bộ bước dưới)
        │
        ├──────────────────────────────────────────────────────────┐
        ▼                                                            ▼
② estimateAppsRatio(effPositionOvr, clubPrestige)          ⑤ calcRating(...) — dùng effPositionOvr
   [lib/club-fit.ts]                                           cho ovrVsClub (xem §4)
   → finalAppsRatio (+ standingBonus, ±5% noise)
        │
        ▼
③ apps mỗi giải = matches(giải) × finalAppsRatio × hệ số riêng giải
   (league ×1.0, cup ×0.90, continental ×1.0, national ×0.85)
        │
        ▼
④ rollCompetitionOutput(position, effPositionOvr, clubPrestige, apps, context, currentStats)
   [features/season/services/season-simulator.service.ts]
   → gọi getPerAppRates(position, effPositionOvr, context, currentStats)  [lib/season-stat-rates.ts]
      → getEffectiveAttributeRating(position, metric, currentStats, effPositionOvr) × 3 lần
        (1 lần riêng cho goals, 1 lần riêng cho assists, 1 lần riêng cho cleanSheets —
        MỖI metric có bảng trọng số THUỘC TÍNH riêng, không dùng chung 1 "vị trí OVR")
      → nội suy rate theo băng [low, high] của từng vị trí, nhân hệ số giải đấu
   → applyPrestigeToCsRate(rateCs, clubPrestige) — CHỈ CS được club prestige chỉnh thêm
   → goals/assists/cleanSheets = round(apps × rate × noise(±20%))
   → chặn bởi maxTeamCleanSheets (Team CS Bound theo standing/kết quả vòng đấu)
   → clampCompetitionStats (trần G+A theo apps)
        │
        ▼
⑤ calcRating(position, effPositionOvr, luckRating, clubPrestige, {goals,assists,cleanSheets,apps}, standingBonus, perfBonus)
   → base = 6.0 + ovrVsClub(±1.2 trần) + luckTerm + standingBonus + perfBonus
           + (gaFactor × POSITION_RATING_WEIGHTS[pos].ga + csFactor × POSITION_RATING_WEIGHTS[pos].cs)
   → matchRating (trọng số theo apps từng giải → 1 số/mùa)
```

**4 khối tính "vị trí" độc lập nhau** xuất hiện trong pipeline này — chi tiết ở §3:
1. `getPositionAttributeWeights` (①, ra `effPositionOvr`)
2. `getEffectiveAttributeRating` — 3 bảng con, 1 cho mỗi metric G/A/CS (④)
3. Băng rate `[low, high]` theo vị trí trong `getPerAppRates` (④)
4. `POSITION_RATING_WEIGHTS` (⑤, blend ga/cs vào rating)

---

## 2. Vai trò cụ thể của `currentClub` (qua `clubPrestige`)

`clubPrestige` (1–5) chỉ xuất hiện ở **đúng 3 chỗ**, mỗi chỗ một vai trò khác hẳn nhau:

| Chỗ dùng | Công thức | Ảnh hưởng |
|---|---|---|
| `getClubThreshold(prestige) = 55 + prestige×6` — dùng trong `estimateAppsRatio` (②) | CLB càng mạnh, ngưỡng effOVR cần để đá chính càng cao → **gate apps**, không gate rate | Player yếu hơn ngưỡng nhiều → apps ratio rơi về sàn 0.22–0.38 (tuỳ prestige); mạnh hơn ngưỡng → tối đa 0.9 |
| Squad-depth bonus `(5−prestige)×0.035` — cũng trong `estimateAppsRatio` | CLB **yếu hơn** cho bonus **lớn hơn** (ít cạnh tranh suất đá chính) | Nghịch với threshold ở trên nhưng nhỏ hơn nhiều (biên độ 0–0.14 vs biên độ threshold ~0.9) |
| `applyPrestigeToCsRate(rateCs, prestige) = rateCs + (prestige−3)×0.01` — chỉ áp cho **cleanSheets**, trong `rollCompetitionOutput` (④) | CLB mạnh hơn → hàng thủ khá hơn → CS rate nhích nhẹ (±0.02 cho prestige 1–5) | **Không** áp cho goals/assists — 2 chỉ số này hoàn toàn không đọc `clubPrestige` |
| `getClubThreshold(prestige)` lần 2 — dùng trong `calcRating`'s `ovrVsClub` (⑤) | Player vượt ngưỡng CLB → rating nhích lên (trần ±1.2), thiếu ngưỡng → rating giảm | Đây là ảnh hưởng RÕ NHẤT của club lên rating — không qua G/A/CS mà qua so sánh trực tiếp effOVR vs ngưỡng |

**Kết luận về club:** `clubPrestige` chủ yếu quyết định **có được đá không** (apps) và **rating
nền** (`ovrVsClub`), gần như không đụng vào **tỉ lệ ghi bàn/kiến tạo mỗi trận** khi đã được
đá (chỉ CS được nhích nhẹ). Nói cách khác: đá cho CLB lớn hơn khiến bạn khó có suất đá chính
hơn, nhưng MỘT KHI đã ra sân, phong độ ghi bàn/kiến tạo trên mỗi trận không đổi vì lý do CLB
— chỉ đổi vì stats/OVR bản thân player. Đây là hành vi nhất quán, xác nhận lại đúng như audit
trước đó (`core-growth-loop-audit-2026-08-09.md`, phần đầu tư "club/performance loop").

---

## 3. Bốn hệ thống trọng số theo vị trí — so sánh trực tiếp

Đây là phần cốt lõi câu hỏi "stats cụ thể của vị trí tính thế nào" — **4 bảng khác nhau,
mỗi bảng authored riêng, không có ràng buộc toán học nào bắt chúng phải nhất quán với nhau.**

### 3.1 `getPositionAttributeWeights` (`lib/transfer-economy.ts:313`) — cho `effPositionOvr`

| Vị trí | Top 3 attribute |
|---|---|
| GK | ref 0.28, pos 0.24, div 0.20 |
| ST/CF | sho 0.35, pac 0.20, dri/phy 0.15 |
| LW/RW | pac 0.30, dri 0.25, sho 0.20 |
| CAM | pas 0.30, dri 0.25, sho 0.20 |
| CM | pas 0.30, dri 0.20, phy 0.18 |
| CDM | def 0.32, phy 0.25, pas 0.20 |
| LM/RM | pac 0.25, pas 0.25, dri 0.20 |
| LB/RB | def 0.28, pac 0.25, phy 0.17 |
| CB (mặc định) | def 0.40, phy 0.30, pac 0.12 |

### 3.2 `getEffectiveAttributeRating` (`lib/season-stat-rates.ts:34`) — 3 bảng con riêng cho G/A/CS

| Vị trí | `goals` top weight | `assists` top weight | `cleanSheets` top weight |
|---|---|---|---|
| GK | (không có — fallback OVR) | kic 0.70 | ref 0.30 |
| ST | sho 0.45 | pas 0.40 | — |
| LW/RW | sho 0.35, pac 0.30 | pas 0.35, dri 0.30 | — |
| CAM | sho 0.35, pas 0.25 | pas 0.45 | — |
| LM/RM | sho 0.30, pac 0.25 | pas 0.40, pac 0.25 | — |
| CM | sho 0.30, pas 0.25 | pas 0.45 | def 0.35, phy 0.30 |
| CDM | sho 0.35, phy 0.30 | pas 0.50 | def 0.45, phy 0.30 |
| LB/RB | sho 0.35, pac 0.30 | pas 0.40, pac 0.30 | def 0.40, pac 0.30 |
| CB | phy 0.50, sho 0.30 | pas 0.55 | def 0.50, phy 0.30 |

### 3.3 Băng rate `[low, high]` theo vị trí (`lib/season-stat-rates.ts:118-156`)

| Vị trí | goals/app | assists/app | CS/app |
|---|---|---|---|
| GK | — | 0–0.02 | 0.28–0.40 |
| CB | 0.02–0.06 | 0.01–0.04 | 0.25–0.38 |
| LB/RB | 0.02–0.07 | 0.05–0.12 | 0.22–0.35 |
| CDM | 0.02–0.06 | 0.04–0.10 | 0.18–0.30 |
| CM | 0.05–0.12 | 0.08–0.16 | 0.15–0.28 |
| CAM | 0.10–0.22 | 0.12–0.24 | — |
| LW/RW | 0.12–0.28 | 0.08–0.20 | — |
| LM/RM | 0.08–0.18 | 0.10–0.20 | — |
| ST | 0.35–0.65 | 0.05–0.15 | — |

### 3.4 `POSITION_RATING_WEIGHTS` (`season-simulator.service.ts:185`) — blend vào `calcRating`

| Vị trí | `ga` weight | `cs` weight |
|---|---|---|
| ST | 2.0 | 0 |
| LW/RW | 1.8 | 0 |
| CAM | 1.9 | 0 |
| LM/RM | 1.6 | 0 |
| CM | 1.2 | 1.0 |
| CDM | 0.9 | 1.3 |
| LB/RB | 0.3 | 1.8 |
| CB/GK | 0 | 2.2 |

### 3.5 Quan sát về tính nhất quán

- **Thứ tự tương đối gần như luôn khớp nhau** giữa 4 bảng (vd LB/RB luôn thiên `def`/`pac`
  hơn CB; CAM/CM luôn thiên `pas`/`dri` hơn CDM) — không có mâu thuẫn định hướng lớn nào.
- **Độ lệch cụ thể xuất hiện ở vài chỗ**, ví dụ: `getPositionAttributeWeights` cho LM/RM
  `pac=pas=0.25` (đồng hạng), nhưng `getEffectiveAttributeRating`'s goals-cho-LM/RM lại đặt
  `sho=0.30` cao nhất, cao hơn cả `pac`. Đây **không hẳn là lỗi** — "khả năng tổng thể vị
  trí" (①) và "khả năng ghi bàn cụ thể" (④) là 2 câu hỏi khác nhau về mặt thiết kế, hợp lý
  khi 2 bảng khác nhau. Nhưng **không có tài liệu nào giải thích rõ đây là chủ đích**, nên
  nhìn thoáng qua dễ tưởng là quên đồng bộ.
- **Rủi ro bảo trì thật sự:** nếu sau này muốn "buff LM/RM" hoặc "nerf CB", phải nhớ sửa
  đúng cả 4 chỗ (①②③④) theo đúng ý đồ ban đầu — không có 1 nguồn duy nhất, không có test/
  check nào cảnh báo nếu chỉ sửa 1 trong 4 mà quên 3 chỗ còn lại.
- **`csLow=csHigh=0` mặc định** (③) cho CAM/LW/RW/LM/RM/ST khớp đúng `cs: 0` ở bảng ④ cho
  cùng nhóm vị trí — 2 bảng NÀY nhất quán với nhau (không roll CS thì trọng số CS trong
  rating cũng đúng bằng 0, không lãng phí/mâu thuẫn).

---

## 4. Các điểm đã sửa liên quan (tham chiếu, đã ship trước báo cáo này)

- LM/RM từng luôn có `ga: 0` trong bước ⑤ (bucket cũ gộp theo vùng thi đấu, thiếu LM/RM) —
  đã sửa bằng `POSITION_RATING_WEIGHTS` (§2.1, `core-growth-loop-fixes-design.md`).
- CM từng có CS được roll ở bước ④ nhưng bị bỏ rơi hoàn toàn ở bước ⑤ (không có `cs` weight)
  — đã sửa cùng đợt.
- `calcRating` từng tự tính `55 + prestige×6` thay vì gọi `getClubThreshold` (trùng công
  thức với `lib/club-fit.ts`) — đã dedupe cùng đợt Shop redesign.

---

## 5. Điểm nhỏ khác (không phải bug, chỉ ghi nhận lại cho đủ)

- `clampCompetitionStats`'s trần G+A cho vị trí không phải ST: `Math.max(apps, Math.floor(apps*1.25))`
  — về mặt toán, `floor(apps*1.25) ≥ apps` luôn đúng với apps ≥ 0, nên `Math.max` không bao
  giờ đổi kết quả — code thừa nhưng vô hại.
- `getOverqualifyPerfScale` luôn trả `1.0` bất kể input — đúng chủ đích SoT §7.1 ("giữ
  nguyên 100% đóng góp của superstar"), không phải code chết bị quên.
- `getEffectiveAttributeRating`'s fallback `defaultOvr` (dùng khi 1 attribute nào đó thiếu
  trong `currentStats`) chính là `effPositionOvr` — về lý thuyết tạo 1 vòng phụ thuộc nhẹ
  (effPositionOvr dùng để tính effPositionOvr's fallback), nhưng vì `currentStats` trong
  thực tế luôn có đủ cả 6 key/vị trí (schema hiện tại không cho thiếu), nhánh fallback này
  gần như không bao giờ được kích hoạt — rủi ro chỉ là lý thuyết, không phải bug đang xảy ra.

---

## 6. Khuyến nghị (để bàn, không tự quyết)

1. **Không nhất thiết phải gộp 4 bảng thành 1** — chúng trả lời 4 câu hỏi khác nhau
   (khả năng tổng thể / khả năng ghi bàn / khả năng kiến tạo-giữ sạch lưới per-app / đóng
   góp vào rating), gộp lại có thể làm mất sắc thái đang có (vd 1 CB có `phy` cao nên ghi
   bàn tốt từ set-piece dù `def` thấp hơn CB khác — nếu gộp chung 1 bảng sẽ khó biểu diễn).
2. **Nên làm nếu muốn giảm rủi ro bảo trì:** thêm 1 dòng comment ở đầu mỗi trong 4 file/hàm,
   trỏ chéo sang 3 chỗ còn lại + ghi rõ "đổi vị trí X ở đây thì cân nhắc có cần đổi ở [3 chỗ
   kia] không" — rẻ, không đổi số nào, chỉ giảm khả năng quên.
3. Nếu muốn quyết liệt hơn: viết 1 bảng "canonical" duy nhất `POSITION_PROFILE[pos] = {
   primaryAttrs, secondaryAttrs, csEligible }` rồi derive cả 4 bảng hiện tại từ đó bằng hệ
   số nhân theo mục đích — rủi ro cao hơn (đổi hành vi hiện tại nếu derive không khớp số cũ
   100%), nên chỉ làm nếu có ý định retune toàn diện, không phải việc nên làm "tiện tay".
