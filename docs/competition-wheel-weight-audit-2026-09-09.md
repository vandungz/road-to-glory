# Audit weight wheel League / Domestic Cup / Continental Trophy

Ngày audit: 2026-09-09  
Phạm vi: source code hiện tại của wheel kết quả giải VĐQG, Cúp Quốc gia và Cúp châu lục/continental trophy.  
Ngoài phạm vi chính: national team wheels và individual awards. Các phần đó chỉ được nhắc khi ảnh hưởng trực tiếp tới cùng season simulator.

> Cập nhật quyết định và implementation: 2026-09-10. Phần cập nhật này ghi lại
> contract mới cho league standing wheel và đã được triển khai ở FE preview,
> server resolver và season-history persistence.

## 1. Kết luận ngắn

Weight hiện tại là một mô hình weighted categorical outcome, chưa phải một simulator thi đấu theo từng trận.

- Wheel `standing` sinh trực tiếp một vị trí 1..N.
- Wheel `domestic_cup` sinh trực tiếp một trong bảy bậc kết quả.
- Wheel `continental_cup` sinh trực tiếp một trong sáu bậc kết quả.
- Sau khi wheel đã chốt, league table và cup journey được dựng để khớp outcome đã chọn; chúng không quay ngược lại để kiểm chứng hoặc thay đổi outcome.

Có hai điểm kiến trúc đang đúng:

1. FE preview và server resolver dùng chung pool builder, nên không còn hai bộ công thức weight song song trong 2 nơi.
2. V2 server là authority: client không gửi outcome/weight; server tự xây pool và gọi weighted resolver trong checkpoint transaction.

Tuy nhiên, về realism, model hiện tại còn đơn giản ở mức đáng kể:

1. Xác suất league/cup phụ thuộc chủ yếu vào `club.prestige`, `effPositionOvr` của player và một ít `luckRating`; chưa phụ thuộc vào sức mạnh đội hình, độ cạnh tranh của chính league, form/injury/transfer của squad, draw/bracket, hoặc đối thủ cụ thể.
2. Continental UCL/UEL/UECL và các continental competition khác dùng cùng một công thức; `continentalType` chỉ quyết định có wheel và label nào, không làm thay đổi difficulty/weight.
3. Cup outcome được chọn trước, còn cup journey chỉ sinh narrative theo outcome. Journey không phải match simulation và không có khả năng làm kết quả đã quay trở nên nhất quán hơn.
4. League wheel và league-table simulator là hai mô hình độc lập: wheel chọn slot, table simulator sau đó ép player vào slot rồi sinh điểm theo thứ tự slot.
5. Contract cũ của `lastYearStanding` đã không kiểm tra player còn ở cùng club/league hay đã transfer. Contract mới chỉ dùng đúng record của mùa liền trước khi `clubId + leagueId` khớp; record legacy thiếu identity hoặc record của club/league khác bị bỏ qua.

Đánh giá tổng thể: hệ thống hiện tại là deterministic weights + random final draw, chạy đúng theo code, nhưng chưa đủ dữ liệu/độ liên kết để gọi là simulator realism cho kết quả team competitions.

## 2. Luồng thực thi đã xác minh

### 2.1. Từ input tới kết quả authoritative

```text
Start season
  -> currentStep = standing
  -> client hiển thị pool preview
  -> resolveWheelCheckpointAction / checkpoint.service
  -> lấy club + leagueSize từ DB
  -> resolveServerCareerWheel
  -> getCareerWheelPoolAndValue
  -> buildStandingPool / buildDomesticCupPool / buildContinentalCupPool
  -> resolveWeightedOutcome(pool, secure random source)
  -> lưu WheelCheckpoint + runtimeState + nextStep
```

Evidence:

- Server lấy `leagueSize` bằng `tx.club.count({ where: { leagueId } })` và truyền club/league context vào resolver: [`features/career/services/checkpoint.service.ts`](../features/career/services/checkpoint.service.ts#L481-L516).
- Server resolver không nhận outcome hoặc weights từ client; nó tự gọi `getCareerWheelPoolAndValue` và dùng `randomInt` làm random source: [`features/career/services/server-wheel-resolver.service.ts`](../features/career/services/server-wheel-resolver.service.ts#L239-L296).
- `getCareerWheelPoolAndValue` tính `effPositionOvr`, lấy `prestige`, `leagueSize`, `apps`, `priorStanding`, `luckRating`, `standingResult`, rồi tạo shared team context: [`features/wheel/lib/career-wheel-resolver.ts`](../features/wheel/lib/career-wheel-resolver.ts#L57-L83).
- Shared builders được gọi ở cả resolver thật và FE preview: [`features/wheel/lib/wheel-team-params.ts`](../features/wheel/lib/wheel-team-params.ts#L1-L69), [`features/wheel/hooks/useCareerWheelItems.ts`](../features/wheel/hooks/useCareerWheelItems.ts#L85-L104).
- Weighted resolver cộng tổng các weight dương và chọn một item theo random draw: [`lib/wheel-engine/spin-resolver.ts`](../lib/wheel-engine/spin-resolver.ts#L29-L59).

### 2.2. Sau khi league wheel chốt

`handleSpinComplete` gọi `generateLeagueTableAction` với chính `playerStanding` đã quay. Action lấy danh sách club từ DB và gọi `simulateDynamicLeagueTableService`: [`features/wheel/hooks/useCompetitionFlow.ts`](../features/wheel/hooks/useCompetitionFlow.ts#L174-L201), [`actions/season.actions.ts`](../actions/season.actions.ts#L781-L800).

Điều này có nghĩa bảng xếp hạng là hậu xử lý theo slot đã có, không phải nguồn quyết định slot.

### 2.3. Sau khi cup wheel chốt

Domestic/continental journey được gọi sau khi outcome đã có. Journey dựng chuỗi trận để kết thúc đúng ở `Early Exit`, `Round of 32`, `Quarter-Finals`, `Winner`... Nó không resolve lại xác suất trận đấu: [`features/wheel/hooks/useCompetitionFlow.ts`](../features/wheel/hooks/useCompetitionFlow.ts#L203-L293), [`features/season/services/cup-journey.service.ts`](../features/season/services/cup-journey.service.ts#L12-L42), [`features/season/services/cup-journey.service.ts`](../features/season/services/cup-journey.service.ts#L44-L140).

## 3. Công thức weight hiện tại

### 3.1. Các biến đầu vào

`TeamWheelCtx` hiện có:

```text
effPositionOvr
club prestige
leagueSize
apps
priorStanding
luckRating
standingResult
position
continental ticket / nationality cho các wheel khác
```

Nguồn: [`features/wheel/lib/wheel-team-params.ts`](../features/wheel/lib/wheel-team-params.ts#L21-L39).

`effPositionOvr` không phải lúc nào cũng là raw OVR. Nó là:

```text
positionWeightedRating = weighted average của 6 attribute theo position
effPositionOvr = round(0.65 × positionWeightedRating + 0.35 × currentOvr)
```

Nguồn: [`lib/positional-value.ts`](../lib/positional-value.ts#L16-L76), alias dùng bởi wheel: [`lib/transfer-economy.ts`](../lib/transfer-economy.ts#L358-L365).

Club threshold hiện tại:

| Club prestige | threshold |
|---:|---:|
| 1 | 55 |
| 2 | 62 |
| 3 | 69 |
| 4 | 76 |
| 5 | 83 |

Nguồn: [`lib/club-fit.ts`](../lib/club-fit.ts#L6-L12), [`lib/club-fit.ts`](../lib/club-fit.ts#L44-L46).

### 3.2. Influence proxy

```text
if knownApps > 0:
    apps = knownApps
else:
    baseApps = expected league apps từ effPositionOvr × club prestige × leagueSize
    nếu đã có standingResult:
        champion: +0.12 vào app ratio
        top 4:     +0.06
        bottom 30%: -0.12
    apps = clamp(round(leagueMatches × adjustedRatio), min 1, max 95%)

influenceProxy = clamp(apps / 55, 0.35, 1.00)
```

Nguồn: [`features/wheel/lib/simulation-helpers.ts`](../features/wheel/lib/simulation-helpers.ts#L122-L147), [`lib/club-fit.ts`](../lib/club-fit.ts#L48-L64).

Điểm cần lưu ý: trong flow season mới bình thường, `yearSimResult` chưa tồn tại ở các competition wheel nên `apps` thường là `null`; khi đó proxy được ước lượng từ player + club. Nếu runtime có `yearSimResult.apps`, hàm ưu tiên `knownApps` và bỏ qua `standingResult` adjustment.

### 3.3. League standing wheel

```text
targetOvr = clubThreshold(prestige)
diff = effPositionOvr - targetOvr
influenceFactor = getInfluenceProxy(...)

prestigeExpectedPos = round(leagueSize - prestige × (leagueSize / 5) + 1)
expectedPos =
    không có prior club standing hợp lệ: prestigeExpectedPos
    có prior club standing hợp lệ:       round(80% × prestigeExpectedPos + 20% × priorClubStanding)

baseWeight(pos) = max(1, 40 - abs(pos - expectedPos) × (35 / leagueSize))
```

Sau đó standing wheel cộng thêm modifier nền của club prestige, độc lập với
player modifier hiện tại:

```text
prestigeTier = clamp(round(clubPrestige), 1, 5)
top-25% modifier    = (prestigeTier - 3) × 4
bottom-30% modifier = -(prestigeTier - 3) × 3
finalWeight = max(1, round(baseWeight + prestigeModifier + existingPlayerModifier))
```

Mapping cụ thể là:

| Club prestige | Top 25% | Bottom 30% |
|---:|---:|---:|
| 1 | -8 | +6 |
| 2 | -4 | +3 |
| 3 | 0 | 0 |
| 4 | +4 | -3 |
| 5 | +8 | -6 |

`priorClubStanding` chỉ là input của mùa liền trước và chỉ hợp lệ khi record
có cùng `clubId` và `leagueId` với season đang resolve. Không có snapshot/table
mới và không truy hồi hạng của league cũ khi player quay lại sau nhiều mùa.
Player impact hiện tại (`diff`, `influenceFactor`, các hệ số OVR ở vùng top/bottom)
được giữ nguyên; prestige modifier là lớp bổ sung riêng.

`diff` chỉ chỉnh trọng số ở hai vùng:

- Player/club overqualified (`diff > 0`): top 25% được cộng `diff × 1.5 × influence`; bottom 30% bị trừ `diff × 1.2 × influence`.
- Player/club underqualified (`diff < 0`): top 25% bị trừ `abs(diff) × 1.2 × influence`; bottom 30% được cộng `abs(diff) × 1.5 × influence`.

Mỗi weight cuối cùng được round và floor tại 1. Không có opponent strength distribution hoặc match-by-match league model trong công thức này.

Nguồn đầy đủ: [`features/wheel/lib/simulation-helpers.ts`](../features/wheel/lib/simulation-helpers.ts#L253-L294).

### 3.4. Domestic Cup

```text
luck = floor(luckRating / 4)                 // 0..5 với luck 1..20
diff = effPositionOvr - clubThreshold(prestige)
pull = round(clamp(diff × 0.75 × influence, -10, +10))

wWin  = max(1, 4  + 2×prestige + luck + max(0, pull))
wRun  = max(1, 6  + 2×prestige       + max(0, round(0.6×pull)))
wSemi = max(2, 10 + 2×prestige       + round(0.4×pull))
wQF   = max(5, 15 + 2×prestige       + round(0.2×pull))
wR16  = max(8, 20 + prestige)
wR32  = max(10,22 - 2×prestige       - round(0.3×pull))
wExit = max(10,35 - 5×prestige       - pull)
```

Pool luôn có bảy outcome cố định: Winner, Runner-Up, Semi-Finals, Quarter-Finals, Round of 16, Round of 32, Early Exit: [`features/wheel/lib/simulation-helpers.ts`](../features/wheel/lib/simulation-helpers.ts#L149-L168), [`features/wheel/lib/wheel-team-params.ts`](../features/wheel/lib/wheel-team-params.ts#L45-L56).

### 3.5. Continental Cup / Trophy

```text
luck = floor(luckRating / 4)                 // 0..5
diff = effPositionOvr - (clubThreshold(prestige) + 4)
pull = round(clamp(diff × 0.55 × influence, -8, +8))

wWin   = max(1, 2  + 2×prestige + luck + max(0, pull))
wRun   = max(1, 5  + 2×prestige       + max(0, round(0.5×pull)))
wSemi  = max(2, 10 + 2×prestige       + round(0.3×pull))
wQF    = max(5, 16 + 2×prestige       + round(0.2×pull))
wR16   = max(8, 22 + prestige)
wGroup = max(12,45 - 6×prestige - pull)
```

Pool luôn có sáu outcome cố định: Winner, Runner-Up, Semi-Finals, Quarter-Finals, Round of 16, Group Stage: [`features/wheel/lib/simulation-helpers.ts`](../features/wheel/lib/simulation-helpers.ts#L170-L188), [`features/wheel/lib/wheel-team-params.ts`](../features/wheel/lib/wheel-team-params.ts#L59-L69).

## 4. Kết quả định lượng từ chính pure functions

Các bảng dưới được chạy trực tiếp bằng `npx tsx` trên helper hiện tại, không phải ước lượng bằng mắt. Tất cả phần trăm là `weight / tổng weight`.

### 4.1. 20-club league, player đúng tại club threshold, luck = 10

| Club prestige | eff OVR | Influence | Domestic winner | Domestic early exit | Continental winner | Continental group stage | League champion | League top 4 | League bottom 6 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 55 | 0.527 | 6.90% | 25.86% | 5.66% | 37.74% | 0.72% | 4.86% | 46.94% |
| 2 | 62 | 0.509 | 8.47% | 21.19% | 7.34% | 31.19% | 2.43% | 11.49% | 34.30% |
| 3 | 69 | 0.491 | 10.00% | 16.67% | 8.93% | 25.00% | 4.17% | 18.43% | 24.36% |
| 4 | 76 | 0.473 | 11.48% | 12.30% | 10.43% | 19.13% | 6.45% | 27.70% | 16.03% |
| 5 | 83 | 0.455 | 12.90% | 8.06% | 11.86% | 13.56% | 10.26% | 38.89% | 6.84% |

Đọc đúng bảng này:

- Club prestige tác động khá mạnh vào baseline cup và expected league position.
- Sau khi tăng prestige modifier, prestige 5 tại threshold có champion 10.26% và top 4 38.89%, trong khi prestige 1 chỉ có champion 0.72% và top 4 4.86%.
- Đây vẫn là weighted wheel có drama/luck, chưa phải match simulator; nhưng baseline đã phân biệt rõ club mạnh và club yếu hơn mà không thay đổi player impact.

### 4.2. Player effect tại cùng club prestige 5

Với luck = 10, league size 20:

| eff OVR | Influence | Domestic winner | Domestic early exit | Continental winner | Continental group stage | League champion | League top 4 | League bottom 6 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 70 | 0.350 (floor) | 12.70% | 10.32% | 11.86% | 15.25% | 8.81% | 32.79% | 14.75% |
| 83 | 0.455 | 12.90% | 8.06% | 11.86% | 13.56% | 10.26% | 38.89% | 6.84% |
| 90 | 0.545 | 14.62% | 7.69% | 12.71% | 11.86% | 11.44% | 43.22% | 2.54% |

Kết luận từ mẫu này: player effect vẫn tồn tại đúng chủ đích; domestic/continental cup winner không đổi. League effect của player tiếp tục dịch top/bottom qua `diff`, còn club prestige tạo baseline phân hóa độc lập.

### 4.3. Tác động của prior season cùng club/league

Với prestige 5, eff OVR 83, league size 20, luck không tham gia standing
pool, chỉ prior standing thay đổi:

| Prior standing mùa liền trước | League champion | League top 4 | League bottom 6 |
|---:|---:|---:|---:|
| 1 | 10.26% | 38.89% | 6.84% |
| 5 | 9.22% | 37.07% | 8.42% |
| 10 | 8.54% | 35.10% | 9.87% |
| 15 | 7.79% | 32.97% | 11.41% |
| 20 | 7.16% | 30.54% | 12.91% |

Đây là quán tính có chủ đích nhưng bị giới hạn ở 20% của expected position.
Một career chuyển sang club/league khác không dùng bảng này; quay lại league cũ
sau nhiều mùa cũng không dùng record cũ vì chỉ đọc tuổi `currentAge - 1`.

### 4.4. Luck effect

Ở prestige 4, eff OVR 76, league size 20:

| Luck | Domestic winner | Domestic top 2 | Continental winner |
|---:|---:|---:|---:|
| 1 | 10.00% | 21.67% | 8.85% |
| 4 | 10.74% | 22.31% | 9.65% |
| 10 | 11.48% | 22.95% | 10.43% |
| 20 | 13.60% | 24.80% | 12.71% |

`luckRating` không làm thay đổi mọi outcome theo một curve xác suất riêng; nó chỉ cộng `floor(luck/4)` vào `wWin`. Vì vậy luck đang được dùng như một winner boost trực tiếp, không phải “may mắn trong từng trận”.

## 5. Findings đã xác minh

### P0/P1 — cần coi là vấn đề model chính

#### A. Cup/trophy wheel không phải bracket simulator

Domestic và continental pool chọn thẳng tier cuối mùa. Cup journey sau đó chỉ chọn đối thủ ngẫu nhiên đều từ pool và tạo score string theo `playerPrestige - oppPrestige`; nó không roll win/loss cho từng trận. Vì vậy:

- `Winner` không phải xác suất tích lũy qua 6/13 trận.
- `Round of 16`, `Quarter-Finals`, `Semi-Finals` không được tạo từ bracket thực tế.
- Số trận và round format là hardcode theo result tier trong season simulator.
- Opponent pool không được seed theo round, không weighted theo prestige, không phân biệt draw dễ/khó.

Evidence: [`features/season/services/cup-journey.service.ts`](../features/season/services/cup-journey.service.ts#L44-L140), [`features/season/services/cup-journey.service.ts`](../features/season/services/cup-journey.service.ts#L143-L190), match-count mapping trong [`features/season/services/season-simulator.service.ts`](../features/season/services/season-simulator.service.ts#L34-L62).

#### B. Continental competition type không tham gia weight

`buildContinentalCupPool` chỉ nhận `TeamWheelCtx`, gọi `getContinentalCupWeights(prestige, luck, effOvr, influence)`. `currentContinentalCup` được dùng để gate/label wheel, không được truyền vào công thức weight. Vì vậy cùng một club/player/context có cùng weight cho UCL, UEL, UECL, Libertadores... nếu đều đã có vé.

Journey có lọc nhóm đối thủ theo `allowedTypes`, nhưng UCL/UEL/UECL được gom chung vào cùng pool opponents: [`actions/season.actions.ts`](../actions/season.actions.ts#L1170-L1188). Đây là khác biệt rõ giữa label/eligibility và difficulty model.

#### C. League wheel và league-table simulator không dùng cùng một strength model

Wheel league dùng `prestigeExpectedPos` + distance curve + player diff. Table simulator:

- sort các club còn lại theo prestige;
- cộng jitter trên thứ tự đó;
- sinh điểm giảm dần từ vị trí 1;
- đặt player vào đúng `playerStanding`.

Không có match result, opponent strength, goal difference, current squad strength hoặc form. Do đó bảng hiển thị không thể dùng để validate/chứng minh wheel weight. Evidence: [`features/season/services/table-simulator.service.ts`](../features/season/services/table-simulator.service.ts#L21-L93).

#### D. Player OVR đang đại diện cho sức mạnh team quá trực tiếp

Cup/continental result dùng `effPositionOvr` của một player làm player pull cho kết quả team. Đó là một signal hợp lý để player có ảnh hưởng, nhưng hiện tại không có:

- XI/roster strength của club;
- squad depth;
- team attack/defence;
- manager/tactics;
- injury/suspension;
- transfer window strength change;
- opponent distribution.

Vì vậy hai career player cùng ở một club có thể làm xác suất trophy thay đổi chỉ vì OVR của riêng player, trong khi club strength còn lại không đổi. Đây là nguyên nhân source-level khiến kết quả có thể cảm giác “OVR player kéo cả đội” mà không có team simulator đứng sau.

### P1 — lỗi logic/độ nhất quán cụ thể

#### E. Quán tính `lastYearStanding` không kiểm tra cùng league sau transfer — đã xử lý

Trước update, server đọc thẳng `seasonHistory[String(age - 1)].standing` và fallback về 10 mà không so sánh identity. Sau update, FE và server cùng gọi `getPriorClubStanding`: chỉ trả về standing khi `clubId` và `leagueId` của record tuổi trước khớp context hiện tại. Record completed season hiện persist `clubId`; record legacy thiếu field này fail closed.

Đây là bug logic đã được xử lý, không phải tuning preference. Không thêm snapshot/table mới.

#### F. `knownApps` có semantics không đúng với tên “expected league apps”

`getInfluenceProxy` mô tả proxy là expected league apps, nhưng khi `knownApps` có giá trị nó dùng thẳng số đó. Callers truyền `yearSimResult.apps`, trong khi season simulator định nghĩa total apps là tổng league + domestic cup + continental + national: [`features/wheel/lib/career-wheel-resolver.ts`](../features/wheel/lib/career-wheel-resolver.ts#L72-L82), [`features/wheel/hooks/useCareerWheelItems.ts`](../features/wheel/hooks/useCareerWheelItems.ts#L93-L103), [`features/season/services/season-simulator.service.ts`](../features/season/services/season-simulator.service.ts#L295-L316).

Ở flow season mới chuẩn, competition wheel chạy trước `season_stats` nên giá trị này thường là null. Nhưng nếu runtime/resume path mang theo `yearSimResult`, total apps sẽ bị dùng như league apps và đồng thời bỏ qua `standingResult` adjustment. Đây là latent contract bug cần loại bỏ bằng cách truyền `leagueStats.apps` hoặc tách riêng `leagueApps` trong context.

#### G. FE và BE dùng cùng builder nhưng context `leagueSize` có hai nguồn

FE đếm từ `clubs` props và fallback 10: [`features/wheel/hooks/useDraftDrum.ts`](../features/wheel/hooks/useDraftDrum.ts#L193-L205). Server đếm trực tiếp DB: [`features/career/services/checkpoint.service.ts`](../features/career/services/checkpoint.service.ts#L497-L516).

Shared function đã loại bỏ drift trong công thức, nhưng nếu FE `clubs` không đầy đủ hoặc khác snapshot DB thì preview có thể có số slice/weight khác server. Đây là parity risk ở context, không còn là duplicate formula bug.

#### H. `club.prestige`/league prestige là gần như toàn bộ team strength state

Schema có `League.prestige`, `Club.prestige`, `leagueTitlesCount`, `domesticCupsCount`, `continentalTitlesCount`, nhưng team wheel chỉ lấy `currentClub.prestige` và `leagueSize`; historical titles và league competitiveness không đi vào pool: [`prisma/schema.prisma`](../prisma/schema.prisma#L246-L280), [`features/wheel/lib/career-wheel-resolver.ts`](../features/wheel/lib/career-wheel-resolver.ts#L66-L82).

Codebase đã có `leagueCompetitivenessScore`, nhưng hiện tại nó được dùng trong transfer economy, không được dùng trong competition wheel: [`lib/positional-value.ts`](../lib/positional-value.ts#L79-L84). Vì vậy league prestige/quality không tách biệt rõ với club prestige ở wheel.

### P2 — simplification nên được ghi nhận khi tune tiếp

#### I. Baseline pool khá phẳng và floor làm yếu phân hóa

Mọi outcome đều bị floor (`max(1)`, `max(2)`, `max(5)`, `max(10)`, `max(12)`). Khi `pull` âm, Winner không bị giảm dưới baseline/floor theo cách đối xứng; ngược lại `wExit` tăng. Khi `pull` dương, chỉ các outcome từ Winner tới QF bị tăng một phần, còn `wR16`/`wR32` phần lớn vẫn là baseline. Đây là thiết kế drama, nhưng không phải xác suất knockout tích lũy.

#### J. Luck chỉ tác động vào Winner

`luck = floor(luckRating/4)` được cộng trực tiếp vào `wWin` ở domestic và continental. Không có luck factor cho từng match hoặc các outcome trung gian. Từ bảng đo được, luck 1 → 20 chỉ đưa domestic winner 10.00% → 13.60% ở sample prestige 4.

#### K. Format competition bị hardcode chung

Domestic luôn có path Vòng 1/32 → 1/16 → 1/8 → QF → SF → Final. Continental luôn có group stage và các round sau đó. Đây là lý do outcome labels có thể không phản ánh format thật của từng giải; đặc biệt các competition khác nhau đang dùng cùng pool/round abstraction.

## 6. Những gì hiện tại không phải bug

- Weighted resolver normalize bằng tổng weight là đúng cơ chế; các số `wWin`, `wRun`... không phải phần trăm trước khi chia tổng.
- Việc player có ảnh hưởng đến team competition là chủ đích đã ghi trong SoT; vấn đề là signal hiện tại quá hẹp, không phải player effect tự thân là sai.
- `effPositionOvr` thay raw OVR cho team wheels là đúng theo policy hiện tại và đã được dùng chung ở preview/resolve.
- Server authority, revision, idempotency và checkpoint persistence là đúng hướng; không cần quay lại cho client quyết định outcome.
- `standingResult` chỉ ảnh hưởng trực tiếp đến các wheel sau league qua influence proxy; đây là sequence hiện tại, không phải cup được resolve trước league.

## 7. Ưu tiên cải thiện nếu mục tiêu là simulator realism

Đây là backlog sau khi đã xử lý contract prior standing và prestige baseline; không thuộc implementation lần này:

1. **Tách competition outcome thành match/round simulator dùng chung.** Wheel chỉ nên là animation/commit UI của kết quả đã được server simulator resolve; hoặc nếu vẫn giữ categorical wheel, weight phải được sinh từ xác suất pass từng round.
2. **Tạo team-season strength snapshot** cho mỗi mùa: club baseline + roster/squad depth + player contribution + form/injury/transfer adjustment + league competitiveness.
3. **Tạo competition context riêng:** số đội/round, entry round, group format, opponent strength distribution, home/away hoặc aggregate rule nếu game cần đơn giản hóa.
4. **Phân biệt continental type trong model:** UCL/UEL/UECL và các confederation khác phải có difficulty/reference profile riêng; label không được là khác biệt duy nhất.
5. **Mở rộng continuity nếu cần:** hiện tại chỉ dùng một prior standing cùng club/league; nếu sau này cần team-strength history thì phải thiết kế riêng, không tự động hồi cứu career history cũ.
6. **Tách `leagueApps` khỏi total apps:** không truyền `SimulatedSeasonResult.apps` vào influence proxy nếu hàm đang mô hình hóa độ ổn định ở league.
7. **Dùng cùng một simulation output cho table/journey/season stats/awards.** Không để table và journey chỉ “vẽ lại” sau khi wheel đã chốt một outcome độc lập.
8. **Thêm distribution tests, không chỉ contract smoke tests:** kiểm tra monotonicity (team mạnh hơn không làm champion/top-four giảm), competition-type separation, transfer reset, preview/server context parity, và calibration qua batch simulation.

## 8. Baseline acceptance criteria cho lần tune sau

Các tiêu chí này giúp tránh sửa theo cảm giác:

- Với cùng mọi context khác, tăng team strength không được làm xác suất Winner hoặc top-four giảm.
- Tăng player contribution chỉ ảnh hưởng trong biên độ đã định, không thể thay thế team strength.
- UCL/UEL/UECL có distribution khác nhau theo profile difficulty.
- Cùng một team-strength snapshot và cùng seed cho ra cùng round path ở server, không phải một categorical result rồi tạo narrative độc lập.
- Chuyển club hoặc league làm prior standing cũ mất hiệu lực; cùng club + league ở mùa liền trước mới được dùng continuity.
- `leagueApps` và total apps không thể bị tráo vì type/context.
- Preview FE và server nhận cùng snapshot context; nếu snapshot khác phải fail closed hoặc refetch, không âm thầm hiển thị weight giả.
- Mỗi result tier có frequency report trên batch lớn, không đánh giá bằng một playthrough đơn lẻ.

## 9. Source inventory

- Weight formulas và shared pool: [`features/wheel/lib/simulation-helpers.ts`](../features/wheel/lib/simulation-helpers.ts), [`features/wheel/lib/wheel-team-params.ts`](../features/wheel/lib/wheel-team-params.ts), [`features/wheel/lib/career-wheel-resolver.ts`](../features/wheel/lib/career-wheel-resolver.ts).
- Server authority/context: [`features/career/services/server-wheel-resolver.service.ts`](../features/career/services/server-wheel-resolver.service.ts), [`features/career/services/checkpoint.service.ts`](../features/career/services/checkpoint.service.ts).
- FE preview context: [`features/wheel/hooks/useCareerWheelItems.ts`](../features/wheel/hooks/useCareerWheelItems.ts), [`features/wheel/hooks/useDraftDrum.ts`](../features/wheel/hooks/useDraftDrum.ts).
- Prior-standing identity guard: [`features/wheel/lib/previous-season-standing.ts`](../features/wheel/lib/previous-season-standing.ts), [`features/wheel/lib/season-record-hydration.ts`](../features/wheel/lib/season-record-hydration.ts), [`features/career/services/season-transition.service.ts`](../features/career/services/season-transition.service.ts).
- Regression check: [`scripts/competition-wheel-weight-check.ts`](../scripts/competition-wheel-weight-check.ts).
- Club fit / effective position OVR: [`lib/club-fit.ts`](../lib/club-fit.ts), [`lib/positional-value.ts`](../lib/positional-value.ts), [`lib/transfer-economy.ts`](../lib/transfer-economy.ts).
- Downstream league/cup simulation: [`features/season/services/table-simulator.service.ts`](../features/season/services/table-simulator.service.ts), [`features/season/services/cup-journey.service.ts`](../features/season/services/cup-journey.service.ts), [`features/season/services/season-simulator.service.ts`](../features/season/services/season-simulator.service.ts), [`actions/season.actions.ts`](../actions/season.actions.ts).
- Data model: [`prisma/schema.prisma`](../prisma/schema.prisma), [`prisma/data/leagues.ts`](../prisma/data/leagues.ts), [`prisma/data/clubs.ts`](../prisma/data/clubs.ts).
- Existing design assumptions: [`docs/core-growth-balance.md`](core-growth-balance.md), [`docs/core-growth-loop-fixes-design.md`](core-growth-loop-fixes-design.md).

## 10. Final verdict

Weight hiện tại có source rõ ràng, deterministic và server-authoritative; không có dấu hiệu “random không kiểm soát” trong chính các helper này. League standing hiện dùng club prestige làm baseline chính, prior standing mùa liền trước ở cùng club/league làm continuity 20%, và giữ nguyên player impact. FE preview/server resolver dùng cùng contract; transfer hoặc career history cũ không làm rò prior standing sang context mới.

Kết quả team competition vẫn là categorical wheel dựa trên vài proxy đơn giản, sau đó được dựng lại thành bảng/journey. Vì vậy các hiện tượng như continental trophy khác label nhưng cùng odds, hoặc cup có vẻ không ăn khớp với đối thủ/format vẫn là backlog simulator realism, không phải lỗi của thay đổi weight lần này.

Nếu mục tiêu của phase tiếp theo là realism, cần thay đổi nguồn sinh weight: từ `prestige + player OVR + luck` sang một team/competition simulator có snapshot và opponent/bracket context. Chỉ tuning các hằng số `4 + prestige × 2`, `0.75`, `0.55`, `45 - prestige × 6` sẽ làm số đẹp hơn nhưng không giải quyết nguyên nhân.
