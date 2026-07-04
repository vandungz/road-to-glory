# Football Life — Project Wiki

**Phiên bản:** 1.0
**Cập nhật:** Tháng 7/2026
**Mục đích:** Tài liệu tham chiếu nội bộ — định nghĩa các khái niệm, game mechanics, kiến trúc và quy tắc build của dự án Football Life.

---

## Mục lục

1. [Tổng quan dự án](#1-tong-quan-du-an)
2. [Mục đích sản phẩm](#2-muc-dich-san-pham)
3. [Các khái niệm cốt lõi](#3-cac-khai-niem-cot-loi)
4. [Wheel System](#4-wheel-system)
5. [Classic Mode — Game Flow](#5-classic-mode--game-flow)
6. [Career Generation Pipeline](#6-career-generation-pipeline)
7. [Data Scope](#7-data-scope)
8. [Tech Stack](#8-tech-stack)
9. [Phases sản phẩm](#9-phases-san-pham)
10. [Quy tắc build bất di bất dịch](#10-quy-tac-build-bat-di-bat-dich)

---

## 1. Tong quan du an

| Thuộc tính | Giá trị |
|---|---|
| Tên dự án | Football Life |
| Loại | Web game — luck-based football career simulation |
| Mô hình | Personal / Indie project |
| Stack | Next.js 15, TypeScript, Tailwind, shadcn/ui, Prisma, Supabase |
| Deployment | Vercel + Supabase |
| Linh cảm từ | Random Wheel Football Career (social media trend) |

**Ngữ cảnh:** Football Life là phiên bản productized của trend Random Wheel Football Career phổ biến trên TikTok/YouTube — nơi creator spin các wheel ngẫu nhiên để tạo career cầu thủ bóng đá. Thay vì wheel hoàn toàn ngẫu nhiên, Football Life dùng **Dynamic Weighted Wheel** — probability thay đổi theo career state, tạo ra kết quả có chiều sâu và replayability cao hơn.

---

## 2. Muc dich san pham

### Vấn đề của trend hiện tại

Random Wheel Football Career trên social media:

- Wheel hoàn toàn ngẫu nhiên — không có cảm giác progression hay causality.
- Không có persistence — mỗi session là độc lập, không lưu lại.
- Thiếu depth — chỉ là spin và nhìn kết quả, không có storytelling.
- Không có visual representation — chỉ là text trên spreadsheet.

### Giải pháp của Football Life

> **One-liner:** Football Life = Random Wheel Football Career nhưng có trọng số động, FIFA-style card, career persistence, và squad XI visual.

Football Life là một **luck-based career simulation game**:

- Wheel có trọng số thay đổi theo nationality, age, position, và career context.
- Career được persisted — user có thể xem lại bất kỳ lúc nào.
- FIFA-style player cards với rarity system.
- Squad XI visual board — 11 slot trên pitch, mỗi slot là một career.
- Một game session = một Squad XI hoàn chỉnh với 11 fictional players.

**Không phải:**
- Match engine game — không có gameplay on-pitch.
- Football manager — không có squad management thực tế.
- FIFA/PES clone — không có real player licenses cần thiết.

---

## 3. Cac khai niem cot loi

---

### GameSession

Một lần chơi. Container của Squad XI. Một `GameSession` gồm:

- 11 slot theo formation 4-3-3.
- Mỗi slot khi được fill = một `CareerPlayer` được generated và persisted.
- `Squad Rating` = average peak OVR của tất cả players đã fill.
- Status: `in_progress` (chưa đủ 11) hoặc `completed` (đủ 11 players).

User có thể có nhiều GameSessions (nhiều "game"). Mỗi game độc lập — không có progression giữa các games.

---

### CareerPlayer

Cầu thủ fictional được generate bởi wheel cascade. Đây là entity trung tâm của game.

Fields chính:

```
name                 Tên fictional, sinh từ nationality pool
nationality          Quốc tịch — ảnh hưởng name pool, club pool và giải đấu đội tuyển quốc gia (Euro, Copa América, World Cup...)
position             GK / LB / CB / RB / CDM / CM / CAM / LW / RW / ST
debutAge             Tuổi debut (15–22)
retireAge            Tuổi giải nghệ = debutAge + careerLengthYears
peakOvr              OVR đỉnh cao của career (được rút trích từ mùa giải có OVR cao nhất, tie-break bằng stats vị trí)
cardRarity           bronze / silver / gold / rare_gold / epic / legendary
clubStints[]         List các club stints trong career
statsTimeline[]      Lịch sử OVR và 6 chỉ số stats của từng mùa giải thi đấu
events[]             Career events — trophy, award, injury, milestone, NT games
hiddenStats          Server-only — ảnh hưởng event generation
```

`hiddenStats` không bao giờ được expose ra client.

---

### WheelCascadeResult

Kết quả đầy đủ của một wheel cascade — 7 bước wheel chạy tuần tự. Đây là seed data để generate `CareerPlayer`.

```
nationality          Kết quả từ Nationality Wheel
position             Kết quả từ Position Wheel
debutAge             Kết quả từ Debut Age Wheel
debutOvr             Kết quả từ Debut Stats Wheel
careerLengthYears    Kết quả từ Career Length Wheel (8–28 năm tổng)
numberOfClubs        Kết quả từ Number of Clubs Wheel
```

---

### HiddenStats

Ba modifier ẩn ảnh hưởng đến career event generation. Không visible cho user.

```
personality          (-1.0 → 1.0) — ảnh hưởng off-pitch events
professionalism      (0 → 1.0) — ảnh hưởng injury frequency, longevity
luckRating           (0 → 1.0) — ảnh hưởng trophy và award probability
```

---

### StatsTimeline & Peak OVR

Lịch sử các chỉ số của cầu thủ qua từng năm sự nghiệp. Thay vì tính bằng công thức toán học cố định, chỉ số của cầu thủ được phát triển và suy giảm động thông qua việc quay **End-of-Year Stats Update wheels** ở cuối mỗi năm:
- **OVR Change Direction Wheel**: Tăng, Giảm hoặc Giữ nguyên OVR. Trọng số (weight) được tính bằng công thức: `Final Weight = Base Weight + Age Modifier + Performance Modifier`.
  * Trẻ tuổi (17-22) tăng stats nhanh; Đỉnh cao (23-28) duy trì; Lão tướng (30+) dễ giảm sút (đặc biệt PAC, PHY).
  * Mùa giải có Rating cao ($\ge 7.50$) hoặc có cúp tập thể sẽ tăng cơ hội tăng chỉ số. Mùa giải tệ ($\le 6.30$) tăng cơ hội giảm chỉ số.
- **Quantity of Stats Wheel**: Số lượng stats trong 6 stats core bị ảnh hưởng (1-4 stats).
- **Stats Magnitude Wheel**: Mức độ thay đổi của từng stat cụ thể (+/- 1 đến 4 điểm). Chỉ số biến động được ưu tiên lựa chọn theo vai trò của vị trí (Ví dụ: ST ưu tiên thay đổi SHO/PAC/DRI, CB ưu tiên thay đổi DEF/PHY).

**Peak OVR**: Sau khi cầu thủ giải nghệ, hệ thống sẽ trích xuất mùa giải có OVR cao nhất làm `peakOvr` để render thẻ cầu thủ.

---

### ClubStint

Một giai đoạn chơi tại một club cụ thể.

```
club              Real-world club (từ database)
league            Real-world league của club đó
startAge          Tuổi bắt đầu stint này
yearsAtClub       Số năm tại club (minimum 1)
ovrAtStint        OVR trung bình trong stint
events[]          Events trong stint: trophy, award, injury
```

Tổng `yearsAtClub` của tất cả stints = `careerLengthYears`.

---

### CareerEvent

Một milestone hoặc sự kiện trong career. Immutable sau khi generated.

```
type              trophy / award / injury / milestone / transfer
age               Tuổi khi event xảy ra
description       Text mô tả event
clubId            Club liên quan (nếu có, null cho tuyển quốc gia)
competitionId     Giải đấu liên quan (nếu có)
nationality       Đội tuyển quốc gia liên quan (nếu có, cho giải quốc tế)
```

Events liên kết với **real-world trophy history** của club đó trong thực tế và các giải quốc tế cấp đội tuyển. Ví dụ: nếu player chơi cho Real Madrid giai đoạn 2014–2018, events có thể include Champions League 2014, 2016, 2018.

---

### CardRarity

6 mức rarity được tính từ `peakOvr`:

| Rarity | OVR Range | Mô tả |
|---|---|---|
| `bronze` | 45–59 | Lower tier player |
| `silver` | 60–69 | Decent career |
| `gold` | 70–79 | Good professional |
| `rare_gold` | 80–84 | Quality player |
| `epic` | 85–89 | Elite player |
| `legendary` | 90–99 | World-class career |

---

### SquadRating

Average `peakOvr` của tất cả filled slots trong GameSession. Chỉ tính các slots đã có player (không tính empty slots).

```
squadRating = sum(peakOvr) / numberOfFilledSlots
```

Hiển thị dưới dạng số nguyên. Cập nhật tự động mỗi khi một slot được filled.

---

### Formation — 4-3-3

Football Life chỉ dùng một formation cố định: **4-3-3**.

```
                  [LW]  [ST]  [RW]
                    [CAM]
              [CM]         [CDM]
     [LB]  [CB]  [CB]  [RB]
                  [GK]
```

11 positions theo thứ tự slot index (0–10):

| Index | Position | Role |
|---|---|---|
| 0 | GK | Goalkeeper |
| 1 | LB | Left Back |
| 2 | CB | Centre Back (Left) |
| 3 | CB | Centre Back (Right) |
| 4 | RB | Right Back |
| 5 | CDM | Defensive Midfielder |
| 6 | CM | Central Midfielder |
| 7 | CAM | Attacking Midfielder |
| 8 | LW | Left Winger |
| 9 | ST | Striker |
| 10 | RW | Right Winger |

---

## 4. Wheel System

### Dynamic Weighted Wheel

Wheel không random hoàn toàn. Mỗi outcome có **FinalWeight** được tính từ nhiều modifiers:

```
FinalWeight = BaseWeight
            + AgeModifier(debutAge)
            + PositionModifier(position)
            + NationalityModifier(nationality)
            + UserBiasModifier(userInput)
```

- `BaseWeight`: trọng số mặc định của outcome đó.
- `AgeModifier`: debut tuổi càng trẻ → tăng weight cho career dài, high OVR potential.
- `PositionModifier`: GK thường có career dài hơn, CAM có OVR cao hơn trung bình...
- `NationalityModifier`: nationality ảnh hưởng club pool (Brazilian → Brazil/Portugal/Spain clubs), OVR distribution...
- `UserBiasModifier`: nếu user chọn nationality preference, tăng weight cho nationality đó.

**Invariant bắt buộc:** `Math.random()` chỉ được gọi tại `lib/wheel-engine/spin-resolver.ts`, một lần duy nhất per spin.

---

### Wheels & Simulation Loops

Mỗi lần fill một slot, user đi qua **Phase 1: Setup** (6 vòng quay cơ bản) và **Phase 2: Career Loop** (giả lập sự nghiệp năm này qua năm khác bằng vòng quay):

#### Phase 1: Setup (Vòng quay cơ bản)

| Step | Wheel | Input | Output |
|---|---|---|---|
| 1 | **Nationality Wheel** | User bias (optional) | `nationality` |
| 2 | **Position Wheel** | Slot position (forced) | `position` (confirmed) |
| 3 | **Debut Age Wheel** | nationality, position | `debutAge` (15–22) |
| 4 | **Debut Stats Wheel** | nationality, position, debutAge | `debutOvr` (OVR bắt đầu, 45–75) |
| 5 | **Career Length Wheel** | position, debutAge | `careerLengthYears` (8–28) |
| 6 | **Number of Clubs Wheel** | careerLengthYears | `numberOfClubs` (1–8) |

*Lưu ý Step 2: Vòng quay vị trí land vào slot đã chọn (ST, CB...) mang tính chất game feel, có thể skip nhanh.*

#### Phase 2: Career Simulation Loop (Vòng quay Stint & Năm)

Với mỗi CLB (Stint):
1. **League Wheel**: Quay chọn giải đấu phù hợp với OVR hiện tại.
2. **Club Wheel**: Quay chọn CLB cụ thể trong giải đó.
3. **Years at Club Wheel**: Quay số năm thi đấu tại CLB đó (CLB cuối tự động nhận số năm còn lại).

Với mỗi năm thi đấu tại CLB:
1. **BE tự động tính toán (Không quay)**: Số trận, bàn thắng (G), kiến tạo (A), điểm đánh giá trận đấu (Avg Rating) và thành tích tập thể (bảng xếp hạng giải, kết quả cúp quốc nội, cúp châu lục).
2. **Ballon d'Or Wheel (Tùy chọn)**: Quay nếu đạt OVR >85 và có mùa giải xuất chúng.
3. **End-of-Year Stats Update Wheels**:
   - **OVR Change Direction Wheel**: Quay xem OVR tăng, giảm hay giữ nguyên.
   - **Quantity of Stats Wheel**: Quay xem có bao nhiêu stats core bị ảnh hưởng (1-3 stats).
   - **Stats Magnitude Wheel**: Quay lượng stats cụ thể bị thay đổi (+1, +2, +3, -1, -2, -3).
4. **Tuyển quốc gia (Chu kỳ 2/4 năm)**:
   - **Call-up Wheel**: Quay xem có được gọi lên tuyển quốc gia thi đấu không.
   - **Tournament Performance Wheel**: Quay kết quả giải đấu quốc tế.

---

### Wheel Types

**Nationality Wheel:**
- Pool: ~50 quốc tịch có real-world club associations.
- User có thể nhập preferred nationality để tăng weight.
- Kết quả ảnh hưởng: name generation, club pool, và giải đấu quốc gia quốc tế (Euro, Copa América, Asian Cup, AFCON, Gold Cup, World Cup).

**Debut Age Wheel:**
- Range: 15–22 tuổi.
- Bell curve center: 17–18 (most common debut age).
- Position modifier: GK thường debut muộn hơn (18–20).

**Debut Stats Wheel:**
- Range: 45–72 OVR.
- Nationality modifier: top football nations có OVR trung bình cao hơn.
- Position modifier: GK debut OVR thường thấp hơn, CAM/ST cao hơn.

**Career Length Wheel:**
- Range: 8–28 năm.
- Tổng career age: debutAge + careerLengthYears ≤ 43.
- Position modifier: GK career dài hơn (có thể 22+ năm), ST thường ngắn hơn (8–16 năm).
- OVR modifier: high debut OVR → tendency career dài hơn.

**Peak OVR (Rút trích)**:
Không còn là vòng quay lúc khởi tạo. `peakOvr` được trích xuất tự động từ mùa giải có OVR cao nhất sau khi cầu thủ kết thúc sự nghiệp.

**Number of Clubs Wheel:**
- Range: 1–8 clubs.
- Kết quả ảnh hưởng: số stint chuyển nhượng cần đi qua.

---

### Club & Stint Wheels (Trong Career Loop)

1. **League Wheel**: Quay chọn giải đấu dựa trên OVR hiện tại và quốc tịch.
2. **Club Wheel**: Quay chọn CLB thực tế dựa trên OVR cầu thủ và danh tiếng CLB.
3. **Years at Club Wheel**: Quay số năm ở CLB, trừ dần vào tổng `careerLength`.

---

## 5. Classic Mode — Game Flow

### Tổng quan

1. User tạo `GameSession` mới (click "New Game").
2. Giao diện hiện Squad XI board — 11 slot trống trên pitch.
3. User click vào một slot trống.
4. Vòng quay Phase 1 (Setup) bắt đầu (6 steps) để lấy thông tin cơ bản.
5. Game chuyển sang giao diện giả lập sự nghiệp: người dùng quay League/Club/Years cho CLB đầu tiên, sau đó trải qua từng năm thi đấu (quay Stats Update cuối mỗi năm, quay giải quốc gia nếu có).
6. Sau khi kết thúc length sự nghiệp, player card được lật mở và lưu lại.
7. Slot trên sân hiển thị player disc. User click disc đã filled → Career Detail Modal mở.
8. Lặp lại cho đến khi đủ 11 slots.
9. Squad XI hoàn thành — user xem Squad Rating, share hoặc start game mới.

### Slot States

```
empty         Slot trống, chờ user click
spinning      Đang trong wheel flow (lock UI)
filled        Có player, click để xem career detail
```

### Wheel Spin Screen

Full-screen overlay (hoặc dedicated route) hiển thị:

- Step progress indicator: **Step 3 / 7 — Career Length**
- Wheel canvas: SVG segments với Framer Motion animation
- Previous steps strip: nationality, position, debut age đã resolved
- Result display: outcome của step hiện tại sau khi spin
- "Next" button để tiếp tục step tiếp theo

### Career Detail Modal

Right-side drawer `max-w-xl` hiển thị full career của player:

- **Header**: Player Card (FIFA-style) + tên, nationality, position, debut age
- **OVR Chart**: Line chart OVR từ debut → retire (dựa trên timeline stats thực tế qua các năm)
- **Club Timeline**: Danh sách stints với club flag, years, events
- **Career Events**: Trophy, awards, milestones theo timeline

---

## 6. Career Simulation & Generation Pipeline

Quá trình giả lập diễn ra tuần tự từng năm dưới sự tương tác của người dùng (spin wheels) và tính toán của backend:

```
[Phase 1 Setup Wheels] -> [Stint Wheels] -> [Yearly BE Simulation & End-of-Year Wheels]
                                                   ↓ (lặp lại đến hết careerLength)
                                    [Retrospective Peak OVR Extraction]
                                                   ↓
                                    [Generated CareerPlayer Persisted]
```

**1. Khởi tạo và sinh thuộc tính cơ bản**:
- Sinh tên theo quốc gia `generateName(nationality)`.
- Sinh thuộc tính vật lý và chỉ số ẩn `hiddenStats` (personality, professionalism, luckRating).

**2. Vòng lặp chuyển nhượng (Stints)**:
- Quay giải đấu và CLB tương ứng với OVR hiện tại.
- Quay số năm thi đấu tại CLB đó.

**3. Vòng lặp năm (Yearly Loop)**:
- Backend tự động tính G/A, số trận và điểm đánh giá dựa trên OVR.
- So khớp thành tích thực tế của CLB để tính cúp.
- Quay Ballon d'Or (nếu đủ điều kiện), quay Stats Update (OVR change, stats affected, magnitude).
- Quay tuyển quốc gia (gọi lên tuyển và kết quả cúp quốc tế) vào các năm chẵn/lẻ tương ứng.

**4. Rút trích Peak OVR**:
- Lấy năm có OVR cao nhất làm Peak. Render card dựa trên stats của năm này.

---

### Year-by-Year OVR & Stats Progression

Stats và OVR của cầu thủ tiến triển động qua từng năm dựa trên kết quả quay 3 vòng quay stats vào cuối mỗi mùa giải:
1. **OVR Change Direction**: Xác định OVR tăng, giảm hay giữ nguyên.
2. **Quantity of Stats**: Số lượng thuộc tính bị ảnh hưởng trong 6 core stats (1, 2 hoặc 3 stats).
3. **Stats Magnitude**: Lượng điểm cộng/trừ vào các thuộc tính bị ảnh hưởng (ví dụ: $+1, +2, -1, -2$, v.v.).

Overall OVR của mỗi năm sẽ được recalculate tự động từ 6 core stats đã cập nhật.

---

### Club Stint Distribution

Với `numberOfClubs = N` và `careerLengthYears = Y`:

```
1. Distribute Y years thành N parts (minimum 1 year mỗi stint).
2. Sort parts descending (stint dài nhất trước).
3. Assign club cho từng stint via Club Wheel (weighted by OVR + nationality).
4. Prevent duplicate clubs (trừ khi numberOfClubs > available clubs cho pool đó).
```

---

### Career Event Linkage

Events được link với **real-world trophy history** của câu lạc bộ và các **giải đấu quốc tế cấp đội tuyển quốc gia**:

**1. Liên kết cúp câu lạc bộ (Club Trophies):**
```
For each clubStint:
  Fetch club's real-world trophies in the period [startAge year, endAge year]
  Filter by: if player's ovrAtStint is high enough → include trophy event
  Apply hiddenStats.luckRating → random selection within eligible trophies
```

**2. Liên kết cúp đội tuyển quốc gia (International Trophies) & Suất dự cúp Châu lục CLB:**
- **Giải đấu ĐTQG**: Diễn ra theo chu kỳ 2 năm một lần (so le) dựa trên tuổi chẵn của cầu thủ:
  * Tuổi chia hết cho 4 (20, 24, 28, 32...): FIFA World Cup.
  * Tuổi chẵn không chia hết cho 4 (18, 22, 26, 30, 34...): Cúp liên đoàn châu lục (UEFA Euro, Copa América, AFC Asian Cup...) tương ứng theo quốc tịch.
  * *Điều kiện triệu tập*: Cầu thủ phải có OVR đạt ngưỡng quy định của quốc gia đó (Tier 1: OVR $\ge 80$, Tier 2: OVR $\ge 75$, Tier 3: OVR $\ge 70$), đồng thời vượt qua vòng quay triệu tập **Call-Up Wheel** hàng năm. Kết quả giải đấu được quyết định bằng **International Tournament Wheel**.
- **Cúp Châu lục cấp CLB (UCL/UEL/UECL/Libertadores/AFC CL/CONCACAF CC)**: Được quyết định trực tiếp dựa trên thứ hạng (League Standing) quay được ở mùa giải trước, phân phối số lượng vé chi tiết dựa vào độ uy tín **League Prestige** (giải 5 sao có 4 vé C1, giải 4 sao có 2 vé C1, giải $\le 2$ sao không có vé). Mùa giải debut lấy theo `continentalType` mặc định của CLB trong database. Kết quả thi đấu được quyết định qua **Continental Cup Wheel**.

**3. Sự kiện cá nhân và chấn thương (Awards & Injuries):**
- Generate chấn thương dựa trên: độ tuổi, vị trí, `professionalism`.
- Generate danh hiệu cá nhân (Golden Boot, Player of the Season) dựa trên: `peakOvr`, `luckRating`.

---

## 7. Data Scope

### Clubs và Leagues

**Bao gồm:** Tất cả Tier 1 và Tier 2 của các liên đoàn lớn trên thế giới:

**Châu Âu:**
- England: Premier League, Championship
- Spain: La Liga, La Liga 2
- Germany: Bundesliga, 2. Bundesliga
- Italy: Serie A, Serie B
- France: Ligue 1, Ligue 2
- Portugal: Primeira Liga, Liga Portugal 2
- Netherlands: Eredivisie
- Belgium: Jupiler Pro League
- Turkey: Süper Lig
- Scotland: Scottish Premiership

**Nam Mỹ:**
- Brazil: Série A, Série B
- Argentina: Primera División
- Colombia: Categoría Primera A
- Chile: Primera División
- Uruguay: Primera División

**Bắc Mỹ:**
- USA: MLS
- Mexico: Liga MX

**Châu Á:**
- Japan: J1 League
- South Korea: K League 1
- Saudi Arabia: Saudi Pro League
- UAE: UAE Pro League
- China: Chinese Super League (nếu có đủ data)
- Australia: A-League

**Trung Đông:**
- Qatar: Qatar Stars League
- Iran: Persian Gulf Pro League

### Player Data

Player data là **fictional** — không có real player names. Chỉ club và league là real-world.

### Trophy Data

Trophy data là **real-world** — linked với actual trophy history của clubs và các giải đấu quốc tế cấp đội tuyển quốc gia:
- Giải quốc nội (Domestic league titles, domestic cups)
- Cúp châu lục CLB (Champions League, Europa League, Copa Libertadores, AFC Champions League...)
- Giải đấu quốc tế CLB (Club World Cup)
- Giải đấu cấp đội tuyển quốc gia (FIFA World Cup, UEFA Euro, Copa América, AFC Asian Cup, CAF AFCON, CONCACAF Gold Cup)

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Animation** | Framer Motion (Wheel spin, Card reveal) |
| **UI State** | Zustand |
| **Server State** | TanStack Query |
| **ORM** | Prisma |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Deployment** | Vercel |
| **Font** | Inter (body) + Bebas Neue (display/OVR) |
| **Icons** | lucide-react |

---

## 9. Phases san pham

### Phase 1 — Classic Mode MVP

**Mục tiêu:** Playable game với core loop hoàn chỉnh.

Bao gồm:

- Auth (Supabase — email hoặc Google OAuth)
- GameSession CRUD
- Squad XI board với 11 slots (4-3-3)
- 7-step Wheel Cascade flow
- Career generation pipeline
- FIFA-style player card với rarity
- Career Detail Modal (OVR chart, club timeline, events)
- Squad Rating display
- Multiple game sessions per user

**Không bao gồm trong Phase 1:**
- Share/export squad card
- Leaderboard
- Multiplayer hoặc compare with friends
- Achievement system
- Advanced wheel customization

### Phase 2 — Social & Polish

- Squad card share image (OG image generation)
- Leaderboard (top Squad Ratings)
- Career share card
- More detailed career stats (goals, assists, trophies...)
- Optional: second formation option

### Phase 3 — Extended Modes

- **Draft Mode:** Time-limited wheel spin (pressure element)
- **Challenge Mode:** Predefined constraints (e.g., all-Brazilian squad, career before 2000...)
- **Compare Mode:** Compare two squads side by side

---

## 10. Quy tac build bat di bat dich

Đây là những quy tắc không thể thỏa hiệp trong quá trình build:

1. **Wheel Engine là pure.** `Math.random()` chỉ tồn tại tại `lib/wheel-engine/spin-resolver.ts`. Không có exception. Không có `Math.random()` trong component, action, hay service nào khác.

2. **`hiddenStats` là server-only.** Không bao giờ trả về trong API response, không bao giờ expose ra client component. Chỉ được đọc bởi career generation service.

3. **UI không quyết định.** Component không chứa business logic. Tất cả game logic — wheel weights, career generation, event linkage — sống trong `lib/` và `features/*/services/`. UI chỉ render và dispatch.

4. **Game truth không sống trong Zustand.** `CareerPlayer`, `GameSession`, club data — tất cả phải ở server (Prisma + TanStack Query). Zustand chỉ chứa transient UI state.

5. **Server Actions là mutation gateway duy nhất.** Không fetch `POST /api/` từ component cho internal mutations. Server Action validate input, verify auth, delegate sang service, persist.

6. **Career là immutable sau khi persisted.** Không có "edit career" feature. Một khi `CareerPlayer` được saved, nó không bị mutate. User chỉ có thể xóa slot (và re-spin).

7. **Club data là reference, không mutate.** Club và league data được seeded một lần. Game logic chỉ đọc từ đây — không bao giờ ghi vào club data từ game session.

8. **Cascade is sequential, not parallel.** 7 wheel steps phải chạy tuần tự — kết quả step trước là input của step sau. Không chạy parallel.

9. **Formation is fixed at 4-3-3.** Không thêm formation option vào Phase 1. Formation customization là Phase 3+.

10. **Một GameSession, một Squad XI.** Không có "sub-squads", không có substitutes, không có squad rotation. 11 slots, 11 careers, done.

---

*Document này là tài liệu tham chiếu chính cho Football Life. Khi có conflict giữa document này và docs chuyên biệt trong `docs/` (game-design.md, architecture.md...), **docs chuyên biệt là authority** — wiki này là tổng quan và glossary.*

*Mọi thay đổi quan trọng về game mechanics, data scope, hoặc architecture rules phải được update vào cả wiki này lẫn docs tương ứng.*
