# SoT — Danh hiệu, thành tích và Ballon d'Or

> Trạng thái: SoT đang áp dụng — canonical award batch và synthetic candidate realism revision v5 đã triển khai trong worktree
> Ngày audit: 2026-09-08  
> Commit tham chiếu audit baseline: `1b01f63`
> Phạm vi: career Classic, season simulation, career V2 checkpoint, legacy save, archive UI.

> Revision 2026-09-08: canonical records/migration và synthetic candidate realism đã triển khai. `CareerHonour` và `CareerAwardRankingSnapshot` là DB authority; simulator version `awards-v5`, resolution version `weighted-random-v5`; candidate giả được sinh từ league context độc lập với OVR của player user và chỉ được gán vào tập CLB thật thuộc league hiện tại của player. Phần audit source cũ bên dưới được giữ để giải thích lỗi đã sửa, không còn mô tả implementation runtime hiện tại.

## 1. Kết luận điều hành

Audit baseline trước batch cho thấy feature chưa có một nguồn sự thật duy nhất cho danh hiệu/thành tích. Khi đó có ba representation cùng tồn tại:

1. `seasonHistory[age]`: kết quả thi đấu của từng mùa và `ballonDorResult`.
2. `CareerPlayer.achievements`: object JSON tích lũy gồm `ballonDor`, `trophies[]`, `seasonAwards[]`.
3. React state/UI: tự derive lại một phần danh hiệu từ `seasonRecords`, một phần từ `achievements`.

Điểm nghiêm trọng nhất của baseline là đường Career V2. State local có gọi `setAchievements`, nhưng server transition V2 chỉ ghi `seasonHistory`, timeline và projection; không ghi `achievements`. Vì vậy refresh giữa các mùa hoặc rehydrate lúc retire có thể làm mất giải cá nhân và số lần Ballon d'Or trong archive. Đây là lỗi persistence, không chỉ là vấn đề hiển thị; batch hiện tại đã chuyển authority sang record/snapshot canonical.

Ballon d'Or đã được triển khai theo mini-flow 2 wheel và logic hiện tại đã có test smoke pass. Tuy nhiên logic thực tế khác tài liệu plan cũ: gate hiện là score `58` + OVR `85` + rating `7.0` + availability, không phải gate `75`/OVR `88`/rating `7.8`; goals/assists/clean sheets cũng đang tham gia eligibility score. Tài liệu plan cũ không thể dùng làm SoT.

Các xác nhận sản phẩm đã chốt cho bản update kế tiếp:

- `CareerHonour`/record danh hiệu riêng là hướng chính thức để quản lý lịch sử; `CareerPlayer.achievements` chỉ còn là derived summary nếu chưa bị loại bỏ.
- `docs/ballon-dor-wheel-plan.md` là tài liệu historical/outdated, không phải authority. File này là SoT cập nhật cho domain danh hiệu/thành tích.
- Golden Boot là giải theo phạm vi league, không phải danh hiệu riêng của club và không được cộng bàn từ domestic cup, continental cup hoặc national team.
- Cần bổ sung Vua kiến tạo theo cùng nguyên tắc phạm vi league; không dùng tổng assists mọi đấu trường.
- Best XI là selection theo vị trí/slot và được hiển thị bằng pitch board; không phát hành thêm award "Cầu thủ xuất sắc nhất" trong season recap để tránh trùng nghĩa với các cuộc đua role-specific và Ballon d'Or.
- Best XI mặc định dùng formation 4-3-3; resolver ưu tiên đúng position của slot và cho phép fallback sang vị trí liền kề hợp lý (ví dụ LM → LW, CM → CDM/CAM) khi candidate exact không có.
- Snapshot Ballon d'Or được simulator tạo sẵn để phục vụ wheel/result page nhưng chỉ được reveal sau khi season recap đóng và Ballon d'Or wheel hoàn tất.
- OVR, stats, apps và club strength của candidate giả không được phụ thuộc vào `player.ovr`, `player.currentStats` hoặc OVR của career user. User player chỉ được inject vào universe sau khi synthetic league đã được sinh.
- Với mọi award có scope `league`, `clubName` của candidate giả phải thuộc tập CLB của `player.club.leagueId`; không được dùng danh sách CLB fictional/global ngoài league. Runtime phải load `id/name/prestige` của toàn bộ CLB cùng league từ DB trước khi sinh candidate.
- Với cùng seed/context, đổi OVR user phải giữ nguyên synthetic universe; chỉ output và thứ hạng của user player được phép thay đổi.
- Candidate giả phải có availability/role distribution, không mặc định gần như đá đủ toàn bộ league. Competition stats (league/cup/continental) được sinh riêng; Golden Boot/Top Assist chỉ đọc league stats.
- `CareerSeason.runtimeState.continentalCupType` là ticket continental authoritative của mùa hiện tại. Sau domestic cup, server chỉ mở `continental_cup` khi ticket này khác `none`; không được dùng `player.currentContinentalCup`, `savedContinentalCup` hoặc record lịch sử cũ để tự mở/skip wheel.
- Resume/hydration phải dựng kết quả continental từ runtime của đúng `CareerSeason`; record cũ chỉ là fallback cho dữ liệu legacy và không được làm kết quả của mùa hiện tại xuất hiện trước khi wheel được resolve.
- Callback hoàn tất animation phải route theo step đã bắt đầu spin, không đọc lại step UI mutable; mọi checkpoint command vẫn phải được server kiểm tra bằng `player.currentStep` và revision hiện tại.
- Sau khi người chơi bấm quay, UI phải bắt đầu animation ngay; request authoritative chạy song song phía sau. Khi server trả outcome, wheel giảm tốc vào đúng ô đã resolve rồi mới reveal kết quả. Trong lúc continuation/journey hoặc modal kết quả đang mở, wheel hiện tại bị khóa; chỉ khi modal đóng và continuation hoàn tất mới đổi `careerSubStep`. Không render hoặc cho click wheel kế tiếp trong khoảng chuyển tiếp, và không hiển thị trạng thái “đang xác minh kết quả” trước animation.
- Checkpoint DTO phải trả ticket của đúng season (`seasonContinentalCup`) để label/pool FE không giữ projection của mùa hoặc CLB cũ; nếu ticket là `none`, continental pool phải fail-closed.
- Career Trophy Cabinet phải có hai nhóm/tab độc lập: `Danh hiệu CLB` cho team trophy (bao gồm thành tích đội tuyển trong nhóm tập thể) và `Danh hiệu cá nhân` cho award/Ballon d'Or. Profile archive phải hiển thị riêng hai nhóm này.
- Team trophy label phải được resolve từ context của đúng season: league title dùng `leagueName`, domestic cup dùng `leagueId/leagueName`, continental title dùng `continentalCupType`; không render generic `Vô địch cúp quốc gia` khi đã biết tên giải.
- Một surface không được ghép lại cùng một award từ canonical honour và fallback projection. Identity display tối thiểu là `season + awardKey + slotKey`; cumulative `achievements.ballonDor` không được dùng làm award của từng season.

## 2. Luồng hiện tại đã xác minh

```text
Competition wheels
  -> commit season stats / simulatePlayerSeasonService
  -> season recap (team honours + league award rankings + Best XI pitch)
  -> Ballon d'Or nomination wheel
  -> Ballon d'Or ranking wheel (#1..#10)
  -> Ballon d'Or result page reveal snapshot
  -> runtimeState.ballonDorRank
  -> season transition ghi seasonHistory[age].ballonDorResult
  -> UI/archive derive lại từ nhiều nguồn khác nhau
```

### 2.0 Invariant chuyển bước và resume

Flow checkpoint V2 có hai nguồn dữ liệu dễ bị lệch nếu không khóa rõ:

1. `CareerSeason.runtimeState` giữ ticket/kết quả của mùa đang chạy.
2. `CareerPlayer` projection, props resume và `seasonHistory` là projection/cache hoặc dữ liệu mùa cũ.

Vì vậy server resolver phải dùng runtime ticket của season trước khi fallback về projection legacy. FE chỉ hydrate từ public runtime của season hiện tại; không dùng `savedContinentalCup` hoặc `existing.continentalCup.result` để quyết định bước kế tiếp. Mỗi lệnh resolve chỉ hợp lệ khi step gửi lên trùng `player.currentStep`; kết quả callback của wheel phải giữ step lúc bắt đầu spin để tránh race khi state UI đã chuyển.

### 2.1 Mô phỏng mùa giải và giải cá nhân

Phần threshold bên dưới là characterization của implementation cũ. Runtime target không được dùng threshold tuyệt đối để phát award. Candidate universe phải được sinh theo league context → synthetic clubs → player role/quality/availability → competition stats, sau đó mới chạy award-specific ranking.

Runtime award simulator sau revision v5 gồm hai boundary rõ ràng:

- `features/season/services/synthetic-league.service.ts` tạo 41 candidate giả từ context giải độc lập với OVR/performance của user, phân bố qua tập CLB thật của league hiện tại (tối thiểu 8 CLB khi league có đủ dữ liệu), nhiều position và squad role; mỗi candidate có OVR, apps, league stats, cup/continental output và team context riêng. Generator chỉ mô phỏng strength/standing/stats quanh CLB được cấp, không phát minh tên CLB ngoài league.
- `features/season/services/award-simulator.service.ts` chỉ inject user candidate, resolve Golden Boot/Top Assist/Golden Glove/Best XI/Ballon d'Or trên cùng universe rồi persist snapshot. Fake candidate không đọc `player.ovr` hoặc dùng `player.leaguePrestige` làm prestige chung cho các CLB giả.

`simulatePlayerSeasonService` của baseline cũ từng tạo bốn loại `individual_award` bằng threshold cố định:

- ST/LW/RW đạt từ 20 bàn tổng hợp: "chiếc giày vàng CLB".
- GK đạt từ 15 clean sheets: "Găng tay vàng".
- CB/LB/RB/CDM đạt từ 12 clean sheets: "Hậu vệ xuất sắc nhất".
- Match rating từ 7.60: "Đội hình tiêu biểu".

Code lấy `lgGoals`, `cpGoals`, `ctGoals` và `ntGoals`, sau đó cộng thành `totalGoals`; vì vậy mốc 20 bàn đang gộp league, domestic cup, continental cup và national team. Label cũng gọi sai bản chất là giải của club. Đây không phải Golden Boot thực tế.

Tương tự, baseline có `totalAssists` nhưng không có award resolver cho Vua kiến tạo. Baseline Best XI chỉ là `matchRating >= 7.60`, không có slot vị trí, ranking ứng viên, minimum appearances hoặc scope competition. Best Player không thuộc scope runtime hiện tại.

Các event này được trả về trong `yearSimResult.events`, sau đó legacy client chuyển chúng thành `achievements.seasonAwards[]`. Không có bảng so sánh với cầu thủ khác, không có top scorer/top assist resolver thực tế, không có competition key hoặc season key ổn định.

Evidence: `features/season/services/season-simulator.service.ts:334-362`, `features/wheel/hooks/useCareerStats.ts:347-380`.

#### Contract phạm vi giải thưởng cá nhân

| Award | Phạm vi canonical | `awardKey` đề xuất | Bằng chứng tối thiểu |
|---|---|---|---|
| Golden Boot | League | `league_golden_boot` | league goals, eligible appearances, rank/tie |
| Vua kiến tạo | League | `league_top_assist` | league assists, eligible appearances, rank/tie |
| Best XI | League hoặc competition cụ thể | `league_best_xi` + `slotKey` | position slot, candidate ranking, appearances |

Mỗi competition khác (continental, national team, domestic cup) phải có `scopeKey` và `awardKey` riêng. Không dùng một award “Golden Boot” chung cho toàn bộ mùa.

### 2.2 Ballon d'Or hiện tại

`evaluateBallonDor` trả về `eligible`, `nominationWeight`, `rankWeights[]` và breakdown. Score tối đa hiện được chia như sau:

| Thành phần | Trần điểm hiện tại | Ghi chú |
|---|---:|---|
| OVR | 18 | OVR dưới 85 nhận 0 điểm |
| Position rating | 16 | Dùng attribute profile theo vị trí |
| Role output | 20 | Goals/assists/clean sheets theo role target |
| Match rating | 18 | Chuẩn hóa 6.5–8.8 |
| Availability | 10 | Apps / expected matches |
| Team success | 36 | League, domestic cup, continental, national |
| Hidden stats | 4 | Professionalism 2.5 + luck 1.5 |
| Tổng | 122 | `MAX_EVALUATION_SCORE = 122` |

Eligibility hiện yêu cầu đồng thời:

- `ovr >= 85`.
- `apps >= max(15, ceil(expectedMatches * 0.45))`.
- `matchRating >= 7.0`.
- `score >= 58`.

Nếu đủ điều kiện, nomination wheel dùng weight `8..92`; ranking wheel dùng 10 weight được chuẩn hóa tổng bằng 100. Kết quả rank được lưu vào `runtimeState.ballonDorRank` và khi chốt mùa được copy vào `SeasonRecord.ballonDorResult`.

Evidence: `features/season/services/ballon-dor.service.ts:135`, `features/season/services/ballon-dor.service.ts:267-292`, `features/career/services/season-stats.service.ts:297-305`, `features/career/services/season-transition.service.ts:274-275`.

### 2.3 Persistence V2 và legacy

Career mới mặc định dùng V2 trừ khi `CHECKPOINT_V2` là `false`, `0` hoặc `off`: `lib/career/checkpoint-feature.ts:5-8`, `actions/player.actions.ts:135-186`.

- Legacy flow: `useCareerStats.handleNextSeason` append team trophies, `seasonAwards` và tăng `ballonDor`; `updateSeasonProgressAction` ghi object này vào `CareerPlayer.achievements`: `features/wheel/hooks/useCareerStats.ts:347-380`, `actions/season.actions.ts:551-588`.
- V2 flow: `commitSeasonStatsCommand` ghi simulation vào runtime/timeline; `advanceCareerSeasonCommand` ghi `seasonHistory` và projection. Hai đường này không cập nhật `CareerPlayer.achievements`: `features/career/services/season-stats.service.ts:297-335`, `features/career/services/season-transition.service.ts:475-495`.
- Client cố ý không chạy legacy aggregate save cho V2: `features/wheel/hooks/useDraftDrum.ts:530-535`.
- Client chỉ giữ `achievements` local; sau season transition thường không re-read achievement. Khi retire thì lại re-read DB: `features/wheel/hooks/useDraftDrum.ts:1278-1317`.

Hệ quả: V2 có thể hiện đúng trong cùng một tab nhờ React state, nhưng mất sau refresh hoặc khi summary retire đọc lại DB. `seasonHistory` vẫn có thể giữ `ballonDorResult`, nên dữ liệu nhìn thấy giữa các màn hình sẽ không nhất quán.

## 3. Vấn đề đã xác minh

### P0 — Career V2 không persist achievement

**Bằng chứng:** V2 season stats update chỉ ghi `statsTimeline` và runtime; V2 season transition chỉ ghi `seasonHistory`, timeline, stints và projection. Không có `achievements` trong các mutation này. Legacy save bị chặn với `checkpointVersion >= 2`.

**Ảnh hưởng:** giải cá nhân, số QBV và trophy object có thể biến mất sau refresh/retirement. Đây là lỗi mất dữ liệu và phải xử lý trước mọi balance/UX update.

### P1 — V2 season close không promote award event/evidence thành dữ liệu mùa

`commitSeasonStatsCommand` đặt toàn bộ `SimulatedSeasonResult` vào `CareerSeason.runtimeState`, nhưng `completedSeasonRecord` chỉ copy stats, per-competition stats và `ballonDorResult`; không copy `yearSimResult.events`, `ballonDor.evaluation` hoặc award evidence vào `seasonHistory`. Vì vậy kể cả khi sửa `achievements`, archive vẫn không có nguồn canonical để dựng các individual award hoặc giải thích Ballon d'Or.

Evidence: `features/career/services/season-stats.service.ts:297-335`, `features/career/services/season-transition.service.ts:208-278`.

Implementation mới phải resolve/persist `CareerHonour` và ranking snapshot trong season close transaction, không chỉ để kết quả nằm trong JSON runtime rồi bỏ lại khi season chuyển trạng thái.

### P1 — Nhiều nguồn sự thật tạo số đếm khác nhau

- `TrophyCabinetModal` derive team trophies từ `seasonRecords`, không đọc `achievements.trophies` và không render `seasonAwards`: `features/wheel/components/TrophyCabinetModal.tsx:33-43`.
- `StoryRail` chỉ đếm league/domestic/continental/national winner; Ballon d'Or nằm ở counter phụ, không nằm trong tổng `Danh hiệu`: `features/wheel/components/StoryRail.tsx:11-37`.
- `PlayerCareerDialog` lấy QBV và personal awards từ `achievements`, nhưng derive team trophies thêm từ `seasonHistory`: `features/player/components/PlayerCareerDialog.tsx:40-87`.
- `SeasonRecapModal` list award chỉ gồm continental winner, individual events và QBV; league/domestic/national winner chỉ hiện ở metric, không nằm trong danh sách "Danh hiệu nhận được": `features/wheel/components/SeasonRecapModal.tsx:81-85`.

Vì mỗi surface có quy tắc riêng, cùng một career có thể hiển thị các tổng số khác nhau.

### P1 — Tủ danh hiệu bỏ qua thành tích cá nhân

`seasonAwards[]` có chứa Giày vàng, Găng tay vàng, Hậu vệ xuất sắc và Đội hình tiêu biểu, nhưng Trophy Cabinet không đọc collection này. Career archive chỉ render các award này dưới dạng row mùa nếu `achievements.seasonAwards` còn tồn tại; với V2 nó có thể đã mất do P0.

### P1 — Ballon d'Or chưa phải một lịch sử giải thưởng đầy đủ

Hiện chỉ có:

- counter `achievements.ballonDor`;
- counter nomination tùy chọn `ballonDorNominations`;
- rank theo mùa `SeasonRecord.ballonDorResult`.

Không có entry immutable chứa `rank`, `age`, `season`, competition context, score breakdown, club/league và source. Rank #2–#10 chỉ tồn tại trong season record; nomination wheel trả `no` thì không để lại một award attempt/audit record nào ngoài checkpoint.

Type hiện tại cũng quá lỏng: `TrophyRecord` chỉ có `type/name/club/age`, `SeasonAwardRecord` chỉ có `type/label/age`, còn Prisma chỉ khai báo `achievements Json?`: `types/domain.ts:54-73`, `prisma/schema.prisma:65-70`.

### P1 — Các award cá nhân quá threshold-based và thiếu tính cạnh tranh

Award hiện tại được cấp độc lập bằng mốc tuyệt đối. Ví dụ 20 bàn luôn được gọi là "chiếc giày vàng CLB", dù không mô phỏng top scorer hay số bàn của đối thủ. Rating 7.60 luôn tạo Đội hình tiêu biểu, không có vị trí/league strength/độ cạnh tranh. Điều này dễ tạo mùa có nhiều giải cá nhân nhưng không giải thích được vì sao cầu thủ thắng giải.

Ngoài Golden Boot, các award còn lại cũng đang sai scope hoặc sai metric:

- Găng tay vàng dùng `totalCS` của league + cup + continental + national, không phải clean sheets của competition được trao giải.
- Hậu vệ xuất sắc dùng cùng `totalCS`, lại mở eligibility cho `CDM` nhưng không có role/position ranking.
- Best XI dùng `matchRating` tổng mùa, vốn là weighted average của mọi competition, thay vì rating/scope và slot của đội hình.

Evidence: `features/season/services/season-simulator.service.ts:352-361` và phần weighted rating ngay trước đó. Target resolver phải chọn scope trước, sau đó mới tính metric/ranking.

### P1 — Golden Boot đang sai phạm vi và thiếu Vua kiến tạo

`totalGoals` hiện cộng `lgGoals + cpGoals + ctGoals + ntGoals` trước khi xét award. Một cầu thủ có nhiều bàn ở cup hoặc đội tuyển có thể được cấp “Golden Boot” dù không dẫn đầu ghi bàn ở league. Đây là lỗi domain logic, không phải chỉ là vấn đề label.

Vua kiến tạo chưa có resolver hoặc record. Việc `totalAssists` tồn tại trong stats không đồng nghĩa với việc đã có award theo league; nếu dùng tổng assists để trao award thì sẽ lặp lại cùng lỗi phạm vi.

Quy tắc bắt buộc cho implementation:

1. Golden Boot chỉ đọc thống kê league của season/competition scope tương ứng.
2. Vua kiến tạo chỉ đọc league assists của cùng scope.
3. Cả hai phải có candidate ranking hoặc một candidate field deterministic; ngưỡng tuyệt đối chỉ được dùng làm eligibility, không được tự gọi là giải nhất.
4. Tie phải có policy rõ ràng. Khi các candidate bằng chỉ số chính, dùng một bước random resolution có weight/evidence được ghi lại để chọn một winner duy nhất; không lưu đồng thắng giải và không re-roll khi retry cùng award instance.

Position cũng không nên là hard gate của Golden Boot. Code hiện chỉ xét `ST/LW/RW`, nên một `CAM`, `CM` hoặc vị trí khác có thể dẫn đầu ghi bàn nhưng không bao giờ được xét. Position nên ảnh hưởng candidate strength/eligibility theo policy, không loại khỏi một giải xếp hạng toàn league chỉ vì vị trí.

### P1 — Best XI đang thiếu hoặc bị giản lược sai (historical finding)

Best XI hiện được suy ra từ một threshold rating chung. Cách này có thể trao Best XI cho nhiều người cùng lúc, không đảm bảo đủ slot vị trí, không phân biệt hậu vệ/tiền vệ/tiền đạo và không thể giải thích candidate nào bị loại.

Best Player đã được xác định là ngoài scope của season recap hiện tại. Không tạo lại award này bằng cách đổi tên Best XI hoặc dùng một threshold rating tổng thể; nếu product mở lại trong tương lai, phải bổ sung contract riêng trong SoT trước khi code.

### P1 — Ballon d'Or chưa có award universe và ranking snapshot theo mùa (historical baseline)

Ở baseline cũ, ranking là random wheel dựa chủ yếu trên score của chính cầu thủ; chưa có một danh sách ứng viên được simulator dựng riêng cho season/career hiện tại. League được phản ánh gián tiếp qua `leagueSize`, `clubPrestige` và kết quả; không có league coefficient/competition strength rõ ràng. Revision v4 đã tách synthetic league generator để xử lý boundary này; các invariant realism được ghi ở mục 5.4.

Đây là giới hạn của mô hình mô phỏng, không phải lỗi random resolver. Mục tiêu không phải truy vấn dữ liệu từ các career khác. Mỗi career cần có một award universe riêng do simulator tạo cho mùa đó, gồm cầu thủ của người chơi và các ứng viên mô phỏng đủ hợp lý để tạo bảng xếp hạng phục vụ gameplay.

Hai điểm realism còn thiếu trong evaluator hiện tại:

- `expectedMatches` và `apps` của Ballon d'Or gộp cả league, cup, continental và số trận ĐTQG. Vì vậy việc được gọi lên ĐTQG làm thay đổi denominator availability và ngưỡng `minimumApps`, dù đây không phải cùng một competition scope.
- `luckRating` được cộng trực tiếp vào `hiddenStatsScore`, tức luck làm tăng điểm merit/eligibility của award chính thức. Nếu giữ hidden stat vì gameplay, cần quyết định nó là noise/weight của resolution hay là merit thực tế; không nên vô tình coi “may mắn” là thành tích khi mục tiêu là realism.

Evidence: `features/season/services/season-simulator.service.ts:254-268`, `features/season/services/ballon-dor.service.ts:223-268`.

### P2 — Code và design plan đã lệch

`docs/ballon-dor-wheel-plan.md` vẫn ghi "chưa implement" và đề xuất gate `75`, OVR/rating cao hơn, trophy-first eligibility, goals chỉ dùng cho rank. Code thực tế dùng gate `58`, OVR `85`, rating `7.0`, đồng thời goals/assists/clean sheets tham gia role output của eligibility. File plan cũ phải được coi là historical note, không phải authority.

### P2 — Rủi ro double-count từ field tích lũy trong từng season record

`TrophyCabinetModal` và `StoryRail` đều có điều kiện `record.achievements?.ballonDor`. Nếu một snapshot mùa chứa object `achievements` tích lũy với `ballonDor > 0`, mỗi mùa snapshot đó có thể bị tính như một lần QBV. Điều kiện đúng để count theo mùa phải là `ballonDorResult === 1`; count career phải aggregate các award entry duy nhất.

Evidence: `features/wheel/components/TrophyCabinetModal.tsx:42`, `features/wheel/components/StoryRail.tsx:14-15`.

### P2 — Award event chưa có read model chuyên biệt

V2 tạo generic `CareerEvent(type: "wheel_resolved")` và lưu outcome chi tiết ở `WheelCheckpoint`. Muốn dựng lịch sử award phải ghép `CareerEvent`/`WheelCheckpoint` với `CareerSeason.runtimeState` hoặc `seasonHistory`. Đây là coupling không cần thiết cho archive và analytics.

`SeasonRecord` cũng không có `seasonId`, `events`, award evidence hoặc ranking snapshot; history hiện được key theo `age`. Khi có `CareerHonour`, identity phải trỏ tới `CareerSeason.id`, còn `seasonHistory[age]` chỉ là public projection để tránh hai mùa/record bị nhận diện bằng cùng một age key.

Ngoài award, V2 còn không promote `leagueTable`, `domesticCupJourney`, `continentalCupJourney` hoặc `nationalTeamJourney` từ client UI vào server season projection. Nếu các narrative này được dùng làm evidence/UX cho danh hiệu, chúng cần được server tạo hoặc persist cùng season, không chỉ tồn tại trong React state.

Evidence: `types/game.ts:50-86`, `features/wheel/hooks/useCompetitionFlow.ts:141-279`, `features/career/services/season-transition.service.ts:208-278`.

### P1 — Legacy award path vẫn nhận dữ liệu thành tích từ client

`simulatePlayerSeasonAction` nhận `ovr`, `position`, `luckRating`, stats và competition outcomes từ payload client; `updateSeasonProgressAction`/`saveCareerPlayer` nhận `achievements` và `seasonHistory` rồi ghi vào DB cho legacy path. `updateSeasonProgressAction` không dùng expected revision/idempotency để bảo vệ toàn bộ award snapshot, và merge history chủ yếu chỉ đặc biệt xử lý cup/national object; các field award khác có thể bị stale request ghi đè.

Đây là rủi ro integrity riêng với P0 persistence: cùng một feature có một server-authoritative V2 và một legacy path có thể forge/overwrite award. Bản triển khai canonical phải loại bỏ legacy write hoặc chuyển nó sang server-derived backfill; không lấy client JSON làm evidence.

Legacy client cũng append `trophies`/`seasonAwards` mà không có award instance hoặc dedup key, đồng thời mutate trực tiếp `prev.ballonDorNominations` trong React state. Retry hoặc gọi lại handler có thể tạo duplicate và làm snapshot local không còn immutable.

Evidence: `actions/season.actions.ts:179-205`, `actions/season.actions.ts:429-601`, `actions/player.actions.ts:90-110`, `actions/player.actions.ts:250-420`.

### P2 — Một số consumer của achievement chưa theo kịp contract mới

`ballonDorNominations` được tăng trong client state nhưng `computeLegacyScore` chỉ tính số lần winner (`ballonDor`), và archive UI không có ranking/nomination history đầy đủ. Khi `CareerHonour` trở thành authority, influence score, retirement summary và archive selector phải đọc derived projection từ record canonical, không tiếp tục phụ thuộc một counter JSON do client gửi.

Evidence: `features/wheel/hooks/useCareerStats.ts:367-371`, `lib/influence-score.ts:92-126`, `features/player/components/PlayerCareerDialog.tsx:40-87`.

### P2 — Test hiện tại chưa khóa các invariant award quan trọng

Baseline `scripts/ballon-dor-logic-check.ts` chỉ kiểm tra pure evaluator, gate, weight distribution và resume helper. Batch hiện tại bổ sung simulator/persistence checks cho Golden Boot, Vua kiến tạo, Best XI, candidate snapshot và idempotency; integration persistence check vẫn phụ thuộc `CAREER_TEST_DATABASE_URL`.

Vì vậy các test đang pass chỉ chứng minh flow Ballon d'Or hiện tại không crash và rank weights cộng đúng, chưa chứng minh feature award đúng domain hoặc không mất dữ liệu khi refresh/retry/retire.

### P2 — Dữ liệu lịch sử không đủ để tự động đổi tên thành Golden Boot league

Các event legacy chỉ giữ `label`, `age` và một phần season context; label cũ “chiếc giày vàng CLB” không chứng minh cầu thủ đứng đầu league. Khi backfill không có candidate ranking hoặc stats league đủ để xác minh, record phải giữ `source = "legacy_backfill"`, `scope = "unknown"`/legacy và không được tự động nâng thành `league_golden_boot`. Chỉ những mùa có evidence tách riêng và policy tie rõ ràng mới được backfill vào award canonical.

## 4. Historical compatibility contract trước batch

Các invariant sau ghi lại contract legacy đã được dùng làm baseline khi triển khai; chúng không thay thế authority canonical hiện tại:

1. Team trophy theo mùa là kết quả winner trong `SeasonRecord`.
2. Individual award theo mùa là event `type = "individual_award"` từ season simulator.
3. Ballon d'Or winner là `ballonDorResult === 1`; rank `2..10` là nominee.
4. `achievements` là legacy cumulative cache, không được coi là authoritative cho V2.
5. Không dùng `record.achievements.ballonDor` để đếm award theo mùa.
6. `evaluateBallonDor` là server-side pure evaluation; wheel outcome là bước random cuối cùng.
7. Mọi thay đổi sau này phải giữ cùng rank/award khi replay idempotency và refresh/resume.

## 5. Applied SoT contract

### 5.1 Một record award chuẩn

Tạo một domain record duy nhất, ví dụ `CareerHonour`, với tối thiểu:

```ts
type HonourCategory = "team_trophy" | "individual_award" | "ballon_dor";
type HonourScope =
  | "league"
  | "domestic_cup"
  | "continental"
  | "national_team"
  | "club"
  | "career"
  | "unknown";

interface CareerHonour {
  id: string;                 // deterministic hoặc DB UUID, unique per award event
  careerPlayerId: string;
  seasonId: string;
  age: number;
  seasonLabel: string;
  category: HonourCategory;
  awardKey: string;           // league_golden_boot, league_top_assist, ballon_dor, ...
  scope: HonourScope;
  scopeKey?: string;          // leagueId/competitionId/clubId; bắt buộc với scope không phải career
  awardInstanceKey: string;   // non-null deterministic idempotency key
  slotKey?: string;            // Best XI: gk, cb-left, cm, st, ...
  label: string;              // display label, không dùng làm identity
  rank?: number;              // Ballon d'Or: 1..10
  result?: string;            // Winner, Runner-Up, etc.
  clubId?: string;
  clubName?: string;
  leagueId?: string;
  metrics?: Record<string, number | string | boolean>;
  source: "season_simulation" | "ballon_dor_wheel" | "legacy_backfill";
}
```

Identity phải dựa trên key/season/scope/slot, không dựa trên label dịch hoặc string narrative. `awardInstanceKey` nên encode tối thiểu `seasonId:scopeKey:awardKey:slotKey-or-overall` để unique constraint không phụ thuộc nullable columns.

`CareerHonour` lưu entitlement/kết quả của career player, nhưng không đủ để render danh sách ứng viên. Vì vậy target cần thêm ranking snapshot server-owned, ví dụ:

```ts
interface CareerAwardRankingSnapshot {
  id: string;
  careerPlayerId: string;
  seasonId: string;
  awardKey: string;
  scope: HonourScope;
  scopeKey?: string;
  modelVersion: string;
  entries: Array<{
    candidateKey: string;
    rank: number;
    name: string;
    clubName?: string;
    position?: string;
    isCareerPlayer: boolean;
    metrics: Record<string, number | string | boolean>;
    result?: string;
  }>;
}
```

Snapshot này là bảng/dataset của riêng career-season, không lấy candidate từ career khác. Unique identity tối thiểu là `(careerPlayerId, seasonId, awardKey, scopeKey)`; retry phải upsert cùng snapshot thay vì tạo một bảng xếp hạng khác.

### 5.2 Authority và write timing

- Server domain service là nơi duy nhất resolve và ghi `CareerHonour` cùng `CareerAwardRankingSnapshot`.
- Ghi award trong cùng transaction với season close hoặc command tương ứng.
- Ranking snapshot và honour record phải được commit như một kết quả của cùng season simulation; UI không tự dựng candidate list từ client.
- Dùng unique constraint theo `(careerPlayerId, awardInstanceKey)`. Một mùa có thể có nhiều scope hoặc nhiều Best XI slot; vì vậy `(careerPlayerId, seasonId, awardKey)` là chưa đủ. Ballon d'Or dùng instance overall của mùa, rank trong payload và không tạo duplicate khi retry.
- `CareerPlayer.achievements` nếu còn giữ chỉ là derived summary/cache: count theo `CareerHonour`, không nhận nguyên object từ client.
- `seasonHistory` là public season projection; không phải nơi duy nhất lưu audit award.
- `CareerEvent` vẫn có thể log narrative, nhưng không được là nguồn duy nhất để dựng danh sách award.

### 5.3 Quy tắc award cần chốt khi implementation

- Team trophy: league title, domestic cup, continental cup, national tournament; mỗi winner là một entry.
- Individual league: Golden Boot chỉ dùng league goals; Vua kiến tạo chỉ dùng league assists. Cả hai cần candidate ranking, eligible appearances và tie-resolution policy. Nếu chưa có ranking đối thủ thì chỉ được gọi là milestone, không được gọi là Golden Boot/Vua kiến tạo.
- Best XI phải có scope, formation/slot schema, position eligibility, minimum appearances và candidate ranking cho từng slot. Nên lưu một record mỗi slot với `slotKey` ổn định.
- Formation mặc định là 4-3-3; fallback position chỉ dùng để lấp slot gần vai trò, không đổi slot/pitch layout và không chọn trùng candidate.
- Ballon d'Or: lưu nomination attempt, rank và winner history; không chỉ lưu count.
- `HonourCategory` và `awardKey` phải nằm trong shared type/Zod schema để server, archive và UI cùng contract.

Resolver mục tiêu cho individual awards:

1. Chọn đúng competition scope trước khi đọc stats; Golden Boot/Vua kiến tạo không được đọc `totalGoals`/`totalAssists`.
2. Simulator tạo candidate field riêng cho career-season hiện tại từ dữ liệu mùa, context giải đấu và các candidate mô phỏng. Không query candidate từ career khác; candidate field này là một phần của gameplay simulation và phải được snapshot cùng kết quả.
3. Áp minimum appearances và position eligibility.
4. Xếp hạng theo metric chính; nếu có tie, chuyển nhóm candidate bằng điểm sang random resolution có weight được cấu hình và lưu kết quả. Không lưu đồng thắng giải.
5. Ghi evidence vào `metrics` để archive có thể giải thích winner; không chỉ ghi label narrative.

#### Award simulator contract

Award resolver phải là domain service data-driven, nhận input rõ ràng và trả về kết quả có evidence. Không để UI hoặc season simulator tự gắn label award trong một nhánh `if` dựa trên một magic number.

```text
scope stats + candidate field + award config
  -> filter eligibility theo scope/appearances/position
  -> tính feature vector và percentile/rank trong candidate field của career-season
  -> áp dụng scoring model riêng của award
  -> sort giảm dần + random resolution cho nhóm bị tie
  -> emit CareerHonour + metrics/evidence
```

Minimum target cho từng resolver:

- Golden Boot: xếp hạng `leagueGoals` trong candidate field của league; không đọc `totalGoals`.
- Vua kiến tạo: xếp hạng `leagueAssists` trong cùng scope; không đọc `totalAssists`.
- Best XI: tính score theo role/position, xếp hạng trong từng slot và chỉ emit đúng số slot của formation.
Award config có thể chứa minimum appearances, feature weights, scope và tie-resolution weights, nhưng phải có tên/version và được test. Những giá trị này là model/config có thể điều chỉnh, không phải logic hardcode rải trong simulator. Khi config thay đổi, record phải lưu model/config version để giải thích kết quả lịch sử. Random result phải được commit cùng award instance để retry không quay lại một kết quả khác.

### 5.4 Ballon d'Or target — simulator tạo ranking để phục vụ gameplay

Mục 5.4 không yêu cầu hệ thống có dữ liệu từ các career khác. Mỗi career có một award universe riêng theo từng season. Simulator sẽ tạo danh sách ứng viên của Ballon d'Or và các award khác nếu award đó có ranking; UI dùng snapshot này để hiển thị cuộc đua, vị trí của player và các ứng viên nổi bật. Đây là dữ liệu gameplay được mô phỏng, không phải bảng xếp hạng toàn cầu dùng chung giữa các career.

Phần khó và quan trọng nhất là realism của simulator, không phải việc render danh sách. Target flow:

1. **Load and generate league context:** server load `id/name/prestige` của toàn bộ CLB thuộc `player.club.leagueId`, sau đó simulator tạo strength distribution, attack/defence và thứ hạng tương quan quanh chính tập CLB đó. Context này không được lấy từ OVR của player user và không được trộn CLB từ league khác.
2. **Generate candidate universe:** từ league context, simulator tạo nhiều candidate theo club, position, age band, quality/reputation và squad role; sau đó mới inject player của người chơi vào cùng universe. Candidate giả phải có stats/evidence đủ để giải thích vì sao họ xuất hiện trong ranking.
3. **Generate competition output:** apps được sinh từ starter/rotation/backup role và availability; goals/assists/clean sheets sinh từ position + quality + club attack/creation/defence + competition schedule, không phải `apps * rate` với một nhiễu chung. League/cup/continental/national là các scope riêng.
4. **Evaluate award-specific strength:** mỗi award có scoring model riêng. Ballon d'Or dùng role output, availability, match rating, team success, league strength, club context, hidden stats và các award/team achievement hợp lệ; Golden Boot/Vua kiến tạo/Best XI dùng đúng scope và metric đã định.
5. **Resolve gameplay randomness:** sau khi có candidate strength và eligibility, wheel/random resolver tạo nomination, rank hoặc winner theo weight. Với nhóm bằng điểm, random resolution chọn một winner duy nhất. Không dùng random để bù cho candidate/evidence không hợp lệ.
6. **Persist the ranking snapshot:** lưu danh sách xếp hạng cuối cùng, metrics/evidence, model version và kết quả random. UI có thể hiển thị top list ngay cả khi player không thắng; refresh/resume/retry phải giữ cùng snapshot.

Để đạt realism, implementation phải giữ các invariant sau:

- Với cùng `seed + season context`, fake candidate metrics/OVR/apps/clubs không đổi khi chỉ thay `player.ovr` hoặc player performance.
- Không có đường code nào dùng `player.ovr` để làm mean/baseline của fake OVR; không dùng `player.leaguePrestige` để gán prestige cho toàn bộ fake clubs.
- Synthetic universe có nhiều club và squad role, có candidate không đủ appearances; không tạo top list bằng roster 21 người đá gần đủ mùa.
- Mọi entry non-user trong snapshot `scope = league` phải có `clubName` nằm trong `currentLeague.clubNames`; thiếu league-club context là lỗi input và không được fallback sang danh sách CLB fictional/global.
- Golden Boot/Top Assist lấy raw league goals/assists của cùng universe; không để cup/continental/national output đi ngược vào hai bảng này.

Để đạt realism, calibration phải giải quyết:

- phân phối candidate theo vai trò, league strength, club context, playing time và team success để không sinh ra ranking vô lý;
- tương quan hợp lý giữa stats, rating, awards và khả năng lọt ranking, thay vì một ngưỡng global;
- scoring model/version riêng cho từng award và fixture theo ST, CM, CB, GK;
- calibration bằng nhiều lần chạy simulator trong cùng loại career/season context, không chỉnh một con số đơn lẻ sau mỗi lỗi;
- không hardcode kiểu `goals >= 20` hoặc `matchRating >= 7.60` để kết luận winner. Minimum eligibility nếu cần phải là config/model có tên, scope và test; winner vẫn đến từ candidate universe do simulator tạo.

Không được để `docs/ballon-dor-wheel-plan.md` và service cùng được xem là authority.

## 6. Acceptance criteria và trạng thái sau batch

### Persistence

- Chạy hoàn chỉnh một career V2 có team trophy, individual award, Ballon d'Or rank #1 và rank #2–#10.
- Refresh ở mỗi checkpoint không làm mất hoặc nhân đôi award.
- Retire/reopen archive hiển thị đúng dữ liệu đã commit từ server.
- Retry cùng idempotency key không tạo thêm `CareerHonour`.
- Season close phải promote award events, evaluation evidence và ranking snapshot từ runtime vào dữ liệu canonical; không chỉ giữ chúng trong `CareerSeason.runtimeState`.
- Legacy data được backfill một lần, có `source = "legacy_backfill"`.

### Consistency

- Trophy Cabinet, StoryRail, PlayerCareerDialog và SeasonRecap dùng cùng selector/read model.
- Tổng số team trophy, individual award, nomination và winner phải reconcile được từ collection canonical.
- Không còn logic count theo `record.achievements?.ballonDor` trong season record.
- Các award có ranking phải có snapshot theo career-season; UI không cần và không được truy vấn candidate từ career khác.

### Individual award correctness

- Với fixture `10` league goals + `9` domestic-cup goals + `3` national-team goals, Golden Boot evidence chỉ là `10` league goals; cup/đội tuyển không thể làm tăng award.
- Vua kiến tạo chỉ dùng league assists; có fixture phân biệt league assists với assists ở cup/continental/national team.
- Hai người cùng đứng đầu league goals/assists được chuyển qua random resolution có weight/evidence được lưu, chọn đúng một winner và không lưu đồng thắng giải.
- Best XI không còn là boolean `rating >= 7.60`; phải có slot vị trí, candidate ranking và giới hạn số slot.
- Không phát hành hoặc render award "Cầu thủ xuất sắc nhất" trong season recap; Best XI là selection theo slot riêng.
- Simulator không chứa các nhánh hardcode kiểu `goals >= 20`/`rating >= 7.60` để phát award; kết quả phải xuất phát từ scope stats, candidate field và resolver có evidence.
- Găng tay vàng không đọc `totalCS` gộp mọi đấu trường; scope của metric phải khớp scope của award.
- Không phát hành award position-specific kiểu "Hậu vệ xuất sắc nhất"; các khác biệt theo vị trí chỉ dùng bên trong scoring/slot selection của Best XI.
- Golden Boot không loại candidate chỉ vì position không nằm trong danh sách `ST/LW/RW`.

### Ballon d'Or

- Có test cho gate, nomination weight, rank weights, rank persistence và resume từ nomination/ranking.
- Rank `1..10` được lưu; rank #1 tăng winner count đúng một lần; rank #2–#10 vẫn hiển thị là nomination.
- Có ranking snapshot của mùa với candidate list, rank, metrics/evidence, model version và cờ xác định player của người chơi.
- Breakdown/evidence của mùa được lưu đủ để giải thích tại sao cầu thủ đủ điều kiện.
- Availability denominator phải có policy tách bạch giữa club competitions và national-team call-up; thay đổi call-up không được vô tình làm hạ/nâng gate chỉ vì đổi expected match count.
- Nếu giữ hidden `luckRating`, test phải chứng minh nó tác động vào đúng lớp gameplay đã chọn; không để luck vô tình trở thành merit score không giải thích được.
- Nếu thay đổi realism model, phải có fixture cho ST, CM, CB và GK; không chỉ fixture CM hiện tại.

### Authority and compatibility

- V2 và legacy không thể nhận một `achievements`/`seasonHistory` client payload để ghi đè award canonical.
- Legacy save/backfill phải có test stale request, duplicate request và forged award payload.
- Downstream influence score/retirement/archive đều đọc cùng derived projection từ `CareerHonour`; không chỉ đọc `ballonDor` counter.

### UI

- Cabinet hiển thị team trophies, individual honours và Ballon d'Or trong các nhóm rõ ràng.
- Mỗi row có season/club/scope; không dùng label narrative làm identity.
- Season recap không bỏ sót league/domestic/national winner trong phần danh hiệu.

## 7. Test evidence sau batch triển khai

Đã chạy và pass:

- `npx prisma migrate deploy`
- `npx prisma migrate status` — database schema up to date
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `npm run check:awards` — league scope, 41-candidate synthetic universe, OVR-independence regression, replay seed và 100-seed Best XI no-empty-slot stress
- `npm run check:awards-persistence` — transaction rollback sentinel xác nhận không để lại fixture
- `npm run check:checkpoint-contract`
- `npm run check:season-record-hydration`
- `npm run check:ballon-dor`
- `npm run check:career-summary`
- `npm run check:season-projection`
- `npm run check:transfer-authority`
- `npm run check:transfer-economy`
- `npm run audit:career-persistence` — `5` players, `70` seasons, `593` checkpoints, `1030` events, `0` anomalies
- `npm run backfill:awards -- --dry-run`
- `npm run backfill:awards` — `28` legacy team-honour records, `0` ambiguous legacy awards

Calibration run 200 seeded Tier 1 seasons cho top scorer trung bình `21.04` bàn, top assist `11.56`, synthetic OVR range `64..94`; đây là distribution sanity check, không phải hardcoded winner rule. Sau revision v5 cần recalibrate lại các distribution này trên tập CLB thật của từng league tier.

Browser smoke bằng Playwright đã xác nhận `/classic` redirect đúng về `/login`, trang login render được và không có console error runtime; chỉ còn warning autocomplete hiện hữu. Authenticated end-to-end qua toàn bộ career chưa chạy vì cần owner session/career để kiểm tra gameplay thực tế.

`npm run check:career-persistence-integration` vẫn phụ thuộc `CAREER_TEST_DATABASE_URL` cho database cô lập và chưa chạy trong môi trường này.

## 8. Known drift còn lại

1. `docs/ballon-dor-wheel-plan.md` chỉ còn là historical/outdated; mọi thay đổi award phải cập nhật SoT này.
2. Candidate universe hiện là simulator local theo career-season, chưa phải dataset cầu thủ thực tế toàn cầu; tên CLB và league boundary lấy từ DB hiện tại, còn candidate/player output vẫn synthetic và cần tiếp tục calibration qua manual gameplay và fixtures mở rộng.
3. Ranking snapshots của dữ liệu legacy không được tự bịa khi runtime cũ không chứa evidence; backfill chỉ canonicalize team trophies có evidence rõ.
4. Audit persistence nền hiện vẫn báo `5` player thiếu một số projection current-age/current-step legacy; không có anomaly mới và đây không phải regression do award migration.
5. Owner vẫn cần manual test authenticated cho refresh/resume, Ballon rank #1 và #2–#10, Best XI, Top Assist, Trophy Cabinet và cảm nhận ranking list.

## 9. Quy tắc cập nhật file SoT này

Mỗi lần thay đổi feature phải cập nhật tối thiểu:

1. authority/data model;
2. server write path và transaction boundary;
3. Ballon d'Or formula/gate/weights;
4. archive selector và UI surfaces;
5. migration/backfill strategy;
6. test evidence và ngày/commit audit.

Nếu code và file này lệch nhau, coi đó là regression cần sửa hoặc ghi rõ trong mục `Known drift`; không âm thầm cập nhật chỉ một phía.
