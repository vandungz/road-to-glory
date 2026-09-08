# Football Life — SoT: Production Data, Server và BE–FE Contract

> Trạng thái: **Current implementation / Classic V2 command boundary đã nối, còn bằng chứng vận hành production**
> Ngày ghi nhận: **2026-09-03**
> Phạm vi: PostgreSQL/Supabase, Prisma, Server Actions, career persistence, Classic mode và đường mở rộng PvP.

Tài liệu này là SoT kiến trúc cho việc nâng cấp database và server. Chi tiết lifecycle/checkpoint của career nằm ở [career-persistence-sot.md](./career-persistence-sot.md).

## 1. Phân biệt fact, decision và assumption

### Fact đã xác nhận từ repository

- Database provider trong Prisma là PostgreSQL.
- ORM là Prisma, dùng PrismaPg adapter và pg.Pool trong lib/prisma.ts.
- Auth là Supabase Auth; GameSession.userId lưu Supabase user ID dạng String.
- Internal mutations hiện dùng Server Actions trong actions/.
- Repo hiện không có thư mục app/api; Prisma migrations đã được khởi tạo trong phase nền tảng.
- Schema hiện có các model GameSession, CareerPlayer, League, NationalTeam, Club và các model persistence V2.
- CareerPlayer giữ statsTimeline, clubStints, events, walletLedger, shopInventory, seasonHistory trong JSON.
- CareerPlayer hiện đã có currentAge, currentStep, currentWheel, checkpointVersion, revision, lastCheckpoint fields và timestamps; các field progress còn nullable cho legacy rows.
- Legacy wheel outcome được resolve bởi client-side flow sử dụng Math.random() trong lib/wheel-engine/spin-resolver.ts; career wheel V2 đã chuyển sang server resolver với secure random.
- updateSeasonProgressAction hiện nhận client snapshot lớn và read-merge-update không nằm trong một transaction.
- updateSeasonProgressAction hiện không có Zod runtime schema riêng cho toàn bộ payload SeasonProgressUpdate.
- Auth guard dùng chung đã được thêm và các action player/season trong phạm vi slice đầu tiên đã bỏ guest/local no-op; các command legacy vẫn cần tiếp tục migration.
- Classic draft vẫn hydrate legacy player bằng Server Action trong React lifecycle; V2 hydrate thêm CareerProgressDto qua checkpoint sync hook. TanStack Query chưa được đưa vào toàn bộ flow; FE command cutover đã hoàn tất cho career wheel, season-stats, Shop, transfer completion, transfer market/club search/negotiation và season advance. Legacy actions chỉ còn compatibility path cho row chưa ở V2.

### 1.1. Implementation status

- Đã xác minh database schema thực tế bằng `prisma migrate diff` ở chế độ chỉ đọc.
- Đã thêm baseline migration `00000000000000_baseline` và additive migration `20260902000100_career_persistence_foundation`.
- Đã thêm strict auth/ownership guard tại `lib/auth/guards.ts`.
- Đã thêm `features/career/services/checkpoint.service.ts` với start-season command và resolve checkpoint transaction foundation.
- Đã thêm `actions/career-checkpoint.actions.ts` cho start-season và resolve-wheel command.
- `features/game/actions/createGameSession.ts` đã dùng strict auth guard chung.
- Đã apply migration foundation và migration command-idempotency; `prisma migrate status` xác nhận database schema up to date.
- Đã thêm public `CareerProgressDto` query/action; career wheel V2 dùng server resolver, season-stats V2 dùng server simulation/transaction, FE giữ nguyên UI/animation và chỉ hydrate authoritative projection/runtime.
- Đã thêm `CareerCommand` + migration idempotency storage cho non-wheel command; V2 Shop consumer đã nối vào module hiện tại, giữ nguyên UI/layout.
- Đã thêm `advanceCareerSeasonCommand` với explicit shop acknowledgement, revision CAS, idempotency, summary snapshot, season close và retirement/next-age transition trong một transaction; FE gọi command sau CTA Shop mà không đổi UI.
- Read-only audit trước cleanup ghi nhận 33 legacy players, 0 season/checkpoint/event rows; dry-run projection backfill có 33 candidate rows và không ghi DB.
- Audit read-only mới nhất sau operator cleanup ghi nhận `0` CareerPlayer, `0` CareerSeason, `0` WheelCheckpoint và `0` CareerEvent; agent không tự thực hiện lệnh xóa.
- Đã chuyển consumer FE cho career wheel, season-stats, Shop, transfer completion, transfer market/club search/negotiation và season transition sang command V2 mà không đổi UI/UX, layout, live label, animation hoặc flow người chơi nhìn thấy.
- Embedded V2 flow không còn gọi legacy aggregate save khi mở module hoặc sau khi đổi mùa; V2 Shop retry giữ cùng idempotency key. Legacy actions chỉ còn compatibility path cho row có `checkpointVersion < 2`.
- Transfer market được snapshot theo mùa và trạng thái willingness; approach/renewal dùng server-derived terms, canonical idempotency key và server-controlled secure RNG. Client không thể gửi lại stats/preview/chance để quyết định outcome.
- V2 command actions có rate-limit boundary dùng Upstash; production thiếu cấu hình thì fail closed, local development no-op có cảnh báo.
- Scope hiện tại không backfill lịch sử 33 legacy players vì không có season/checkpoint/event để phục hồi chính xác; không được suy đoán dữ liệu cũ.
- Career setup dùng HMAC token bind user/game/slot và TTL; init tự sinh hidden stats ở server, không dùng hidden stats hoặc full snapshot từ client làm nguồn sự thật.
- Legacy aggregate save/progress/transfer/shop actions bị chặn trên Career V2; transfer completion yêu cầu market offer/negotiation do server phát hành và còn khớp state hiện tại.
- Transfer market contract thống nhất đơn vị lương là annual wage; shortlist áp dụng wage option vào cả accept chance và giá offer ở server, còn final negotiation hiển thị lỗi/accepted status tại chỗ.
- Quote lương annual được tạo từ `proposeWageAnnual` rồi random trong buying-power band derive từ `Club.prestige + League.tier`; Career V2 dùng stable source theo `(player, season, club)` để market/search/negotiation/completion không lệch sau refresh hoặc retry. Không cần cột Club mới cho rule hiện tại.
- Completion validation phải map input `approach` sang result kind `transfer` hoặc `free_agent`; không dùng input command kind để so khớp trực tiếp với offer kind.
- Transfer header không được dùng market value projection cũ nếu market đang tính lại từ snapshot/match rating; cả hai phải gọi cùng canonical valuation function.
- Command boundary có structured JSON logs bounded; `lib/prisma.ts` dùng pool hữu hạn cùng connection/idle/statement/query/idle-in-transaction timeout có thể cấu hình.
- Đã có `scripts/career-setup-security-check.ts`, `scripts/career-persistence-integration-check.ts` và audit `--baseline`; integration test chỉ chạy khi có database copy riêng qua `CAREER_TEST_DATABASE_URL`.

### Decision đã thống nhất

- Game truth phải do server kiểm soát.
- Mỗi wheel đã resolve phải có durable checkpoint.
- Client chỉ gửi intent/choice và revision; không gửi outcome cuối cùng làm nguồn sự thật.
- Checkpoint phải idempotent và chống stale write.
- Classic mode cần đúng dữ liệu trước khi mở rộng sang PvP.

### Assumption chưa được phép coi là fact

- Chưa có số liệu production về users, QPS, p95 latency, connection usage, table size hoặc replication lag.
- Chưa có yêu cầu availability/RPO/RTO chính thức.
- Chưa biết deployment thực tế dùng Supabase pooler ở mode nào.
- Chưa có kết luận rằng phải shard, partition hoặc tách microservice.

Không được chọn topology hoặc capacity cụ thể chỉ vì giả định “traffic sẽ rất cao”. Trước hết phải sửa correctness, ownership, transaction và đo workload thật.

## 2. Kết luận về kiến trúc hiện tại

Kiến trúc hiện tại phù hợp prototype/single-player development hơn production multiplayer:

~~~
Server Components / Client Hooks
          ↓
Server Actions có nhiều mức auth khác nhau
          ↓
Feature services + trực tiếp Prisma trong action/page
          ↓
CareerPlayer aggregate lớn với nhiều JSON field
          ↓
PostgreSQL
~~~

Các điểm yếu không phải chỉ là thiếu index:

1. State transition của career chưa được model rõ ở DB.
2. Một aggregate JSON đang chứa cả current state, history, audit và ledger.
3. Client có thể tham gia quyết định outcome và gửi snapshot quan trọng lên server.
4. Save chính chưa có revision/CAS hoặc transaction đầy đủ.
5. Idempotency hiện chỉ được xử lý một phần ở wallet ledger.
6. Auth/ownership boundary giữa các action không đồng nhất.
7. Schema evolution chưa được quản lý bằng migration trong repository.
8. BE–FE contract chưa phân biệt command, authoritative state và display DTO.

Không thể kết luận hệ thống chịu được traffic production chỉ từ việc local build pass.

## 3. Architectural drivers

Thứ tự ưu tiên:

1. **Correctness:** không nhảy mùa, không mất season result, không duplicate side effect.
2. **Integrity/security:** client không tự sửa outcome, stat delta, tiền hoặc transfer result.
3. **Concurrency:** nhiều request/retry/tab/serverless instance không làm hỏng state.
4. **Recoverability:** có audit/checkpoint để resume và điều tra lỗi.
5. **Performance:** payload và transaction nhỏ; không rewrite cả career aggregate mỗi wheel.
6. **Evolution:** schema có migration, tương thích rollout và mở đường cho PvP.
7. **Operability:** có log/metric đủ để biết checkpoint nào fail và ảnh hưởng ai.

## 4. Target ownership

| Concern | Authoritative owner | Client được làm gì |
|---|---|---|
| Wheel weights/outcome | Server domain resolver | Hiển thị animation và gửi choice/intent |
| Career step/revision | DB CareerPlayer/CareerProgress | Đọc và gửi expected revision |
| Season result | Server checkpoint + immutable record | Render kết quả server trả về |
| Current stats/OVR | Server projection | Hiển thị, không tự commit final value |
| Wallet | Server ledger + balance projection | Gửi purchase intent |
| Shop inventory | Server inventory table | Hiển thị và chọn item |
| Transfer | Server transfer workflow | Chọn offer/đàm phán theo rule |
| Reference clubs/leagues | Seeded reference tables | Filter/search/read |
| PvP player strength | Immutable trusted snapshot | Submit snapshot ID, không submit stats tự do |

## 5. Target database model

### 5.1. Giữ GameSession làm aggregate đội hình

GameSession tiếp tục là owner của một squad Classic.

Nên bổ sung/chuẩn hóa:

- createdAt, updatedAt;
- trạng thái bằng constrained value rõ ràng;
- owner index theo userId, createdAt;
- check constraint cho status;
- giới hạn slot ở DB (0..10) thay vì chỉ Zod;
- unique (gameSessionId, slotIndex) tiếp tục giữ nguyên.

userId không có foreign key tới Supabase Auth vì Auth nằm ngoài Prisma schema. Quyền owner vẫn phải được kiểm tra ở server; nếu sau này client truy cập DB trực tiếp qua Supabase, phải thiết kế và kiểm thử RLS riêng.

### 5.2. CareerPlayer chỉ giữ identity và current projection

Target không để CareerPlayer tiếp tục là nơi chứa toàn bộ history/ledger.

Nên giữ trong aggregate:

- identity và position;
- debut/retire metadata;
- current club/contract/current stats cần render nhanh;
- current age/step/wheel;
- progressRevision hoặc checkpointVersion;
- isRetired, isUnemployed;
- cached peakOvr, influenceScore, marketValue khi có rule derive rõ ràng;
- createdAt, updatedAt, lastCheckpointAt.

Nên bổ sung rõ:

~~~
currentAge
currentStep
currentWheel
checkpointVersion
lastCheckpointId
~~~

Các field này là progress pointer, không được suy luận chỉ từ statsTimeline hoặc URL.

### 5.3. CareerSeason

Một row cho một mùa của một player:

~~~
id
playerId
seasonAge / seasonIndex
status: in_progress | completed | abandoned
clubId / leagueId
standing
domesticCupResult
continentalCupType / result
nationalTeamResult
apps / goals / assists / cleanSheets / matchRating
startedAt / completedAt
createdAt / updatedAt
~~~

Constraint bắt buộc:

~~~
unique(playerId, seasonAge)
~~~

Các journey/list dài có thể giữ JSON ở phase đầu nếu chưa cần query; kết quả và fields dùng để filter/report nên là columns hoặc child rows có schema.

### 5.4. WheelCheckpoint

Đây là record durable cho từng wheel đã resolve, append-only về mặt domain:

~~~
id
playerId
seasonId
sequence
stepKey
wheelType
commandId / idempotencyKey
expectedRevision
resultRevision
choicePayload       // nếu người chơi có lựa chọn
outcomePayload      // server-generated, public-safe
outcomeHash         // integrity/audit metadata
resolverVersion
createdAt
~~~

Constraints/indexes:

~~~
unique(playerId, seasonId, sequence)
unique(playerId, commandId)
unique(playerId, seasonId, stepKey) // nếu mỗi step chỉ được resolve một lần
index(playerId, seasonId, sequence)
~~~

Không lưu hidden seed/secret vào response client. Nếu cần replay/debug, seed phải được server bảo vệ và chỉ lưu metadata/hash phù hợp.

### 5.5. CareerEvent

events Json hiện tại không đủ cho audit. Target cần append-only event table cho meaningful transitions:

- wheel_resolved;
- season_started;
- season_completed;
- transfer_completed;
- shop_item_purchased;
- retired;
- pvp_snapshot_created.

Event cần có playerId, sequence hoặc monotonic ordering, event type, public payload, schema version, actor/user context tối thiểu và timestamp.

Không dùng event table để giấu một workflow không ai hiểu; mỗi event phải có owner, schema và consumer rõ ràng.

### 5.6. Các dữ liệu nên tách khỏi JSON aggregate

Theo thứ tự ưu tiên:

1. WalletLedgerEntry — money side effect, cần unique idempotency key.
2. ShopInventoryItem — item ownership/consumption, cần unique purchase key.
3. PlayerClubStint — cần query timeline và transfer history.
4. PlayerStatSnapshot — cần phục vụ player card, Classic và PvP.
5. TransferOffer/TransferNegotiation — cần trạng thái workflow và retry.
6. CareerSeason — season history/query/report.

Không bắt buộc normalize mọi field ngay lập tức. Nhưng mọi bảng mới phải có owner, lifecycle, constraints và query pattern rõ ràng.

### 5.7. PvP boundary

Classic không được để PvP mutate trực tiếp career truth.

Target thêm read-only snapshot:

~~~
PlayerCompetitiveSnapshot
  id
  playerId
  sourceCheckpointVersion
  publicStatsPayload
  rating/eligibility metadata
  snapshotHash
  createdAt
~~~

PvP dùng snapshot ID hoặc immutable snapshot reference. Không nhận một JSON stats tùy ý từ client.

Các model PvP tương lai (SquadSubmission, Match, MatchParticipant, MatchEvent, rating/result) thuộc PvP domain và không được ghi ngược vào CareerPlayer trừ projection đã định nghĩa.

## 6. Constraints và indexes tối thiểu

Các constraint cần DB enforce, không chỉ kiểm tra bằng UI/Zod:

- unique game slot;
- unique player season;
- unique wheel logical key;
- unique idempotency key theo owner/aggregate;
- unique wallet ledger entry;
- foreign key player → game session;
- foreign key season/checkpoint/event → player;
- valid slot, age, revision và amount ranges;
- non-negative wallet amount/balance nếu domain yêu cầu;
- valid workflow status;
- transfer destination khác current club ở thời điểm commit.

Index phải bám theo query thật. Baseline cần xem xét:

~~~
GameSession(userId, createdAt)
CareerPlayer(gameSessionId, isRetired)
CareerSeason(playerId, seasonAge)
WheelCheckpoint(playerId, seasonId, sequence)
CareerEvent(playerId, sequence)
WalletLedgerEntry(playerId, createdAt)
~~~

Không thêm index hàng loạt trước khi đo query plan và write cost.

## 7. Server command architecture

### 7.1. Boundary mới

~~~
Server Action / Route Handler
  -> auth context + Zod DTO
  -> application command service
  -> domain resolver
  -> transaction/repository
  -> explicit response DTO
~~~

Server Action vẫn phù hợp cho first-party Next.js client. Khi PvP/mobile/external consumer xuất hiện, Route Handler có thể dùng cùng application service; không copy business logic sang hai nơi.

### 7.2. Resolve wheel command

Request target:

~~~ts
type ResolveWheelCommand = {
  playerId: string;
  seasonId: string;
  stepKey: string;
  expectedRevision: number;
  idempotencyKey: string;
  choice?: string | number;
};
~~~

Request **không có**:

- final outcome;
- weights;
- next OVR;
- wallet reward;
- arbitrary stats timeline;
- hidden stats/seed.

Response target:

~~~ts
type ResolveWheelResult = {
  checkpointId: string;
  revision: number;
  seasonId: string;
  currentAge: number;
  currentStep: string;
  nextStep: string | null;
  outcome: PublicWheelOutcome;
  publicProgress: CareerProgressDto;
};
~~~

### 7.3. Transaction semantics

Một wheel command cần transaction ngắn:

1. xác định user từ server session;
2. load player + progress;
3. kiểm tra ownership, season, step và expectedRevision;
4. nếu idempotencyKey đã có, trả kết quả checkpoint cũ;
5. server resolve/verify outcome;
6. insert immutable WheelCheckpoint;
7. insert CareerEvent nếu cần;
8. update current projection + increment revision;
9. commit và trả DTO.

Không gọi network service, cache remote hoặc chờ user interaction bên trong transaction.

Có thể dùng optimistic concurrency bằng revision hoặc row lock ngắn. Không dùng process-local lock vì không bảo vệ được nhiều serverless instance.

### 7.4. Error contract

Server phải phân biệt tối thiểu:

~~~
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
INVALID_INPUT
INVALID_TRANSITION
CONFLICT_REVISION
IDEMPOTENCY_REPLAY
RATE_LIMITED
DEPENDENCY_FAILURE
INTERNAL_ERROR
~~~

Client chỉ cần biết code/message an toàn và action recovery. Không trả stack trace, raw Prisma error hoặc secret.

### 7.5. Season transition command

Đóng mùa là một command riêng, không được suy ra từ `router.push` hoặc query
string. Server chỉ chấp nhận khi projection đang ở `resolved`, season đang
`in_progress`, có wheel checkpoint và request mang revision/idempotency hợp lệ.

Request phải gửi explicit `shopDecision: "completed" | "skipped"`. Với cùng
idempotency key, server trả lại kết quả cũ; với revision cũ, server reject. Trong
một transaction, server lưu season summary, đóng season, ghi command/event và
chuyển projection sang tuổi mới (`idle`) hoặc `retired`.

## 8. Security rules

### 8.1. Auth và ownership

- Mọi read/write chứa career truth phải có auth policy rõ ràng.
- User ID phải lấy từ server session, không tin userId trong payload.
- playerId phải được kiểm tra thuộc game session của user.
- Guest mode nếu còn giữ cho local development phải nằm sau explicit development flag; không được silently fallback ở production.
- completeTransfer, purchase, checkpoint, retire và PvP submission đều phải có object-level authorization.

### 8.2. Outcome integrity

- Client không được gửi outcome để server “validate trong range”.
- Server tự resolve bằng server RNG hoặc server-controlled seed.
- Nếu dùng seed để replay, seed/secret không được trả về client trước thời điểm cho phép.
- Server tự derive OVR, peak, income, eligibility và state transition từ trusted state.
- UI disable/pending state chỉ là UX; không phải security control.

### 8.3. Input và data exposure

- Mọi Server Action input phải parse runtime bằng Zod.
- Response phải là DTO explicit, không serialize toàn bộ Prisma model.
- hiddenStats, resolver secret, internal audit metadata và privileged fields không đi vào client DTO.
- Career setup projection được ký bằng `CAREER_SETUP_TOKEN_SECRET`; token bind user/game/slot, có TTL và không chứa hidden stats.
- `initCareerPlayerAction` bỏ qua các hidden stats/snapshot field do caller cũ gửi; hidden stats được tạo server-side và load lại từ DB cho resolver.
- Payload size phải có giới hạn; không nhận full unbounded history nếu command chỉ cần một wheel intent.

### 8.4. Rate limit và abuse

Rate limiting hiện tại phụ thuộc Upstash env; local development không bắt buộc cấu hình, còn production thiếu env sẽ fail closed. Production policy vẫn cần xác nhận:

- fail closed hay degrade có kiểm soát khi rate-limit dependency unavailable;
- limit theo user, player, IP và command type;
- limit burst cho wheel commands;
- limit riêng cho search/filter và PvP match commands;
- audit request bị từ chối.

Không dùng rate limit để thay thế authorization, idempotency hoặc transaction.

## 9. BE–FE contract

### 9.1. Server state

Target client dùng một CareerProgressDto từ server làm state authoritative, qua TanStack Query hoặc một abstraction tương đương đã thống nhất.

DTO cần chứa:

- public player identity;
- current age/season/step/wheel;
- public current stats;
- current club/contract display data;
- completed season summaries;
- wallet/inventory display data;
- checkpoint revision;
- allowed next commands nếu cần.

Không đưa hidden stats, raw seed hoặc toàn bộ persistence JSON vào DTO.

### 9.2. Mutation flow

~~~
User action
  -> mutation pending
  -> send intent + expectedRevision + idempotencyKey
  -> server returns authoritative DTO
  -> replace/update query cache from response
  -> clear transient animation state
~~~

Nếu nhận CONFLICT_REVISION:

1. không tự advance local state;
2. refetch authoritative progress;
3. hiển thị trạng thái đã được cập nhật ở nơi khác;
4. chỉ retry khi command có idempotency semantics rõ ràng.

Nếu network timeout sau khi server có thể đã commit, retry cùng idempotency key; không tạo key mới tùy tiện.

### 9.3. Navigation/module boundary

Shop/Transfer route chỉ mở sau khi checkpoint cần thiết đã acknowledge. Query URL chỉ là navigation intent/return hint, không phải nguồn state.

Khi page mount lại, load progress từ server và tiếp tục từ currentStep. Không dùng router.push(...advance) để tự suy ra một state transition mà server chưa commit.

### 9.4. Loading/error/recovery

Mọi mutation cần:

- pending guard chống double submit;
- timeout/retry policy phù hợp;
- lỗi conflict riêng;
- retry an toàn;
- không để UI kẹt disabled sau lỗi;
- không hiển thị raw backend error.

Wheel animation có thể chạy local để UX mượt, nhưng outcome chính thức chỉ được hiển thị như committed sau server response.

Khi hydrate giữa hai wheel, FE phải dựng read model mùa hiện tại bằng cách
merge `CareerPlayer.seasonHistory` (các mùa đã đóng) với public
`CareerSeason.runtimeState`/checkpoint của mùa `in_progress`. Không được dùng
placeholder từ aggregate cũ để ghi đè result đã commit nhưng mùa chưa finalize.

Season transition cũng phải trả và persist đồng thời các projection liên quan đến
mùa kế tiếp: `currentContinentalCup`, `contractYearsRemaining` và `walletBalance`.
Vé châu Âu là domain result, không phải giá trị mặc định của static club seed:
ở lại CLB thì server tính từ `standingResult` của `CareerSeason.runtimeState`, còn
chuyển CLB thì giữ ticket đã được transfer command cấp cho CLB đích. Thu nhập mùa
mới dùng ledger idempotency theo `(age, type)` để transfer completion và season
transition có thể retry mà không cộng lương/phí hai lần. FE chỉ thay state local
bằng response authoritative; không tự tính lại các projection này.

## 10. Reference data và scale

Reference data như clubs/leagues/opponents có thể cache vì ít thay đổi. Career truth không được cache như nguồn authoritative.

Các nguyên tắc hiện thực:

- không load full player aggregate cho command chỉ cần current progress;
- không rewrite toàn bộ statsTimeline/seasonHistory cho mỗi wheel;
- không gọi Prisma trong mỗi animation frame;
- tránh findMany toàn bộ clubs nếu query cần pagination/filter;
- search/filter CLB dùng server-side pagination và index phù hợp;
- transaction giữ ngắn;
- `lib/prisma.ts` hiện đặt bounded pool/timeout defaults: `PG_POOL_MAX`, `PG_CONNECTION_TIMEOUT_MS`, `PG_IDLE_TIMEOUT_MS`, `PG_STATEMENT_TIMEOUT_MS`, `PG_QUERY_TIMEOUT_MS`, `PG_IDLE_IN_TRANSACTION_TIMEOUT_MS`; giá trị production phải tune sau khi đo serverless concurrency và Supabase pooler;
- đo p50/p95/p99 action latency, DB query latency, connection usage, conflicts, retries và error rate.

Chưa có evidence để quyết định read replica, partitioning, sharding hoặc microservice. Các lựa chọn đó chỉ được xem xét sau khi có workload/metric và đã tối ưu schema/query/transaction cơ bản.

## 11. Migration plan: expand → backfill → cutover → contract

### Phase 0 — baseline và freeze semantics

- Chốt CareerStep, WheelType, SeasonStatus, Checkpoint contract.
- Ghi snapshot dữ liệu hiện tại và thống kê row/JSON size.
- Xác định guest/dev mode có được phép tồn tại hay không.
- Tạo migration tooling trong repo; không dùng schema thay đổi thủ công không có history.

### Phase 1 — additive schema

Thêm non-breaking:

- progress columns (currentAge, currentStep, currentWheel, checkpointVersion, timestamps);
- CareerSeason;
- WheelCheckpoint;
- CareerEvent;
- relational wallet/shop tables nếu đã chốt semantics.

Thêm indexes/constraints sau khi kiểm tra dữ liệu cũ vi phạm.

### Phase 2 — legacy cleanup / backfill decision

- Audit trước cleanup có 33 legacy players nhưng không có season/checkpoint/event rows để phục hồi lịch sử chính xác.
- Không backfill hoặc tự đoán outcome trong scope hiện tại. Audit mới nhất sau operator cleanup không còn CareerPlayer/season/checkpoint/event rows; agent không tự thực hiện lệnh xóa.
- Nếu giữ legacy rows, phải đánh dấu `legacy/unverified`, giới hạn compatibility path và theo dõi để retire.
- Không xóa JSON cũ của active V2 careers ở phase này.

### Phase 3 — server dual-read có kiểm soát

- đọc new tables làm source of truth cho progress mới;
- fallback old JSON chỉ cho legacy row chưa backfill;
- nếu tạm dual-write, phải ghi rõ source of truth, failure handling, retry và thời hạn loại bỏ;
- không để dual-write vô thời hạn.

### Phase 4 — checkpoint command cutover

- career wheel V2 và season-stats V2 đã chuyển từ full snapshot/client RNG sang command;
- server tự resolve/simulate outcome, ghi checkpoint/projection và trả authoritative response;
- FE chỉ map response vào target index, chạy animation/live label hiện tại và hydrate lại revision/runtime/checkpoints;
- Shop purchase V2, Transfer completion, transfer market/club search/negotiation và season-advance consumer đã nối command V2;
- embedded V2 flow không gọi old aggregate save; old save action vẫn tồn tại cho legacy compatibility và cần retire sau rollout.

### Phase 5 — contract cũ và cleanup

- xác nhận toàn bộ active careers đã migrate hoặc legacy rows đã được operator cleanup;
- stop old JSON writes;
- backup/verify trước khi drop hoặc archive fields cũ;
- migration cleanup chỉ sau khi old deployments không còn phụ thuộc.

## 12. PvP rollout prerequisites

Không bắt đầu PvP chỉ bằng cách đưa CareerPlayer JSON hiện tại vào trận đấu.

Prerequisites:

1. Classic checkpoint và server authority ổn định.
2. Player public snapshot immutable, có source revision và hash.
3. PvP server nhận snapshot ID, không tin stats từ client.
4. Squad submission có owner/eligibility/season lock rõ ràng.
5. Match command có idempotency key.
6. Match resolution chạy server-side.
7. PvP result không mutate ngược Classic career ngoài projection đã định nghĩa.
8. Có audit trail cho snapshot, submission và match result.
9. Có load/concurrency tests trước khi mở rộng traffic.

## 13. Observability và recovery

Mỗi checkpoint command nên có structured context:

- operation/command type;
- player/game identifier dạng phù hợp, không log secret;
- season/step/revision;
- checkpoint ID/idempotency key dạng có thể tra cứu nhưng không chứa dữ liệu nhạy cảm;
- duration và DB transaction result;
- error category;
- retry/conflict flag.

Metrics tối thiểu:

- checkpoint success/failure/conflict/replay;
- action latency p50/p95/p99;
- DB query latency và connection usage;
- rate-limit rejection;
- duplicate command count;
- migration/backfill progress;
- snapshot/PvP validation failures.

Implementation hiện tại có structured log JSON cho V2 command tại
`lib/observability/career-command-log.ts`. Log chỉ chứa bounded operational
context, không serialize payload, outcome, hidden stats hoặc wallet. Metrics
sink/alert, retention và dashboard production chưa được cấu hình trong repo;
đây là việc vận hành cần xác nhận theo deployment.

Implementation references:

- [Strict auth guards](D:/road-to-glory/lib/auth/guards.ts:12)
- [Checkpoint command contract](D:/road-to-glory/features/career/contracts/checkpoint.contract.ts:1)
- [Checkpoint transaction service](D:/road-to-glory/features/career/services/checkpoint.service.ts:164)
- [Server resolver adapter](D:/road-to-glory/features/career/services/server-wheel-resolver.service.ts:210)
- [Migration runbook](D:/road-to-glory/prisma/migrations/README.md:1)
- [Career command service](D:/road-to-glory/features/career/services/career-command.service.ts:1)
- [Season transition contract](D:/road-to-glory/features/career/contracts/season-transition.contract.ts:1)
- [Season transition service](D:/road-to-glory/features/career/services/season-transition.service.ts:1)
- [Persistence audit](D:/road-to-glory/scripts/career-persistence-audit.ts:1)
- [Legacy projection backfill](D:/road-to-glory/scripts/backfill-career-projection.ts:1)
- [Transfer authority contract](D:/road-to-glory/features/career/contracts/transfer-market.contract.ts:1)
- [Transfer authority service](D:/road-to-glory/features/career/services/transfer-market-authority.service.ts:1)

Backup/PITR, restore drill, RPO/RTO và production database topology hiện chưa được xác nhận trong repository. Không được tuyên bố production-ready nếu chưa kiểm tra các mục này với môi trường thật.

## 14. Acceptance criteria trước khi gọi là production-ready

### Correctness

- Refresh ở mọi step không làm mất checkpoint cuối.
- Double click/retry không tạo kết quả hoặc tiền duplicate.
- Request cũ bị conflict, không overwrite state mới.
- Season history cũ không bị placeholder ghi đè.
- Module navigation/load lại tiếp tục đúng step.

### Security

- Client sửa outcome/weights/stats trong payload không làm thay đổi server truth.
- Unauthorized user không đọc/ghi player khác.
- Hidden stats/seed không xuất hiện trong client bundle/DTO.
- Guest fallback bị tắt hoặc được giới hạn rõ trong production.

### Data/DB

- Migrations reproducible và test trên dữ liệu legacy.
- Critical invariants có DB constraint.
- Checkpoint/event/ledger có unique idempotency key.
- Query chính có indexes và query plan được kiểm tra.
- Backfill có progress, retry và reconciliation.

### BE–FE

- Client nhận authoritative DTO sau mutation.
- Conflict có recovery path.
- URL không tự quyết định state transition.
- Loading/error/pending state không làm mất user progress.

### Operations

- Có structured logs/metrics cho checkpoint.
- Có rate-limit config production.
- Có connection/pool configuration đã đo.
- Có backup/restore verification.

## 15. Những việc không được làm

- Không chỉ disable nút để gọi là security.
- Không để client gửi outcome, nextOvr, walletBalance hoặc full snapshot rồi server tin.
- Không chữa race condition bằng lock trong một Node process.
- Không thêm shard/microservice trước khi có workload evidence.
- Không drop JSON cũ trước khi backfill và compatibility rollout hoàn tất.
- Không dùng schema thay đổi thủ công như migration production.
- Không trả raw Prisma object hoặc hidden fields cho client.
- Không gọi một Server Action + DB write cho từng animation frame.

## 16. Change log

### 2026-09-02

- Ghi nhận target checkpoint per-wheel, server authority và anti-cheat boundary.
- Ghi nhận fact audit của schema hiện tại: JSON aggregate, thiếu progress/version/timestamps, không có Prisma migrations trong repo.
- Ghi nhận fact audit của server: auth không đồng nhất, checkpoint read-merge-update chưa transaction/CAS, payload progress chưa có Zod runtime parse đầy đủ.
- Định nghĩa target relational model cho season, wheel checkpoint, event, wallet/shop ledger và PvP snapshot.
- Định nghĩa BE–FE command/response contract, idempotency, conflict handling và migration expand/contract.
- Ghi rõ unknowns về traffic, latency, availability, backup và deployment topology; không tự suy diễn các con số này.
- Bắt đầu implementation: strict auth guard, V2 CareerPlayer projection, CareerSeason/WheelCheckpoint/CareerEvent và checkpoint transaction foundation.
- Đồng bộ strict auth cho create-session boundary và thêm smoke check tự động cho contract/server resolver foundation.
- Xác minh database hiện tại bằng diff chỉ đọc; thêm baseline/additive migration và runbook. Operator đã apply migration sau đó; `prisma migrate status` xác nhận schema up to date.
- Thêm migration `20260902000200_career_command_idempotency` và V2 Shop command; Shop consumer đã nối, UI/UX giữ nguyên. Operator đã deploy migration bổ sung và `prisma migrate status` báo schema up to date.
- Thêm season transition command V2 để chốt summary và advance/retire nguyên tử; FE đã gọi sau CTA Shop, UI/UX giữ nguyên.
- Nối FE career wheel V2, season-stats V2, Shop purchase V2, Transfer completion V2 và season transition V2 vào các command server-authoritative; giữ nguyên UI/UX, wheel animation, live label và gameplay flow.
- Xác nhận FE cutover là incremental: các command chính của Classic flow đã nối mà không đổi UI/UX; transfer market/negotiation đã server-authoritative, còn integration/concurrency test, observability, query/pool baseline, backup/restore và production rollout vẫn mở.

### 2026-09-03

- Xác nhận migration `20260902000200_career_command_idempotency` đã deploy và `prisma migrate status` báo schema up to date.
- Audit read-only sau operator cleanup ghi nhận `0` CareerPlayer, `0` CareerSeason, `0` WheelCheckpoint và `0` CareerEvent; không backfill hoặc suy đoán lịch sử 33 row cũ.
- Bổ sung HMAC setup token bind user/game/slot, server-only hidden stats, feature flag `CHECKPOINT_V2` cho career mới và legacy mutation fence.
- Bổ sung server-issued transfer offer validation trước transfer completion để client không thể tự dựng destination/terms hợp lệ.
- Bổ sung bounded structured command logs và cấu hình bounded Prisma pool/query/transaction timeout.
- Bổ sung security smoke check, database-copy integration/concurrency harness và audit `--baseline`; harness cố ý skip khi chưa có `CAREER_TEST_DATABASE_URL` cách ly.
- Classic V2 còn thiếu bằng chứng vận hành: query/load baseline, metrics sink/alert, backup/restore/PITR và rollout production. PvP deferred.
- Sửa regression refresh giữa League và FA Cup: hydrate `SeasonRecord` hiện tại từ public `runtimeState`, giữ result wheel League đã commit thay vì chỉ đọc `seasonHistory` đã đóng; thêm `season-record-hydration-check`.
- Sửa lỗi growth wheel lặp `selector → magnitude → selector` bị `CHECKPOINT_EXISTS`: unique checkpoint instance nay dùng thêm `revisionBefore`, cho phép mỗi lượt lặp có checkpoint riêng mà vẫn retry-idempotent; thêm migration `20260903000100_repeatable_wheel_checkpoints` và coverage trong integration harness.
- Sửa season projection sau Stay/Transfer: vé châu Âu tính từ standing runtime, wallet ghi lương/thu nhập theo ledger idempotent và contract giảm đúng boundary đóng mùa; thêm `season-projection-check` và không đổi UI/UX hoặc wheel flow.

### 2026-09-03 — Transfer authority/UI consistency

- Sửa server-issued offer validation cho proactive approach: input negotiation `approach` được đối chiếu với offer result kind `transfer`/`free_agent`; final wage option có thể thay đổi sau khi approach accepted nhưng vẫn phải thuộc cùng season/revision/club.
- Sửa FE Transfer để hiển thị annual wage nhất quán, phản ánh wage option đang chọn, bổ sung expected apps cho renewal và hiển thị kết quả lỗi ngay ở final negotiation.
- Sửa Transfer header dùng cùng canonical market-value calculation với server market context.
- Sửa career summary projection: season transition ghi tiếp `statsTimeline` theo từng tuổi, đóng active `clubStint` đúng tuổi vừa hoàn tất và giữ peak OVR persisted; career totals đọc từ `seasonHistory` thay vì cộng nhầm các snapshot thuộc tính.
- Retired read model/FE hydrate normalize lại stint boundary cũ từ season history để tương thích với row đã tạo bởi projection lỗi trước đây; thêm `check:career-summary`.
- Archive profile trên squad board đọc `seasonHistory` làm nguồn hiển thị cho toàn bộ mùa; legacy projection thiếu timeline được phục hồi OVR ở server read model từ `CareerSeason` summary/development delta, không expose runtime state và không mutate DB.

### 2026-09-04 — Transfer contract visibility và club wage quotes

- Transfer context hiển thị `contractYearsRemaining/contractYearsTotal` từ market snapshot authoritative.
- Annual wage quote của từng CLB nằm trong buying-power band hiện có; V2 ổn định theo player/season/club nhưng vẫn tạo khác biệt giữa các CLB, còn completion không tin terms từ client.
- Không thêm migration: schema hiện tại đã đủ vì salary band là domain rule derive từ prestige và league tier.
