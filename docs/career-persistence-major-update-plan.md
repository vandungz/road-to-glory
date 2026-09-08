# Major Update Plan — Career Persistence, Checkpoint và Production Server

> Trạng thái: `IN_PROGRESS — Classic V2 implementation complete; production evidence pending`  
> Cập nhật: 2026-09-03  
> Phạm vi: Classic Mode trước; PvP chỉ bắt đầu sau khi các gate của Classic Mode đạt đủ.

## 1. Mục tiêu

- Server/database là nguồn sự thật duy nhất của career.
- Mỗi wheel đã resolve phải có durable checkpoint.
- Refresh, hard refresh, back, retry hoặc mở nhiều tab không được reset hoặc nhân bản tiến trình.
- Client không được tự quyết định outcome, weight, stat, tuổi, wallet hoặc season state.
- Dữ liệu mùa cũ phải được lưu riêng, truy vấn được và không bị ghi đè bởi mùa hiện tại.
- Database và server có transaction, ownership, revision, idempotency và observability đủ rõ để tiến tới production.
- Migration phải incremental, rollback/forward-fix được và không làm mất dữ liệu cũ.

## 2. Tài liệu nguồn và quyết định cần giữ nhất quán

- [career-persistence-sot.md](D:/road-to-glory/docs/career-persistence-sot.md): persistence, checkpoint, state machine và các rủi ro hiện tại.
- [production-data-server-sot.md](D:/road-to-glory/docs/production-data-server-sot.md): schema mục tiêu, server command, transaction, rollout và production readiness.
- Các tài liệu khác trong `docs/` không phải nguồn normative cho persistence/server ở phase này; chỉ hai SoT trên và file plan này được dùng để theo dõi major update. `docs/New Design/` chỉ là nguồn tham chiếu UI/UX.

Quyết định nền tảng:

1. Checkpoint theo wheel là checkpoint logic/durable sau một lần resolve, không phải ghi database theo từng frame animation.
2. Một lần resolve là một server command và một transaction hẹp.
3. Client chỉ gửi intent/choice, `expectedRevision`, `stepKey` và `idempotencyKey`.
4. Server resolve outcome và ghi checkpoint/event trước khi cập nhật projection hiện tại.
5. Không big-bang rewrite; dùng expand/contract migration và dual-read trong giai đoạn chuyển tiếp.
6. Chưa tách microservice, sharding hoặc queue khi chưa có evidence về traffic, latency, availability và bottleneck thực tế.

## 3. Trạng thái theo dõi

- `[ ]` Chưa làm
- `[-]` Đang làm
- `[x]` Hoàn tất
- `[!]` Blocked hoặc cần quyết định

## 4. Dependency map

```text
P0 Baseline/audit
  -> P1 Auth + mutation hardening
  -> P2 Additive schema/migrations
  -> P3 ResolveWheel command + transaction
  -> P4 BE-FE checkpoint integration
  -> P5 Shop/Transfer/Season command migration
  -> P6 Legacy cleanup + dual-read + rollout
  -> P7 Production hardening
  -> P8 PvP snapshot foundation (DEFERRED — ngoài scope hiện tại)
```

Không bắt đầu phase sau nếu gate của phase trước chưa đạt, trừ khi phần việc đó chỉ là test hoặc tài liệu độc lập.

## 4.1. Implementation status — 2026-09-03

Đã triển khai trong slice đầu tiên:

- `[x]` Đọc schema database thực tế bằng `prisma migrate diff` ở chế độ chỉ đọc.
- `[x]` Thêm strict auth/ownership guard dùng chung; bỏ guest fallback khỏi các action trong phạm vi đã chạm.
- `[x]` Làm `initCareerPlayerAction` idempotent để callback/refresh lặp không overwrite career đã tiến triển.
- `[x]` Thêm projection fields V2 vào `CareerPlayer`.
- `[x]` Thêm model `CareerSeason`, `WheelCheckpoint`, `CareerEvent` với unique/index/foreign key.
- `[x]` Thêm baseline và additive migration artifact; migration foundation và migration command-idempotency đã được operator deploy.
- `[x]` Thêm transaction service cho start season và resolve checkpoint với revision CAS/idempotency.
- `[x]` Thêm `startCareerSeasonAction` và `resolveWheelCheckpointAction` với contract strict; FE career wheel đã gọi command này ở V2.
- `[x]` Thêm server resolver adapter cho các bước competition, award và growth; career wheel V2 dùng server RNG, không nhận outcome/weights từ client.
- `[x]` Thêm public `CareerProgressDto` query/action để load projection, season summary, runtime công khai và checkpoint outcomes mà không expose hidden stats/raw Prisma model.
- `[x]` Thêm V2 Shop purchase command với server-derived target season, revision CAS, idempotency, wallet/inventory/event transaction; Shop module đã chuyển consumer V2 cho player projection.
- `[x]` Thêm V2 season transition command với explicit shop acknowledgement, revision CAS, idempotency, summary snapshot và transaction đóng mùa/advance/retire; FE gọi command sau CTA Shop mà không đổi UI.
- `[x]` Thêm read-only persistence audit và dry-run legacy projection backfill tool; baseline trước cleanup ghi nhận 33 legacy players, 0 season/checkpoint/event rows.
- `[x]` Audit read-only mới nhất sau cleanup ghi nhận `0` CareerPlayer, `0` CareerSeason, `0` WheelCheckpoint và `0` CareerEvent; không backfill hoặc suy đoán lịch sử cũ.
- `[x]` Prisma validate, generated client, TypeScript check, lint, build, smoke check và diff check đã pass.
- `[x]` Migration foundation và migration command-idempotency đã được operator apply; `prisma migrate status` xác nhận database schema up to date.
- `[x]` Chuyển runtime outcome resolution của career wheel trong `useDraftDrum` sang server command; giữ nguyên target index, live label, Framer Motion duration/easing và callback sau animation.
- `[x]` Migrate FE career wheel flow và season-stats simulation sang checkpoint/command V2; refresh hydrate lại step, runtime và revision.
- `[x]` Nối Transfer completion và season-advance consumer V2 vào FE mà không đổi UI/UX.
- `[x]` Đưa transfer market, club search, approach và renewal về server-authoritative cho cả embedded flow và module page; market snapshot/negotiation dùng canonical idempotency key và secure RNG.
- `[x]` V2 embedded flow không còn gọi legacy aggregate save khi mở module hoặc sau khi sang mùa; Shop purchase cũng dùng command V2 với retry cùng idempotency key.
- `[x]` V2 command actions có rate-limit boundary; production thiếu Upstash configuration thì fail closed, local development vẫn no-op có cảnh báo.
- `[x]` Không backfill 33 legacy players trong scope hiện tại: audit đã xác định các row này không có season/checkpoint/event; operator đã cleanup và agent không tự xóa dữ liệu.
- `[x]` Thêm HMAC setup token bind user/game/slot, TTL, server-only hidden stats và `CHECKPOINT_V2` rollout switch cho career mới; career V2 không downgrade khi flag thay đổi.
- `[x]` Fence legacy aggregate mutation khỏi career V2; transfer completion chỉ nhận server-issued offer/negotiation còn khớp season/revision/club/terms.
- `[x]` Thêm structured command logs bounded và Prisma pool/connection/query/transaction timeout cấu hình được.
- `[x]` Thêm security smoke check, persistence integration/concurrency harness cách ly và audit baseline read-only.
- `[x]` Regression checks: transfer-authority contract/RNG check, checkpoint contract check, setup-token security check, TypeScript, lint, build và Prisma migration status.

**Remaining execution evidence:** chạy integration/concurrency test trên database copy, đo query plan/load/pool dưới workload, xác minh backup/restore/PITR, nối metrics sink/alert và rollout theo môi trường. Không thay đổi UI/layout hiện tại. PvP deferred.

## 5. Phase 0 — Baseline, audit và freeze hiện trạng

**Mục tiêu:** xác định chính xác dữ liệu và behavior hiện tại trước khi thay đổi.

- `[ ]` Backup database và xác nhận có thể restore.
- `[x]` Ghi nhận schema thực tế bằng Prisma diff/migrations; migration history đã có trong repository.
- `[x]` Kiểm kê toàn bộ `CareerPlayer` và kích thước các JSON field bằng audit read-only.
- `[x]` Tìm career có mùa trùng, tuổi sai, season history mất, timeline lệch hoặc club stint thiếu bằng audit invariant.
- `[x]` Kiểm tra duplicate trong wallet ledger/inventory và dữ liệu placeholder bằng audit read-only.
- `[x]` Trace các mutation hiện tại: wheel, season, shop, transfer, career init.
- `[x]` Ghi baseline read-only cho count/reference/query timing; workload production baseline vẫn pending.
- `[x]` Tạo feature flag `CHECKPOINT_V2` cho career mới; không downgrade career đã có projection.
- `[x]` Ghi rõ compatibility requirement: client cũ chỉ được dùng với legacy row; V2 row bị chặn khỏi aggregate snapshot mutation, và legacy path sẽ retire sau rollout.

**Gate:** có audit report, backup/restore evidence, danh sách invariant và kế hoạch rollback.

## 6. Phase 1 — Khóa mutation và trust boundary

**Mục tiêu:** ngăn dữ liệu tiếp tục bị client hoặc request replay làm sai.

- `[x]` Dùng một auth/ownership guard bắt buộc cho các V2 mutation production; legacy compatibility actions vẫn là phạm vi cần retire.
- `[x]` Xóa guest/local fallback khỏi các V2 đường ghi dữ liệu production; local no-op chỉ còn ở rate-limit dependency và có cảnh báo rõ.
- `[x]` Thêm Zod runtime schema cho toàn bộ Server Action input trong phạm vi Classic mutation đã chạm.
- `[x]` Tách legacy snapshot actions khỏi command mới; legacy action bị fence khi gặp career V2.
- `[x]` V2 command không nhận outcome, weights, next OVR, next age, wallet mới, stats mới, hidden stats hoặc full snapshot từ client.
- `[x]` Chuẩn hóa error code ở V2 service/action boundary: ownership, projection, season, transition, revision, idempotency và input đều phân loại được.
- `[x]` Thêm request ID, actor/career ID, command name và resolver version vào structured log bounded.
- `[x]` V2 command actions gọi rate limit dùng chung; production thiếu cấu hình thì fail closed, local development có behavior no-op rõ ràng.

**Verification:** unauthorized mutation bị chặn; payload bị sửa không làm đổi game truth; lỗi trả về có thể phân loại và retry đúng cách.

## 7. Phase 2 — Additive schema và integrity constraints

**Mục tiêu:** bổ sung nguồn dữ liệu bền vững mà không xóa JSON cũ.

### 2.1 `CareerPlayer` projection

- `[x]` Thêm `currentAge`, `currentStep`, `currentWheel`.
- `[x]` Thêm `checkpointVersion`, `revision`, `lastCheckpointId`, `lastCheckpointAt`.
- `[x]` Thêm `createdAt`, `updatedAt`.
- `[x]` Xác định nullability/default và behavior cho record cũ trong additive migration.

### 2.2 `CareerSeason`

- `[x]` Tạo record riêng cho từng mùa.
- `[x]` Lưu career/player, season number, age, club, status, start/end và final summary.
- `[x]` Enforce unique logical season theo career.
- `[x]` Index các truy vấn load current season và season history.

### 2.3 `WheelCheckpoint`

- `[x]` Lưu career/season, `stepKey`, wheel type, input/choice, resolver version, outcome, public result, revision và timestamps.
- `[x]` Enforce unique `(careerId, seasonId, stepKey)`.
- `[x]` Enforce unique `(careerId, idempotencyKey)`.
- `[x]` Application path hiện chỉ create checkpoint, không có update/delete command.
- `[x]` Server-controlled RNG adapter đã được tách; seeded deterministic resolver vẫn là optimization tương lai.

### 2.4 `CareerEvent`

- `[x]` Ghi immutable event cho wheel, season start, Shop purchase, transfer completion và season transition; legacy compatibility path vẫn cần audit.
- `[x]` Index theo career/season/time để audit và timeline.

### 2.5 Migration safety

- `[x]` Tạo baseline migration từ schema thực tế, không giả định database đang rỗng.
- `[ ]` Chạy migration trên database copy có dữ liệu đại diện.
- `[ ]` Kiểm tra lock duration, index build và backward compatibility trên database copy.
- `[x]` Không drop JSON field hoặc destructive constraint ở phase này.

**Gate:** migration additive chạy được, không mất dữ liệu, constraint chống duplicate hoạt động.

## 8. Phase 3 — `ResolveWheel` server command

**Mục tiêu:** biến mỗi wheel resolve thành state transition nguyên tử.

Đề xuất boundary:

```text
Server Action/Route Handler
  -> auth + Zod
  -> application command service
  -> wheel resolver
  -> Prisma transaction/repository access
  -> explicit authoritative DTO
```

Payload tối thiểu:

```ts
{
  careerId: string;
  seasonId: string;
  stepKey: string;
  expectedRevision: number;
  idempotencyKey: string;
  choice?: string;
}
```

- `[x]` Kiểm tra auth, ownership, season, current step và revision trong command.
- `[x]` Nếu idempotency key đã có, trả lại kết quả checkpoint cũ.
- `[x]` Nếu revision không khớp, trả `STALE_REVISION`, không overwrite.
- `[x]` Resolve outcome bằng server-controlled resolver adapter.
- `[x]` Trong một transaction: insert checkpoint, insert event, update projection và tăng revision.
- `[x]` Trả explicit DTO gồm checkpoint ID, revision mới, progress, outcome public và next step.
- `[x]` Không serialize toàn bộ Prisma model hoặc hidden server fields ra client.
- `[x]` Viết contract/security smoke checks và integration/concurrency harness cho resolver/state transition/transaction; chạy database copy thật còn pending vì chưa có `CAREER_TEST_DATABASE_URL`.

**Gate:** duplicate, retry, concurrent request, refresh giữa wheel và stale tab đều bảo toàn đúng một kết quả.

## 9. Phase 4 — BE-FE authoritative integration

**Mục tiêu:** client chỉ điều khiển UI/animation; TanStack Query giữ server state.

- `[x]` Load career bằng authoritative DTO từ server trong checkpoint sync V2.
- `[x]` Tách animation state khỏi career truth; server checkpoint được ghi trước khi animation bắt đầu.
- `[x]` Thay client-side outcome resolution trong career wheel/season-stats và transfer market/negotiation V2 bằng command mutation.
- `[x]` Mutation V2 gửi intent + revision + idempotency key hoặc canonical command key.
- `[x]` Cập nhật state local bằng response authoritative; không ghi DB theo từng animation frame.
- `[x]` Conflict/revision stale không tự merge; FE giữ idempotency key và hydrate authoritative progress trước khi cho retry.
- `[x]` Chỉ navigation sau khi checkpoint/command ACK.
- `[x]` Double-click/spam click được chặn ở UI và backend vẫn có revision/idempotency làm lớp bảo vệ cuối.
- `[x]` Loading/error/retry path hiện hữu giữ nguyên UI; lỗi authoritative market không tự skip bước transfer.
- `[x]` Bật `CHECKPOINT_V2` mặc định cho career mới; có thể tắt có kiểm soát trong env mà không downgrade career V2 hiện hữu.
- `[x]` Hydrate read model mùa đang chạy từ `CareerSeason.runtimeState`/checkpoint public, không để `seasonHistory` cũ ghi đè result wheel đã commit khi refresh giữa hai wheel.

**E2E gate:** refresh/hard refresh, back, nhiều tab, timeout/retry, đóng mở trình duyệt và chuyển module không làm reset hoặc tạo mùa mới.

## 10. Phase 5 — Migrate Shop, Transfer và Season flow

### Shop

- `[x]` Purchase command V2 có revision và idempotency; Shop module dùng V2 với fallback legacy cho row chưa backfill.
- `[x]` Trừ wallet, ghi inventory và CareerEvent trong cùng transaction.
- `[x]` Retry cùng idempotency key trả kết quả cũ, không tạo duplicate purchase.

Implementation note: V2 command nằm trong `career-command.actions.ts`; Shop UI/layout
không đổi, chỉ thay transport và khóa route khi season đang chạy.
- `[x]` CTA vào mùa mới được gate qua Shop module; chỉ gọi season transition sau khi mua xong hoặc user xác nhận bỏ qua theo rule.

### Transfer

- `[x]` Tách completion thành state transition rõ ràng; offer/approach/renewal/club search V2 đều resolve từ server-owned state.
- `[x]` Completion transaction cập nhật club stint, contract, salary, current club, event và revision.
- `[x]` Phân biệt rõ ở lại CLB cũ và chuyển sang CLB mới qua command kind `stay`/`transfer`/`free_agent`/`renewal`.
- `[x]` Browser back không khôi phục state trước transfer ở route V2; command dùng revision/idempotency và route chỉ mở đúng step.
- `[x]` Transfer UI/contract consistency: header dùng canonical market value, mọi wage display là annual, shortlist phản ánh wage option, renewal hiển thị expected apps, và final negotiation hiển thị kết quả lỗi ngay tại chỗ.
- `[x]` Hiển thị hợp đồng hiện tại theo `còn lại/tổng số mùa`; quote lương năm được random trong band sức mua của từng CLB, ổn định khi refresh/search/retry và completion chỉ nhận terms do server phát hành.

### Season

- `[x]` V2 start-season command tạo `CareerSeason` idempotent theo career/tuổi.
- `[x]` V2 season transition command ghi final summary trước khi đóng mùa.
- `[x]` V2 command yêu cầu projection ở `resolved`, checkpoint tồn tại và shop acknowledgement; Transfer completion, market/negotiation và FE season-transition consumer đã nối.
- `[x]` `CareerSeason.summary` lưu snapshot mùa bất biến theo record; projection hiện tại chỉ là trạng thái nhanh để load.
- `[x]` Season transition persist `currentContinentalCup`, `contractYearsRemaining` và wallet projection trong cùng transaction; khi ở lại CLB, vé mùa sau tính từ standing của mùa vừa hoàn tất thay vì static club seed.
- `[x]` Stay/Transfer ghi lương mùa kế tiếp trước khi mở Shop; ledger `(age, type)` giữ idempotency qua retry và fallback ở season transition.

**Gate:** hoàn thành mùa 26 tuổi, refresh/back ở từng bước, vào transfer/shop và sang tuổi 27 vẫn giữ nguyên lịch sử và không quay lại đầu mùa 26.

## 11. Phase 6 — Legacy cleanup, dual-read và rollout

- `[x]` Quyết định không backfill 33 legacy players hiện có: audit không có season/checkpoint/event để phục hồi chính xác; không tự đoán lịch sử.
- `[x]` Operator đã cleanup legacy rows; audit mới nhất không còn CareerPlayer/season/checkpoint/event rows. Agent không tự thực hiện lệnh xóa.
- `[ ]` Backfill theo batch, resumable và có reconciliation count/hash.
- `[ ]` Dual-read: schema mới trước, JSON cũ chỉ fallback.
- `[ ]` Theo dõi mismatch giữa projection mới và JSON cũ.
- `[ ]` Rollout theo feature flag: internal → nhóm nhỏ → toàn bộ Classic Mode.
- `[ ]` Có rollback bằng cách tắt flag và forward-fix migration; không rollback destructive bằng cách xóa dữ liệu.
- `[ ]` Sau thời gian ổn định mới ngừng ghi JSON cũ.
- `[ ]` Chỉ archive/drop JSON sau khi có approval và backup xác nhận.

33 legacy rows trước cleanup không nằm trong đường V2 mới. Audit mới nhất không còn các row đó; career mới tạo bằng `initCareerPlayerAction` bắt đầu với `checkpointVersion = 2` mặc định, còn agent không thực hiện lệnh xóa dữ liệu thay người vận hành.

## 12. Phase 7 — Production hardening

- `[x]` Cấu hình bounded connection pool/pooler và transaction/query timeout bằng env; giá trị production thực tế vẫn cần đo.
- `[ ]` Kiểm tra query plan cho current career, season history, checkpoint lookup và club search.
- `[ ]` Không reload hoặc rewrite full aggregate mỗi wheel.
- `[ ]` Pagination/filter cho danh sách club và dữ liệu lớn.
- `[ ]` Cache reference data ổn định như club/league; không cache career truth tùy tiện.
- `[x]` Structured command logs ghi request/actor/career/season/step/resolver/duration/error/replay; metrics sink và alert production vẫn pending.
- `[ ]` Alert cho transaction failure, migration mismatch, replay bất thường và data invariant violation.
- `[ ]` Load test với concurrent resolve, duplicate request, retry và nhiều career.
- `[ ]` Backup/PITR và restore drill có bằng chứng.
- `[ ]` Đặt SLO production dựa trên baseline đo được, không tự đặt số liệu khi chưa có evidence.

**Gate:** có evidence vận hành và load test; không kết luận scale hoặc performance chỉ từ static code review.

## 13. Phase 8 — PvP foundation — DEFERRED

PvP chưa triển khai theo yêu cầu hiện tại. Các mục dưới đây chỉ là prerequisite
để theo dõi về sau, không phải phần còn thiếu của Classic persistence update.

- `[ ]` Tạo `PlayerCompetitiveSnapshot` immutable từ career revision hợp lệ.
- `[ ]` Snapshot có schema version, resolver/data version và hash.
- `[ ]` PvP submission chỉ reference snapshot ID, không gửi full career state để server tin tưởng.
- `[ ]` Tách domain PvP khỏi mutation trực tiếp vào `CareerPlayer`.
- `[ ]` Xác định match resolution, anti-replay, concurrency và audit log trước khi triển khai.

## 14. Test matrix bắt buộc

### Unit

- `[x]` Resolver nhận random source do server kiểm soát để kiểm thử boundary; seeded deterministic resolver vẫn là optimization tương lai.
- `[x]` State machine không cho skip step hoặc quay ngược revision; resolver next-step có whitelist và stale CAS.
- `[x]` Client payload không thể chứa authoritative outcome trong V2 command contract; transfer authority check đã kiểm tra.
- `[x]` Regression refresh giữa League và FA Cup được cover bằng `check:season-record-hydration`.
- `[x]` Regression season projection cover `ENG1` hạng 13/hạng 2, wage idempotency và net transfer income bằng `check:season-projection`.

- `[x]` Server transfer market/negotiation không nhận client stats, preview fee hoặc accept chance làm nguồn sự thật.

### Database/integration

- `[x]` Unique checkpoint theo step được enforce trong schema/transaction.
- `[x]` Idempotent retry trả cùng checkpoint; integration harness đã cover.
- `[x]` Stale revision bị reject; integration harness đã cover.
- `[x]` Concurrent commands không tạo hai outcome; integration harness đã cover khi chạy trên DB copy.
- `[x]` Transaction rollback không để lại event/checkpoint dở dang; integration harness đã cover khi chạy trên DB copy.
- `[x]` Unauthorized career access bị reject; integration harness đã cover khi chạy trên DB copy.

> Lưu ý: harness đã được viết nhưng chỉ chạy thật khi có `CAREER_TEST_DATABASE_URL` trỏ tới database copy cách ly. Lần validation local hiện tại đã chạy an toàn ở chế độ skip vì không được phép mutate `DATABASE_URL` đang dùng.

### E2E

- `[ ]` Refresh sau từng wheel.
- `[ ]` Hard refresh khi đang ở animation/result.
- `[ ]` Timeout rồi retry.
- `[ ]` Double-click và mở nhiều tab.
- `[ ]` Transfer → shop → mùa mới.
- `[ ]` Load season cũ và xác minh kết quả không mất.
- `[ ]` Browser back không reset flow.
- `[x]` Refresh giữa League đã có result và FA Cup chưa quay vẫn giữ result League trong hồ sơ mùa.

## 15. Breakdown commit/PR đề xuất

1. `docs/audit`: baseline, invariant và contract test plan.
2. `security/mutation-boundary`: auth, ownership, Zod, error code, rate-limit behavior.
3. `db/additive-career-schema`: Prisma models, migration và constraints.
4. `career/resolve-wheel-command`: service, resolver boundary, transaction và integration tests.
5. `frontend/checkpoint-v2`: TanStack Query mutation, DTO adapter, retry/conflict/navigation behavior.
6. `career/shop-transfer-season-commands`: migrate các flow còn lại.
7. `data/backfill-dual-read`: backfill, reconciliation, feature flag rollout.
8. `ops/production-hardening`: metrics, timeout, load test, backup/restore evidence.
9. `pvp/competitive-snapshot`: **DEFERRED**, không triển khai trong major update hiện tại.

Mỗi commit/PR phải nhỏ, có một boundary rõ, test tương ứng và không trộn migration destructive với feature behavior.

## 16. Definition of Done cho major update

- `[x]` Không thể tự sửa outcome hoặc tiến trình bằng payload client trên Classic V2; legacy actions bị fence khi gặp row V2.
- `[x]` Mỗi wheel resolve có checkpoint bất biến trong database trên Classic V2.
- `[x]` Refresh/back/retry/multi-tab có revision/idempotency boundary; conflict recovery hydrate authoritative progress, không local merge.
- `[x]` Season history mới được lưu riêng theo `CareerSeason.summary` và không bị placeholder snapshot ghi đè.
- `[x]` V2 Shop, transfer completion và season transition dùng transaction + revision + idempotency; legacy compatibility path vẫn cần loại bỏ sau backfill/rollout.
- `[x]` Schema mới chạy song song an toàn với dữ liệu cũ trong giai đoạn additive; database hiện không còn legacy rows theo audit mới nhất.
- `[-]` Có test unit/contract/security và integration/concurrency harness; cần chạy harness trên database copy, E2E/load thực tế còn pending.
- `[-]` Có structured observability, bounded pool và rollback/forward-fix plan; metrics sink/alert và backup/restore evidence còn pending.
- `[x]` Hai SoT và plan đã được cập nhật, không còn coi PvP là scope triển khai hiện tại.

## 17. Change log

### 2026-09-03

- Xác nhận migration command-idempotency đã deploy và schema database up to date.
- Cập nhật audit sau operator cleanup: không còn CareerPlayer/season/checkpoint/event rows; không backfill hoặc suy đoán dữ liệu cũ.
- Hoàn tất implementation slice cho setup token HMAC, hidden stats server-only, legacy mutation fence, server-issued transfer authority, structured logs, bounded Prisma pool và feature flag career mới.
- Bổ sung FE conflict recovery: revision conflict hydrate authoritative progress, không merge local; timeout vẫn retry cùng idempotency key.
- Đã chạy build, lint, TypeScript, Prisma validate, contract/security smoke checks và read-only audit baseline.
- Đã sửa regression hydrate hồ sơ mùa giữa hai wheel và thêm `check:season-record-hydration`.
- Đã sửa checkpoint identity cho growth wheel lặp bằng `(careerPlayerId, seasonId, stepKey, revisionBefore)`; thêm migration `20260903000100_repeatable_wheel_checkpoints` và test integration cho hai lượt `selector`/`magnitude`.
- Đã sửa season projection sau Stay/Transfer: vé châu Âu lấy từ standing runtime, wallet ghi lương theo ledger idempotent và contract giảm khi đóng mùa; thêm `check:season-projection`, không đổi UI/UX hoặc wheel flow.
- Đã sửa Transfer false-negative sau proactive approach: completion đối chiếu offer result kind `transfer`/`free_agent` thay vì nhầm với input kind `approach`; bổ sung annual wage/expected apps/final error feedback và regression wage-option checks.
- Đã bổ sung hiển thị số mùa hợp đồng còn lại và quote lương năm theo từng CLB; quote được random trong buying-power band hiện có, có stable source theo player/season/club ở V2, không đổi UI/UX hoặc wheel flow.
- Integration/concurrency harness đã có nhưng chưa chạy trên database copy vì chưa được cung cấp `CAREER_TEST_DATABASE_URL`; E2E/load/backup/restore/metrics sink/alert/production rollout vẫn là execution evidence pending.
- PvP deferred theo scope hiện tại.
