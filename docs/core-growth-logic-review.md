# Review: OVR Debut, Growth Weights & Formation Position Granularity

> Tài liệu thảo luận — chưa code. Ghi lại các vấn đề về logic tăng trưởng chỉ số/OVR
> và độ chi tiết vị trí trên formation board. Dùng để quyết định hướng trước khi
> triển khai.
>
> - Bản cập nhật lần 2: gộp vấn đề vị trí, làm rõ main-stat từng vị trí cụ thể, giải
>   thích Magnitude, thiết kế lại Count, và đào sâu vấn đề Yes/No gate.
> - Bản cập nhật lần 3: lý giải vì sao CB/CM/ST chỉ có 2 main-stat trong khi
>   ST-cánh/CAM có 3 (do công thức OVR viết không đồng đều, không phải do bản chất
>   vị trí), đề xuất công thức mới để MỌI vị trí đều có đúng 3 main-stat cụ thể — qua
>   đó giải quyết luôn Vấn đề E (selector weight không đều).
> - Bản cập nhật lần 4 (**làm source of truth**): chốt toàn bộ mục "Cần quyết định"
>   thành quyết định cuối cùng (theo hướng đã điều chỉnh qua trao đổi) — không còn
>   câu hỏi mở trong tài liệu. Vài chỗ không có phản hồi rõ ràng, Claude tự chọn
>   phương án mặc định và ghi chú rõ để dễ đổi lại nếu cần. Thêm Vấn đề F (mở rộng
>   biên độ Magnitude 1-6 → 1-8) và Vấn đề G (review logic Debut Age & Debut OVR).
> - Bản cập nhật lần 5: Magnitude mở domain 1-8 đồng đều cho mọi tier (không chỉ tier
>   Xuất sắc); dải Debut Age mở rộng 15-21; thêm Vấn đề H — thiết kế 2 wheel mới cho
>   Height & Weight, tạo modifier lên debut stats theo vị trí (phát hiện thêm: height
>   hiện đang hardcode 175 lúc debut và bị random ngầm sai thời điểm lúc giải nghệ).

---

## Vấn đề A — Vị trí không được xử lý đủ chi tiết (gộp Vấn đề 1 + 6 cũ)

### A.1 — Gốc rễ chung

`position` (string) không chỉ là label hiển thị trên formation board — nó là
**nguồn duy nhất** được truyền xuống toàn bộ chuỗi logic quyết định OVR và tăng
trưởng:

```
FORMATION_SLOTS (types/squad.ts)
   → position string
      → getDebutStatWeights()       (lib/wheel-engine/weight-calculator.ts)
      → calculateOvrByPosition()    (lib/wheel-engine/weight-calculator.ts)
      → selector weight khi tăng chỉ số (career-wheel-resolver.ts + useCareerWheelItems.ts)
```

Hiện có 2 lỗ hổng cùng gốc:

1. **`FORMATION_SLOTS` không đủ chi tiết** — sơ đồ `4-3-3` gán cả 3 tiền vệ trung
   tâm là `"CM"` ([types/squad.ts:25-27](../types/squad.ts#L25)), nằm cùng 1 hàng
   ngang (`y: 50` cho cả 3) — không phân biệt CDM (lùi sâu, phòng ngự) / CM (giữa)
   / CAM (dâng cao, tấn công), dù `getDebutStatWeights` đã có case riêng biệt cho cả
   3 vị trí này từ trước ([weight-calculator.ts:213-235](../lib/wheel-engine/weight-calculator.ts#L213))
   — chỉ là chưa bao giờ được kích hoạt vì FORMATION_SLOTS không bao giờ gán "CDM"
   hay "CAM".

2. **3 hàm position-aware không cover hết mọi giá trị `position` xuất hiện trong
   FORMATION_SLOTS** — cụ thể là `LM`/`RM` (dùng ở `4-4-2` và `3-5-2`,
   [types/squad.ts:38,41,50,54](../types/squad.ts#L38)) và (như phát hiện thêm bên
   dưới) một số vị trí bị **nhóm sai nhóm** trong hàm selector weight.

### A.2 — Vì sao chỉ ST/LW/RW/CAM có 3 main-stat mà CB/CDM/CM/GK chỉ có 2?

**Đây không phải quy luật bóng đá bắt buộc — mà là do công thức `calculateOvrByPosition`
hiện tại được viết KHÔNG ĐỒNG ĐỀU giữa các vị trí:**

| Vị trí | Top 2 stat trong công thức | Top 2 chiếm % |
|---|---|---|
| CB | def(45%) + phy(35%) | **80%** — dồn gần hết vào 2 stat |
| ST | sho(45%) + pac(25%) | **70%** — dồn gần hết vào 2 stat |
| CM | pas(30%) + dri(25%) | 55% |

So với LW/RW (pac 35%+dri 30%+sho 20% = 85%) và CAM (pas 35%+dri 30%+sho 25% = 90%)
— 2 vị trí này được viết trải trọng số ra 3 stat có ý nghĩa thật ngay từ đầu, còn
CB/CM/ST bị dồn hết vào 2 stat, phần còn lại (pac 15%/pas 5% cho CB, dri 15%/phy
10%/pas 5% cho ST) chỉ là "cho có" — không đủ trọng số để xứng đáng gọi là main.

**Kết luận: đúng là bất công, và có thể sửa tận gốc** — chỉnh lại công thức OVR của
CB/CM/ST (chỉ 3 vị trí bị lệch) để mỗi vị trí đều có đúng 3 main-stat cụ thể, thay vì
chấp nhận 2-vs-3 do lịch sử viết code không nhất quán.

### A.3 — Đề xuất: công thức OVR mới, MỌI vị trí đều có đúng 3 main-stat

Chỉ cần nâng 1 stat phụ hiện tại của CB/CM/ST lên mức có trọng số thật (~20%), các vị
trí còn lại giữ nguyên vì vốn đã tự nhiên có 3 main:

| Vị trí | Công thức OVR đề xuất | 3 Main-stat | 3 Secondary |
|---|---|---|---|
| GK | ref·25 + div·25 + han·20 + pos·15 + kic·10 + spd·05 *(giữ nguyên)* | `ref`, `div`, `han` | pos, kic, spd |
| CB | def·40 + phy·30 + **pac·20** + pas·10 *(pac 15→20, dồn từ def/phy)* | `def`, `phy`, **`pac`** | pas, sho, dri |
| LB/RB | pac·30 + def·30 + pas·20 + dri·10 + phy·10 *(giữ nguyên, đã đủ 3)* | `pac`, `def`, `pas` | dri, phy, sho |
| CDM | def·35 + phy·30 + pas·20 + dri·10 + pac·05 *(giữ nguyên, đã đủ 3 — chỉ cần fix selector cho khớp)* | `def`, `phy`, `pas` | dri, pac, sho |
| CM | pas·30 + dri·25 + **phy·20** + def·15 + sho·10 *(phy 15→20, bỏ pac)* | `pas`, `dri`, **`phy`** | def, sho, pac |
| CAM | pas·35 + dri·30 + sho·25 + pac·10 *(giữ nguyên, đã đủ 3)* | `pas`, `dri`, `sho` | pac, def, phy |
| LW/RW | pac·35 + dri·30 + sho·20 + pas·15 *(giữ nguyên, đã đủ 3)* | `pac`, `dri`, `sho` | pas, def, phy |
| ST | sho·40 + pac·25 + **dri·20** + phy·10 + pas·05 *(sho 45→40, dri 15→20)* | `sho`, `pac`, **`dri`** | phy, pas, def |
| LM/RM *(mới)* | dri·30 + pac·30 + pas·25 + def·10 + phy·05 | `dri`, `pac`, `pas` | def, phy, sho |

Với bảng này, **mọi vị trí đều có main-total = 75/105 (~71%)** khi áp vào selector
weight (`weight=25` × 3 main / tổng `25×3 + 10×3`) — tự động giải quyết luôn "Vấn đề
E" bản trước (selector weight không đều giữa vị trí), vì giờ mức độ tập trung
(concentration) là như nhau cho MỌI vị trí, không còn chỗ nào 56% chỗ khác 71%.

**Quyết định**:
1. Áp dụng bảng OVR mới ở trên cho CB/CM/ST — mọi vị trí đều có đúng 3 main-stat.
2. Giữ nguyên con số % đề xuất (CB pac 15→20, CM phy 15→20, ST dri 15→20) làm chuẩn.
3. *(Claude tự chọn, dễ đổi lại)* Giữ selector weight nhị phân đơn giản
   (`main=25` / `other=10`) — KHÔNG chia thêm mức primary/secondary/minor ở đợt này,
   vì thứ tự ưu tiên trong 3 main-stat (vd CB: def 40% > pac 20%) chưa ảnh hưởng đủ
   lớn để đáng thêm độ phức tạp ngay bây giờ. Có thể xem lại sau nếu chơi thử thấy
   cần tinh chỉnh sâu hơn.

### A.4 — Đề xuất định nghĩa mới cho LM/RM

Cần bổ sung case riêng ở cả 3 hàm. Đề xuất công thức OVR (dựa trên logic tiền vệ
cánh: tấn công + tạt bóng + có tham gia phòng ngự nhẹ hơn winger):

```
LM/RM OVR = dri·30 + pac·30 + pas·25 + def·10 + phy·05
```

Debut stat range đề xuất (thấp hơn winger thuần một chút ở pac/dri vì có nhiệm vụ
lùi về hỗ trợ, cao hơn winger ở def):
- `pac`, `dri`: 60-78 (so với winger 65-80)
- `pas`: 55-72
- `def`: 35-55 (so với winger 20-35 — LM/RM tham gia phòng ngự nhiều hơn winger)
- `sho`, `phy`: 50-65

Main-stat cho selector (3 stat, theo bảng A.3): `dri`, `pac`, `pas` (không phải
`pas`/`dri` như hiện tại).

**Quyết định**: áp dụng công thức LM/RM như trên.

### A.5 — Đề xuất fix Formation board (CDM/CM/CAM ở 4-3-3)

Đổi 3 slot `"CM"` cùng hàng trong `4-3-3` thành bố cục so le chiều sâu:

```ts
// Đề xuất (chọn 1 trong 2 biến thể):

// Biến thể cổ điển: 1 CDM + 2 CM
{ index: 5, position: "CM",  x: 22, y: 46 },
{ index: 6, position: "CDM", x: 50, y: 58 },  // lùi sâu hơn (y lớn hơn)
{ index: 7, position: "CM",  x: 78, y: 46 },

// Biến thể hiện đại: 2 CM + 1 CAM
{ index: 5, position: "CM",  x: 30, y: 55 },
{ index: 6, position: "CM",  x: 70, y: 55 },
{ index: 7, position: "CAM", x: 50, y: 40 },  // dâng cao hơn (y nhỏ hơn)
```

Nên áp dụng tương tự cho `4-4-2`/`3-5-2` nếu có chỗ dùng nhiều `CM` giống hệt nhau
để nhất quán (hiện 2 sơ đồ đó chỉ có 2 CM nên ít nghiêm trọng hơn).

**Quyết định**: *(Claude tự chọn, dễ đổi lại vì chỉ là data trong `FORMATION_SLOTS`)*
— dùng biến thể cổ điển **1 CDM + 2 CM**, vì đây là cách hiểu phổ biến/kinh điển
nhất của "4-3-3" và không cần thêm cơ chế cấu hình biến thể. Nếu sau này muốn đổi
sang 2 CM + 1 CAM chỉ cần sửa lại `position`/`y` của 1 slot, không ảnh hưởng gì
khác.

---

## Vấn đề B — Magnitude là gì? (giải thích, không phải lỗi)

**Magnitude = độ lớn (số điểm) của MỖI lần tăng/giảm 1 chỉ số cụ thể.** Đây là bước
cuối cùng trong chuỗi 4 vòng quay mỗi mùa giải:

```
1. dir_increase / dir_decrease  → CÓ tăng/giảm chỉ số mùa này không? (yes/no)
2. count                        → nếu có, ẢNH HƯỞNG BAO NHIÊU chỉ số? (1-4)
3. selector                      → CHỈ SỐ NÀO được chọn? (lặp lại "count" lần)
4. magnitude                     → MỖI LẦN sau khi chọn xong 1 chỉ số ở bước 3,
                                    tăng/giảm bao nhiêu ĐIỂM cho chỉ số đó? (1-6,
                                    xem đề xuất mở rộng lên 1-8 ở Vấn đề F)
```

Ví dụ cụ thể: mùa giải có rating 7.8 (tốt), wheel roll ra hướng "tăng", count roll
ra "3" → nghĩa là 3 chỉ số sẽ được chọn lần lượt qua bước selector. **Sau MỖI lần**
chọn xong 1 chỉ số (vd: chọn được PAC), có 1 vòng quay magnitude RIÊNG cho chỉ số đó
để quyết định PAC tăng thêm bao nhiêu điểm (vd: +4). Vòng lặp bước 3-4 diễn ra 3 lần
liên tiếp (đúng bằng số ở bước count) — mỗi chỉ số có magnitude độc lập, không phải
1 con số dùng chung cho cả mùa.

Vì rating 7.8 ≥ ngưỡng "cao", magnitude dùng bảng thiên về +4/+5 điểm (không phải
bảng thiên về +1/+2). Bảng magnitude càng cao ngưỡng rating càng dịch về phía điểm
số lớn — đây chính là cơ chế "phong độ tốt → tăng MẠNH hơn mỗi lần", khác với
"count" là cơ chế "phong độ tốt → tăng NHIỀU chỉ số hơn" (xem Vấn đề C bên dưới, 2
cơ chế này độc lập nhau trong code hiện tại).

---

## Vấn đề C — Thiết kế lại Weight Count cho logic hơn

### Hiện trạng

Pool cố định `1:45, 2:35, 3:15, 4:5` ([career-wheel-resolver.ts:93-98](../features/wheel/lib/career-wheel-resolver.ts#L93))
— không đổi theo rating hay tuổi. Một mùa rating 8.0 và rating 7.0 (cả 2 đều roll
"yes" ở gate) có cùng xác suất ảnh hưởng 1 vs 4 chỉ số.

### Đề xuất thiết kế lại — Count tỉ lệ theo rating (cùng logic với Magnitude)

Chia thành 4 tier theo rating (dùng chung khung tier với Vấn đề D bên dưới để nhất
quán toàn hệ thống), mỗi tier có 1 pool count riêng, thiên về count lớn hơn khi
rating cao hơn:

| Tier | Điều kiện rating (increase) | Pool Count (1 / 2 / 3 / 4) | Count trung bình |
|---|---|---|---|
| Xuất sắc | ≥ 7.50 | 15 / 30 / 35 / 20 | ~2.6 |
| Tốt | 7.00 – 7.49 | 30 / 35 / 25 / 10 | ~2.15 |
| Trung bình | 6.50 – 6.99 | 50 / 32 / 14 / 4 | ~1.72 (≈ gần bằng pool cũ) |
| Kém | < 6.50 | 70 / 22 / 6 / 2 | ~1.4 |

Logic: mùa xuất sắc toàn diện → có xu hướng cải thiện RỘNG hơn (nhiều chỉ số cùng
lúc), không chỉ tăng MẠNH ở 1 chỗ. Tier "Trung bình" giữ gần với phân phối cũ để
không đổi cảm giác game quá đột ngột ở mức rating phổ biến nhất.

**Quyết định**:
1. Áp dụng hướng "rating cao → count trung bình cao hơn" theo bảng trên.
2. Count chỉ phụ thuộc rating, KHÔNG phụ thuộc thêm tuổi — tuổi đã ảnh hưởng gián
   tiếp qua gate yes/no rồi, thêm vào count nữa sẽ dư thừa và khó tune.
3. Áp dụng tier tương tự (nghịch đảo) cho hướng "decrease" — rating càng tệ → count
   giảm cũng rộng hơn (xuống dốc nhiều chỉ số cùng lúc), cùng 4 tier ở Vấn đề D.3.

---

## Vấn đề F — Có nên mở rộng biên độ Magnitude từ 1-6 lên 1-8?

### Hiện trạng

Magnitude hiện luôn nằm trong domain 1-6, chỉ khác nhau ở TRỌNG SỐ theo tier (tier
cao thiên về 4-6 điểm, tier thấp thiên về 1-2 điểm) — nhưng TRẦN tối đa luôn là 6 dù
tier nào.

### Quyết định: mở domain 1-8 đồng đều cho MỌI tier, chỉ đổi trọng số

Giữ 1 domain chung 1-8 cho tất cả tier (đơn giản hơn khi code — 1 mảng 8 phần tử
dùng chung, không cần domain động theo tier), chỉ dịch chuyển TRỌNG SỐ để tier cao
thiên về điểm lớn (7-8), tier thấp gần như không bao giờ ra điểm lớn:

| Tier (increase) | Pool (1/2/3/4/5/6/7/8) | Mean |
|---|---|---|
| Xuất sắc (≥7.50) | 2/4/6/12/20/25/20/11 | ~5.4 |
| Tốt (7.00-7.49) | 6/10/18/24/22/12/6/2 | ~3.9 |
| Trung bình (6.50-6.99) | 25/28/22/13/7/3/1/1 | ~2.6 |
| Kém (<6.50) | 55/25/12/5/2/1/0*/0* | ~1.6 |

*(2 ô cuối có thể để weight tối thiểu 1 thay vì 0 nếu muốn hệ thống pool không bao
giờ có weight tuyệt đối 0 — tùy cách `resolveWeightedOutcome` xử lý weight 0.)*

Hướng "decrease" áp dụng mirror y hệt theo tier (Kém giảm mạnh nhất, có thể chạm -8;
Xuất sắc hiếm khi giảm và nếu giảm cũng chỉ -1 đến -2).

---

## Vấn đề D — Yes/No gate: đào sâu bản chất bug + đề xuất fix (mở rộng từ bản trước)

### D.1 — Bug hiển thị cần fix

`dir_decrease` khi `result === "no"` (giữ nguyên chỉ số) đang set
`tempValue = "GIỮ NGUYÊN: YES"` ([career-wheel-resolver.ts:90](../features/wheel/lib/career-wheel-resolver.ts#L90))
— chữ "YES" bị dính lại từ nhánh copy-paste của `result === "yes"`, gây hiểu nhầm
khi hiển thị trên UI (người chơi thấy "YES" dù thực chất là "giữ nguyên, không đổi
gì"). **Cần sửa** thành `"GIỮ NGUYÊN CHỈ SỐ"` hoặc tương đương — đây là điểm chắc
chắn cần fix, không phải điểm cần bàn thêm.

### D.2 — Ngưỡng rating rời rạc gây bước nhảy gắt

Hiện `dir_increase` dùng 4 mốc (7.50/7.00/6.40) và `dir_decrease` dùng 2 mốc khác
hẳn (6.30/6.80) — 2 bộ ngưỡng không liên quan tới nhau, cộng thêm không khớp với
ngưỡng của magnitude (7.60/6.80 và 6.20/6.80, xem file bản trước — Vấn đề 4 cũ).
Kết quả: rating 6.39 → 5% yes tăng, rating 6.41 → 40% yes tăng (chênh 8 lần chỉ vì
0.02 điểm).

### D.3 — Đề xuất: hợp nhất về 1 khung tier rating duy nhất dùng chung cho gate + count + magnitude

Thay vì mỗi wheel tự định nghĩa ngưỡng riêng, dùng chung 1 bảng tier (rating tuyệt
đối, không phân biệt hướng tăng/giảm):

| Tier | Rating |
|---|---|
| Xuất sắc | ≥ 7.50 |
| Tốt | 7.00 – 7.49 |
| Trung bình | 6.50 – 6.99 |
| Kém | < 6.50 |

Sau đó:
- **Gate tăng** (`dir_increase` yes%): Xuất sắc=80, Tốt=60, Trung bình=40, Kém=5
- **Gate giảm** (`dir_decrease` yes%, chỉ chạy khi gate tăng đã "no"): Kém=70,
  Trung bình=30, Tốt=10, Xuất sắc=5 (nghịch đảo cùng tier, thay vì bộ ngưỡng
  6.30/6.80 riêng biệt như hiện tại)
- **Count**: theo bảng ở Vấn đề C
- **Magnitude**: theo tier thay vì ngưỡng riêng 7.60/6.80 — Xuất sắc dùng bảng
  magnitude cao nhất, Kém dùng bảng thấp nhất

→ Giải quyết đồng thời: bug bước nhảy gắt (dù vẫn là bucket rời rạc — xem D.4), vấn
đề ngưỡng lệch giữa gate/magnitude (Vấn đề 4 cũ), và làm Count nhất quán logic với
2 wheel còn lại.

### D.4 — Bucket rời rạc vs nội suy liên tục

Hợp nhất tier ở D.3 làm giảm SỐ LƯỢNG bộ ngưỡng khác nhau (từ 4 bộ còn 1 bộ dùng
chung), nhưng KHÔNG loại bỏ hoàn toàn hiện tượng "bước nhảy" tại ranh giới tier (vd:
rating 7.49 vs 7.50 vẫn nhảy từ 60% lên 80%). Có 2 hướng:
- **Giữ bucket rời rạc** (như đề xuất D.3) — đơn giản, dễ balance/tune bằng tay,
  chấp nhận có bước nhảy tại ranh giới nhưng ít nhất NHẤT QUÁN giữa các wheel.
- **Chuyển sang nội suy tuyến tính liên tục** — vd yes% = clamp(f(rating), 5, 95)
  với f là hàm tuyến tính hoặc sigmoid theo rating — mượt hơn, không có bước nhảy,
  nhưng khó tune bằng tay hơn và khó giải thích trực quan cho người chơi.

**Quyết định**: chọn D.3 (hợp nhất tier, vẫn bucket rời rạc) — đơn giản, dễ tune, đã
đủ giải quyết vấn đề ngưỡng lệch nhau giữa các wheel. Chưa cần đầu tư sang nội suy
liên tục ở đợt này.

### D.5 — Age curve theo vị trí (giữ nguyên đề xuất từ bản trước, bổ sung số cụ thể)

Ngưỡng tuổi trẻ/già hiện dùng chung `<=22` / `>=30` cho mọi vị trí. Đề xuất chia 3
nhóm tuổi nghề riêng:

| Nhóm vị trí | Trẻ (dễ tăng) | Đỉnh cao (ổn định) | Già (dễ giảm) |
|---|---|---|---|
| GK, CB | ≤ 23 | 24 – 31 | ≥ 32 |
| LB/RB, CDM, CM | ≤ 22 | 23 – 29 | ≥ 30 (giữ như hiện tại) |
| CAM, LW/RW, LM/RM, ST | ≤ 21 | 22 – 27 | ≥ 28 (già sớm hơn vì phụ thuộc `pac`) |

**Quyết định**: áp dụng 3 nhóm tuổi nghề như bảng trên.

---

## Vấn đề E — Selector weight không đều giữa vị trí (ĐÃ GIẢI QUYẾT bởi A.3)

Bản trước phát hiện: main-stat luôn `weight=25` so với phụ `weight=10`, nhưng số
lượng main-stat khác nhau theo vị trí (ST/CB/CDM chỉ 2 main → 56% concentration,
LW/RW 3 main → 71% concentration) — tạo cảm giác bất công giữa các vị trí.

**Sau khi áp bảng A.3 (mọi vị trí đều có đúng 3 main-stat)**, vấn đề này tự động biến
mất: mọi vị trí đều có main-total = 75/105 (~71%), không còn chênh lệch 56% vs 71%
giữa các vị trí nữa. Không cần xử lý riêng — giữ mục này lại chỉ để ghi nhận đã được
giải quyết gián tiếp, không phải bỏ sót.

---

## Vấn đề G — Review logic Debut Age & Debut OVR

### G.1 — `DEBUT_OVR_POOL` là dead code

`DEBUT_OVR_POOL` ([weight-calculator.ts:101-111](../lib/wheel-engine/weight-calculator.ts#L101))
trông như một pool xác định OVR debut, nhưng thực tế **debut OVR không bao giờ được
random trực tiếp từ pool này**. Toàn bộ debut OVR được TÍNH ra từ 6 chỉ số roll riêng
lẻ qua `calculateOvrByPosition` (`useWheelUiStore.ts` case bước cuối cùng của setup
wheel). `DEBUT_OVR_POOL` chỉ còn được tham chiếu ở đúng 1 chỗ: nhánh `default` của
`getDebutStatWeights` ([weight-calculator.ts:237](../lib/wheel-engine/weight-calculator.ts#L237))
— tức là fallback cho vị trí KHÔNG khớp bất kỳ case nào. Với danh sách vị trí hợp lệ
hiện tại (kể cả sau khi thêm LM/RM ở A.4), nhánh `default` này **không bao giờ được
kích hoạt** — biến nó thành dead code thực sự.

**Quyết định**: giữ lại nhánh `default` như một fallback an toàn (phòng khi có vị trí
mới chưa kịp thêm case riêng), nhưng đổi comment cho rõ đây là "emergency fallback,
không phải pool debut OVR thật" để tránh gây hiểu nhầm cho người đọc code sau này.

### G.2 — Debut Age và Debut Stats được roll hoàn toàn độc lập, không liên quan nhau

`DEBUT_AGE_POOL` (16-21 tuổi) và các pool chỉ số (`getDebutStatWeights`) được quay ở
2 bước riêng biệt trong setup wheel, không có bất kỳ liên hệ nào giữa tuổi ra mắt và
biên độ chỉ số. Nghĩa là 1 cầu thủ ra mắt năm 16 tuổi và 1 cầu thủ ra mắt năm 21 tuổi
CÙNG roll chỉ số từ CÙNG 1 dải giá trị (vd ST: pac/sho/dri 65-80 cho cả 2).

Về mặt thực tế bóng đá, đây có thể biện minh được 2 chiều:
- **Ủng hộ giữ nguyên (độc lập)**: việc ra mắt đội 1 năm 16 tuổi tự nó đã là một bộ
  lọc tài năng (không phải ai cũng debut sớm được) — nên không cần ép chỉ số thấp hơn
  cho debut trẻ, vì họ vốn đã là trường hợp đặc biệt.
- **Ủng hộ thêm tương quan**: cầu thủ 16 tuổi dù tài năng vẫn thường chưa phát triển
  hết thể chất — có thể hợp lý hơn nếu debut càng trẻ, dải chỉ số bắt đầu thấp hơn
  một chút (vd trừ 3-5 điểm so với dải gốc cho debut ở tuổi 16-17), bù lại bằng dư
  địa tăng trưởng dài hơn suốt sự nghiệp.

**Quyết định**: giữ nguyên độc lập (phương án đơn giản) ở đợt này — việc ra mắt sớm
đã tự mang tính chọn lọc tài năng, không cần thêm cơ chế điều chỉnh theo tuổi. Có thể
xem lại nếu sau này muốn tăng chiều sâu mô phỏng.

### G.3 — Mở rộng dải tuổi debut xuống 15

`DEBUT_AGE_POOL` hiện tại là 16-21. **Quyết định**: đổi thành **15-21** — thêm mốc 15
tuổi cho trường hợp thần đồng ra mắt cực sớm. Đề xuất weight cho mốc 15 (thấp nhất
trong pool, hiếm hơn cả 16):

```ts
export const DEBUT_AGE_POOL: WeightedItem<number>[] = [
  { value: 15, weight: 4 },   // mới thêm — thần đồng ra mắt cực sớm, rất hiếm
  { value: 16, weight: 10 },
  { value: 17, weight: 25 },
  { value: 18, weight: 30 },
  { value: 19, weight: 20 },
  { value: 20, weight: 10 },
  { value: 21, weight: 5 },
];
```

### G.4 — Debut OVR của LM/RM và CB/CM/ST sẽ tự động đúng sau khi fix A.3/A.4

Vì debut OVR luôn được tính qua `calculateOvrByPosition`, một khi công thức của
CB/CM/ST được cập nhật (A.3) và LM/RM được định nghĩa (A.4), debut OVR của các vị
trí này sẽ tự động phản ánh đúng công thức mới — không cần sửa gì thêm ở phần debut
riêng.

---

## Vấn đề H — Thêm vòng quay Height & Weight, ảnh hưởng debut stats

### H.1 — Hiện trạng thực tế KHÔNG phải "FE random" — mà là 2 bug khác

Đã kiểm tra code, `height` **không** được random ở FE:

- Lúc debut (`initCareerPlayerAction`, [player.actions.ts:90](../actions/player.actions.ts#L90)):
  `height: 175` — **hardcode cứng**, mọi cầu thủ mọi vị trí đều là 175cm suốt cả sự
  nghiệp đang chơi.
- Lúc giải nghệ (`saveCareerPlayer`, [player.actions.ts:168](../actions/player.actions.ts#L168)):
  `resolveRandomInt(170, 195)` — được random lại NGẦM, ghi đè giá trị 175 cũ, chỉ
  đúng lúc lưu record cuối cùng. Cùng vấn đề với `preferredFoot` (hardcode "Right"
  lúc debut, random lại lúc giải nghệ).

→ Trong suốt quá trình chơi, chiều cao luôn hiển thị 175 sai; chỉ đúng (nhưng vẫn là
random, không theo vị trí) sau khi giải nghệ. Đây là bug cần fix, không phải hành vi
mong muốn.

Ngoài ra: **chưa hề có cột `weight` (cân nặng) trong DB** — cần thêm cột mới +
migration Prisma khi triển khai.

### H.2 — Đề xuất: 2 wheel mới ở bước setup, chèn ngay sau bước chọn Debut Age

Vị trí chèn: sau bước 1 (Debut Age) và trước bước chọn 6 chỉ số core (hiện là bước
2-7) — vì chiều cao/cân nặng sẽ dùng để tính modifier áp lên các chỉ số core ngay
sau đó, nên cần roll height/weight TRƯỚC khi roll chỉ số.

```
Bước 0: Quốc tịch
Bước 1: Debut Age
Bước 2 (MỚI): Chiều cao — theo vị trí
Bước 3 (MỚI): Cân nặng — phụ thuộc chiều cao vừa roll (dải BMI hợp lý)
Bước 4-9: 6 chỉ số core (dịch xuống 2 bước, có áp modifier từ height/weight)
Bước 10: Career Length
Bước 11: League
Bước 12: Club
```

### H.3 — Dải chiều cao theo vị trí (cm)

| Vị trí | Dải chiều cao | Lý do |
|---|---|---|
| GK | 185 – 198 | Thủ môn càng cao càng có lợi thế bắt bóng cao |
| CB | 182 – 196 | Cần thắng không chiến |
| CDM | 178 – 190 | Cần thể chất, đôi khi tranh chấp không chiến |
| LB/RB | 172 – 185 | Cần nhanh nhẹn hơn CB nhưng vẫn cần thể hình |
| CM | 173 – 185 | Trung dung |
| CAM | 168 – 182 | Thiên kỹ thuật, không cần quá cao |
| LW/RW | 165 – 180 | Cần nhanh nhẹn, thấp có lợi cho tốc độ xử lý |
| LM/RM | 168 – 181 | Tương tự winger nhưng nhích cao hơn chút (tham gia phòng ngự) |
| ST | 170 – 190 | Dải rộng nhất — vừa có mẫu "poacher" thấp nhanh, vừa có "target man" cao to |

Dùng lại `generateContinuousWeights` (đã có sẵn trong `weight-calculator.ts`) để tạo
phân phối hình chuông quanh trung điểm mỗi dải — không cần viết hàm mới.

### H.4 — Cân nặng: wheel riêng nhưng dải phụ thuộc chiều cao vừa roll

Roll cân nặng là 1 wheel riêng (đúng như yêu cầu — 2 vòng quay tách biệt), nhưng dải
giá trị của wheel này được tính động dựa trên chiều cao vừa roll ở bước trước, theo
công thức BMI hợp lý cho vận động viên (BMI 21-24):

```ts
function getWeightRangeFromHeight(heightCm: number): { min: number; max: number } {
  const heightM = heightCm / 100;
  const min = Math.round(21 * heightM * heightM);
  const max = Math.round(24 * heightM * heightM);
  return { min, max };
}
// vd height=180cm → min=68kg, max=78kg
// vd height=195cm (GK cao) → min=80kg, max=91kg
```

Wheel cân nặng dùng `generateContinuousWeights(min, max)` trên dải động này — vẫn là
1 vòng quay thật, chỉ là biên độ không cố định mà phụ thuộc kết quả wheel trước đó
(giống cách `getClubWeights` phụ thuộc `leagueId` đã chọn).

### H.5 — Height/Weight tạo modifier lên debut stats

Sau khi roll xong height + weight, tính độ lệch so với TRUNG ĐIỂM dải của vị trí đó,
rồi áp modifier nhỏ lên 2 chỉ số đối lập nhau trước khi roll 6 chỉ số core:

```ts
function getPhysiqueModifier(heightCm: number, weightKg: number, position: string) {
  const { min, max } = HEIGHT_RANGE_BY_POSITION[position]; // bảng H.3
  const mid = (min + max) / 2;
  const heightDev = heightCm - mid; // dương = cao hơn TB vị trí, âm = thấp hơn

  // Mỗi 5cm lệch khỏi trung điểm → 1 điểm modifier, cap ±3
  const mod = Math.max(-3, Math.min(3, Math.round(heightDev / 5)));

  // GK dùng div/spd; field player dùng phy/pac
  const bulkyStat = position === "GK" ? "div" : "phy";
  const agileStat = position === "GK" ? "spd" : "pac";

  return mod >= 0
    ? { [bulkyStat]: +mod, [agileStat]: -mod }   // cao/nặng hơn TB → cộng bulky, trừ agile
    : { [bulkyStat]: mod, [agileStat]: -mod };   // thấp/nhẹ hơn TB → trừ bulky, cộng agile
}
```

Modifier này cộng/trừ trực tiếp vào giá trị vừa roll của `phy`/`pac` (hoặc
`div`/`spd` cho GK) trước khi tính `debutOvr` qua `calculateOvrByPosition` — tự động
tuân thủ invariant #4 (OVR luôn tính lại từ stats, không set tay).

**Cân nặng** dùng cùng cơ chế nhưng biên độ nhỏ hơn (weight lệch khỏi mid-BMI dải
±2kg mới tính 1 điểm modifier, thay vì mỗi 5cm) — vì chiều cao ảnh hưởng thể hình rõ
hơn cân nặng thuần túy.

### H.6 — Việc cần làm khi triển khai (liệt kê trước, chưa code)

1. **Migration Prisma**: thêm cột `weight Int` vào model `CareerPlayer`
   ([schema.prisma:36](../prisma/schema.prisma#L36), cạnh `height`).
2. Thêm `HEIGHT_RANGE_BY_POSITION` + `getWeightRangeFromHeight` +
   `getPhysiqueModifier` vào `lib/wheel-engine/weight-calculator.ts`.
3. Thêm 2 case mới (height, weight) vào `useSetupStage.ts` + `useWheelUiStore.ts`
   (`resolveStep`), chèn giữa bước Debut Age và 6 chỉs số core.
4. Áp `getPhysiqueModifier` vào bước tính `debutOvr` ở `useWheelUiStore.ts` (case
   bước cuối cùng của 6 stat core).
5. Xóa bỏ hardcode `height: 175`/`preferredFoot: "Right"` ở `initCareerPlayerAction`
   — dùng giá trị roll được từ wheel mới.
6. Xóa bỏ random lại height/preferredFoot ở `saveCareerPlayer` (retirement) — giá trị
   đã đúng từ lúc debut, không cần re-roll.
7. Cập nhật `CareerSetupResult`/`DraftDataInput`/Zod schema trong
   `actions/season.actions.ts` để truyền height/weight qua.

**Cần xác nhận trước khi code**: đây là feature có đụng tới Prisma schema (migration)
— sẽ hỏi lại xác nhận riêng trước khi chạy migration thật, theo đúng quy tắc an toàn
(thay đổi schema DB là hành động khó đảo ngược).

---

## Tổng kết mức ưu tiên đề xuất

| # | Vấn đề | Mức độ | Loại |
|---|---|---|---|
| A.2/A.3 | Công thức OVR không đồng đều: CB/CM/ST chỉ dồn 2 stat trong khi LW/RW/CAM tự nhiên có 3 — đề xuất công thức mới để mọi vị trí đều có đúng 3 main-stat | Cao | Correctness gap + fairness |
| A.4 | LM/RM chưa được định nghĩa ở bất kỳ hàm position-aware nào | Cao | Correctness gap |
| A.2 | LB/RB & CDM đang bị selector boost sai stat (lệch khỏi công thức OVR thật) | Cao | Correctness gap |
| A.5 | Formation 4-3-3 thiếu phân biệt CDM/CM/CAM (3 slot cùng label "CM") | Cao | UX + kích hoạt logic có sẵn |
| D.1 | Bug hiển thị "GIỮ NGUYÊN: YES" | Cao (dễ fix, nên làm ngay) | Bug |
| D.3/D.5 | Hợp nhất tier rating cho gate/count/magnitude + age curve theo vị trí | Trung bình | Design/balance |
| C | Weight Count không đổi theo rating — chuyển sang tỉ lệ theo tier rating | Trung bình | Design/balance |
| F | Mở rộng Magnitude sang domain 1-8 đồng đều cho mọi tier, chỉ đổi trọng số | Trung bình | Design/balance |
| H.1 | Bug: `height` hardcode 175 lúc debut, random ngầm sai thời điểm lúc giải nghệ; chưa có cột `weight` trong DB | Cao | Bug + missing feature |
| H.2-H.5 | Thêm 2 wheel mới (height, weight) ở setup, tạo modifier lên debut stats theo vị trí | Cao | Feature mới |
| G.1 | `DEBUT_OVR_POOL` là dead code, cần đổi comment cho rõ | Thấp | Code cleanliness |
| G.2/G.3 | Debut age/stats độc lập nhau (giữ nguyên); dải tuổi mở rộng 15-21 | Thấp | Đã quyết định |
| E | Selector weight không đều giữa vị trí | Đã giải quyết bởi A.3 | — |

Vấn đề A vẫn là ưu tiên cao nhất vì ảnh hưởng trực tiếp tính đúng đắn của OVR/tăng
trưởng cho nhiều vị trí đang thực sự được dùng trong game (LM/RM/CDM/LB/RB). Vấn đề H
là feature mới lớn nhất trong đợt này — có đụng tới Prisma schema nên cần xác nhận
riêng trước khi migrate. Toàn bộ tài liệu giờ không còn câu hỏi mở dạng "cần quyết
định" — chỉ còn 1 điểm cần xác nhận thực sự (chạy migration DB ở H.6).
