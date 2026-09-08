# Football Life — SoT: Lưu, Load và Checkpoint sự nghiệp

> Trạng thái: **Current implementation / Classic V2 đã nối, còn bằng chứng vận hành production**
> Ngày ghi nhận: **2026-09-03**
> Phạm vi: career player, draft/wheel, season progression, Shop, Transfer, resume sau refresh.

> **Revision 2026-09-03:** checkpoint bền vững cho **mỗi wheel đã resolve** đã được nối vào career wheel V2 và season-stats V2. UI/UX, animation, live label và flow hiển thị của wheel không thay đổi. Setup token ký HMAC, hidden stats server-only, server-issued transfer offer, legacy mutation fence, structured command logs và pool/query timeout đã được bổ sung. Phần còn lại là bằng chứng integration trên database copy, load/backup/restore và rollout production.

## 1. Mục đích của tài liệu

Tài liệu này là nguồn sự thật hiện tại cho cách game lưu, load và checkpoint dữ liệu sự nghiệp.

Mọi thay đổi sau này cần phân biệt rõ:

- **Current**: code đang thực sự chạy.
- **Decision**: rule đã thống nhất cần giữ.
- **Target**: kiến trúc mong muốn nhưng chưa hoàn tất.
- **Open issue**: rủi ro hoặc câu hỏi chưa được giải quyết.

Không được coi một field chỉ tồn tại trong React state là dữ liệu đã được lưu bền vững.

## 2. Kết luận cấp cao

Hệ thống hiện tại là mô hình:

```text
Client React working state
        +
Server DB season checkpoint
        +
Module navigation checkpoint trước khi unmount
```

Đây **chưa phải** hệ thống server-authoritative hoặc event-sourced hoàn chỉnh.

Career truth hiện được giữ trong bảng `CareerPlayer`, nhưng trong lúc người chơi đang thao tác, phần lớn state vẫn nằm trong các React hook. Vì vậy dữ liệu chỉ an toàn sau khi đã đi qua một checkpoint server.

### Decision mới: checkpoint theo từng wheel

Mỗi wheel đã resolve phải tạo một checkpoint durable và không thể thực thi lại thành một kết quả khác. Checkpoint theo wheel không có nghĩa là mỗi lần phải rewrite toàn bộ `CareerPlayer` JSON; mục tiêu là một transaction nhỏ, có thứ tự bước, version và record immutable cho wheel đó.

Client chỉ được gửi **ý định hợp lệ** và context/version hiện tại. Client không được quyết định outcome, weight, delta chỉ số, tiền thưởng hoặc state transition cuối cùng.

Đối với legacy flow chưa chuyển, hệ thống vẫn chỉ đạt mức bảo vệ một phần: refresh sau season checkpoint được xử lý tốt hơn, nhưng người dùng có thể sửa payload/action ở browser nếu server vẫn tin dữ liệu client gửi. Career wheel, season-stats, Shop, transfer completion, transfer market/club search/negotiation và season transition V2 đã có boundary server-authoritative riêng; legacy compatibility actions vẫn cần retire sau rollout.

### 2.1. Implementation slice hiện tại

- `CareerPlayer` đã có các projection field V2: `currentAge`, `currentStep`, `currentWheel`, `checkpointVersion`, `revision` và timestamps.
- Đã thêm model immutable nền tảng: `CareerSeason`, `WheelCheckpoint`, `CareerEvent`.
- Đã thêm baseline migration và additive migration; operator đã apply migration foundation và kiểm tra status.
- `initCareerPlayerAction` đã idempotent ở đường khởi tạo: callback/refresh lặp không overwrite career đã tiến triển.
- Auth boundary của `player.actions` và các action trong `season.actions` đã chuyển sang strict guard dùng chung.
- Auth boundary của `createGameSession` cũng dùng guard chung; không còn comment/nhánh guest fallback ở điểm tạo session.
- Đã có server action/service cho start season và resolve checkpoint với ownership, current step, revision CAS, idempotency và transaction.
- Career wheel V2 trong `useDraftDrum` đã gọi `resolveWheelCheckpointAction`; server trả outcome/target context, client chỉ map outcome đó vào target index rồi chạy animation hiện tại.
- Trong lúc wheel quay, client chỉ giữ animation/working state; không gọi DB theo từng frame và không tự resolve lại kết quả. Server checkpoint được ghi trước khi animation bắt đầu.
- Server resolver V2 dùng secure random source và cập nhật stat growth authoritative cho wheel tăng trưởng; season-stats V2 mô phỏng và lưu kết quả mùa bằng transaction riêng.
- Migration foundation và `20260902000200_career_command_idempotency` đã được operator apply; `prisma migrate status` xác nhận schema up to date.
- Đã có public `CareerProgressDto` query/action cho projection + season/checkpoint read model; hook FE hydrate lại revision, step, runtime và checkpoint outcomes mà không expose hidden state.
- Shop module đã chuyển consumer V2 cho player projection, giữ nguyên UI/layout; route bị khóa khi season đang chạy và chỉ mở ở các trạng thái flow hợp lệ.
- Đã thêm server-side season transition command: yêu cầu transfer đã resolve, shop acknowledgement rõ ràng (`completed` hoặc `skipped`), revision/idempotency và transaction; command lưu `CareerSeason.summary` trước khi sang tuổi mới hoặc retired.
- Read-only audit trước cleanup ghi nhận 33 legacy players, 0 season/checkpoint/event rows; dry-run chỉ xác định được projection tối thiểu, không thể phục hồi chính xác lịch sử wheel.
- Sau migration và cleanup do operator thực hiện, audit mới nhất ghi nhận `0` CareerPlayer, `0` CareerSeason, `0` WheelCheckpoint và `0` CareerEvent; agent không tự thực hiện lệnh xóa.
- Scope hiện tại không backfill lịch sử legacy; không được suy đoán hoặc tuyên bố phục hồi 33 career cũ.
- FE đã gọi Transfer completion V2 khi chốt offer/ở lại, transfer market/club search/negotiation server-authoritative và gọi season transition V2 sau CTA Shop; UI/layout/flow nhìn thấy không đổi. Legacy actions chỉ còn compatibility path cho row chưa ở V2.
- Embedded V2 flow không gọi legacy aggregate save khi mở module hoặc sau khi đổi mùa; Shop purchase retry dùng cùng idempotency key.
- Các V2 command action đều đi qua rate-limit boundary dùng Upstash; production thiếu cấu hình sẽ fail closed, local development no-op có cảnh báo.
- Career setup được ký bằng `CAREER_SETUP_TOKEN_SECRET`, bind với user/game/slot và hết hạn; `initCareerPlayerAction` bỏ qua mọi `hiddenStats`/snapshot do client gửi và tự sinh hidden stats server-side. Career V2 hiện không round-trip hidden stats qua browser.
- Legacy aggregate save/progress/transfer/shop mutations bị chặn khi gặp row V2; V2 career không thể quay lại đường ghi snapshot cũ.
- Transfer completion V2 chỉ nhận market offer/negotiation đã được server phát hành và còn khớp season/revision/club/terms; client không thể tự dựng destination hợp lệ.
- Transfer header và market context dùng cùng công thức `computeMarketValue` với snapshot chỉ số/match rating hiện tại; không hiển thị lại `CareerPlayer.marketValue` cũ làm lệch giá trị.
- Archive profile đọc `seasonHistory` để materialize đủ từng mùa cho tổng apps/goals/assists, match rating và club journey; career cũ bị thiếu timeline còn được phục hồi OVR ở read model từ `CareerSeason.summary` và development delta đã lưu, không ghi đè DB.
- Offer Transfer hiển thị lương hàng năm. Quote lương được sinh trong buying-power band của từng CLB, có spread ngẫu nhiên quanh mức phù hợp với player; V2 giữ quote ổn định theo `(player, season, club)` để refresh/search/retry không làm đổi offer. Ở luồng chủ động, lựa chọn lương được dùng server-side để tính xác suất và giá offer; bước chốt cuối có thể chọn lại mức lương, và lỗi commit phải hiển thị ngay trên màn hình chốt.
- Khi kiểm tra completion, offer approach được đối chiếu với kind kết quả thật (`transfer`/`free_agent`), không đối chiếu nhầm với input kind `approach`; accepted negotiation vẫn hợp lệ khi đổi wage option ở bước cuối.
- V2 command actions phát structured JSON logs bounded (request/actor/career/season/step/resolver/duration/error/replay) và Prisma pool có giới hạn/timeout qua `PG_POOL_MAX`, `PG_CONNECTION_TIMEOUT_MS`, `PG_IDLE_TIMEOUT_MS`, `PG_STATEMENT_TIMEOUT_MS`, `PG_QUERY_TIMEOUT_MS`, `PG_IDLE_IN_TRANSACTION_TIMEOUT_MS`.
- Có security smoke check và integration/concurrency harness; integration harness mặc định skip nếu không có `CAREER_TEST_DATABASE_URL` để tránh ghi vào database đang dùng.

## 3. Nguồn dữ liệu và quyền sở hữu state

### 3.1. Server DB — nguồn sự thật sau refresh

Bảng `CareerPlayer` lưu các nhóm dữ liệu sau:

| Field | Vai trò |
|---|---|
| `statsTimeline` | Snapshot chỉ số theo tuổi/mùa |
| `clubStints` | Lịch sử các CLB |
| `seasonHistory` | Kết quả từng mùa, dạng `Record<age, SeasonRecord>` |
| `achievements` | Danh hiệu và giải thưởng tích lũy |
| `events` | Career events; hiện chưa được dùng đầy đủ cho từng wheel outcome |
| `hiddenStats` | Hidden stats, chỉ giữ ở server |
| `walletBalance` | Số dư tiền hiện tại |
| `walletLedger` | Ledger tiền theo mùa và loại giao dịch |
| `shopInventory` | Vật phẩm Shop, mùa áp dụng và trạng thái consumed |
| `contractYears...` | Dữ liệu hợp đồng |
| `currentWageAnnual` | Lương hiện tại |
| `marketValue` | Giá trị thị trường |
| `currentContinentalCup` | Cúp châu lục hiện tại |
| `isUnemployed` | Trạng thái không có CLB |
| `isRetired` | Đã giải nghệ hay chưa |
| `currentAge/currentStep/currentWheel` | Projection tiến trình V2; nullable cho row legacy trong giai đoạn backfill |
| `revision/checkpointVersion` | Optimistic concurrency và version của checkpoint contract |
| `lastCheckpoint...` | Con trỏ audit tới checkpoint gần nhất |

Các record bền vững V2 được tách thêm thành `CareerSeason`, `WheelCheckpoint` và `CareerEvent`. JSON aggregate cũ vẫn được giữ trong giai đoạn dual-read/backfill.

Schema hiện tại: `prisma/schema.prisma`, model `CareerPlayer`.

### 3.2. Client React — working state tạm thời

`useDraftDrum` kết hợp các hook như `useCareerStats`, `useSetupStage` và các state của wheel để giữ:

- wheel đang ở bước nào;
- các outcome vừa quay;
- kết quả mùa hiện tại;
- `careerSubStep`;
- modal/module đang mở;
- snapshot mới nhất chuẩn bị gửi lên server.

Các state này bị hủy khi component unmount. Nếu chưa checkpoint, refresh hoặc full navigation có thể làm mất chúng.

Zustand chỉ nên giữ UI state; không phải nguồn sự thật cho career data.

## 4. Rule load/resume hiện tại

### 4.1. Tìm player cần resume

Trang draft server-side tìm player theo:

```text
gameSessionId + slotIndex + isRetired = false
```

Nếu tìm thấy, page truyền `savedPlayerId` vào `DraftDrumScreen`.

Nguồn code chính:

- `app/(game)/classic/[gameId]/draft/[slotIndex]/page.tsx`
- `actions/player.actions.ts -> getCareerPlayerAction`

### 4.2. Hydrate client

Khi mount, `useDraftDrum` gọi `getCareerPlayerAction` để lấy player legacy/identity và gọi thêm `getCareerProgressAction` cho player V2. V2 hydrate khôi phục:

- `currentAge`, `currentStep`, `currentWheel`, `revision` và `checkpointVersion`;
- runtime công khai của mùa đang chạy;
- danh sách checkpoint/outcome đã commit để không quay lại wheel cũ.

Các dữ liệu career/read model còn lại được hydrate từ player action:

- player identity;
- `statsTimeline`;
- `clubStints`;
- `seasonHistory`;
- achievements;
- contract/wage/market value;
- current club và continental cup;
- wallet, influence và shop inventory;
- tuổi hiện tại từ projection V2; legacy fallback vẫn lấy từ snapshot cuối của `statsTimeline`.

Với row legacy chưa backfill, rule fallback là:

```text
currentAge = statsTimeline.at(-1).age
```

Đây là compatibility path, không phải nguồn ưu tiên của career V2.

### 4.3. Không có player đã lưu

Nếu không có `savedPlayerId`, game ở setup mode. Khi draft hoàn thành, `startPlayerCareerAction` tính dữ liệu khởi tạo, sau đó `initCareerPlayerAction` tạo/upsert `CareerPlayer` ban đầu.

## 5. Rule checkpoint hiện tại

### 5.1. Khởi tạo career

Checkpoint đầu tiên xảy ra khi bắt đầu sự nghiệp:

```text
Draft hoàn tất
    -> startPlayerCareerAction
    -> initCareerPlayerAction
    -> tạo CareerPlayer trong DB
```

Tại thời điểm này lưu initial timeline, initial club stint, hidden stats, contract và các dữ liệu khởi đầu.

### 5.2. Trong một mùa giải

Legacy flow vẫn có thể giữ wheel outcome trong client state cho đến save mùa. Career wheel và season-stats V2 đã chuyển sang server command:

```text
FE gửi intent + expectedRevision + idempotencyKey
    -> server resolve/simulate bằng state và RNG server
    -> transaction ghi checkpoint/event/projection
    -> trả authoritative outcome/runtime/revision
    -> FE chạy animation hiện tại và cập nhật working state
```

Với V2, client không gửi outcome, weights, stat delta hoặc full snapshot. Animation chỉ là presentation; database checkpoint đã tồn tại trước khi wheel bắt đầu quay.

Khi hoàn tất mùa, `finalizeSeasonRecord()` chốt vào `seasonRecords` ở client trước khi tăng tuổi. Nó cập nhật các nhóm như:

- standing;
- domestic/continental result;
- national team result;
- apps, goals, assists, clean sheets;
- match rating và competition stats;
- Ballon d'Or result.

Trong legacy, đây mới là bước commit vào working state và chưa đồng nghĩa với commit DB. Trong V2, season-stats command đã commit kết quả mô phỏng vào projection/runtime; season transition command chốt summary và chuyển tuổi/retire sau khi Shop đã được xác nhận.

### 5.3. Chuyển sang mùa tiếp theo

Khi `currentAge` tăng:

1. timeline được thêm snapshot của tuổi mới;
2. season state cũ được reset để bắt đầu mùa mới;
3. effect theo dõi thay đổi tuổi lấy snapshot mới nhất;
4. `updateSeasonProgressAction` được gọi để checkpoint server.

Legacy background save có serializer:

- chỉ một request save chạy tại một thời điểm;
- request mới trong lúc request cũ chạy sẽ đánh dấu `pending`;
- sau khi request cũ xong, gửi snapshot mới nhất;
- tránh network jitter làm request cũ ghi sau request mới.

Career V2 không dùng background save làm commit chính cho wheel. `revision`/CAS và idempotency của command là cơ chế chống stale write/duplicate; FE gọi season transition V2 sau CTA Shop, nên refresh/back không tự tăng tuổi hoặc tạo mùa mới.

### 5.4. Rời sang Shop hoặc Transfer

Đây là checkpoint bắt buộc quan trọng nhất sau các bug trước đây.

Nếu mùa đã hoàn tất và người chơi mở Shop/Transfer:

```text
Mùa đã resolve
    -> persistCurrentProgress()
    -> updateSeasonProgressAction()
    -> chỉ khi save thành công mới router.push() sang module
```

Lý do: Shop và Transfer là page/module riêng, làm draft component unmount. Nếu chuyển trang trước khi save, kết quả mùa chỉ nằm trong React state sẽ bị mất.

Shop module V2 đã dùng purchase command server-authoritative cho row có projection V2, giữ nguyên UI/layout. Route bị khóa khi season đang chạy; chỉ cho mở ở các trạng thái chuẩn bị/transfer/resolved được phép. Shop sau khi mùa resolve không dựa vào full client snapshot.

Transfer completion V2 đã được gọi từ FE cho accept/reject/stay/renewal và cập nhật club stint, contract, salary, revision trong transaction. Market snapshot, club search, approach và renewal V2 đều nhận context từ server; client chỉ gửi intent/choice. Legacy transfer actions vẫn tồn tại cho row chưa ở V2 và cần retire sau rollout.

### 5.5. Quay lại từ Shop/Transfer

Module quay về draft bằng query action (`shopReturn` hoặc `transferReturn`). Query được consume rồi xóa bằng `window.history.replaceState` để refresh không replay lại action.

Rule hiện tại:

- `start`: bắt đầu mùa hiện tại sau khi quay lại module;
- `advance`: tăng sang mùa tiếp theo sau khi quay lại module;
- callback `advance` sau hydrate được cho phép chạy một lần từ trạng thái `idle`.

Mục tiêu của rule này là không để refresh làm tăng tuổi lần nữa, nhưng vẫn cho CTA sau Shop/Transfer tiếp tục đúng flow.

### 5.6. Retirement

Khi career kết thúc, `saveCareerPlayer` lưu snapshot cuối, tính lại peak OVR/influence và đánh dấu:

```text
isRetired = true
```

Sau đó player không còn được chọn làm player đang chơi của draft nữa.

### 5.7. Checkpoint per wheel — rule và implementation V2

Đây là rule bắt buộc cho bản nâng cấp persistence/security:

```text
Load server progress
    -> client gửi wheel command + expected revision + idempotency key
    -> server kiểm tra auth, ownership, current step và revision
    -> server tự resolve hoặc verify outcome từ server-controlled seed
    -> transaction ghi immutable wheel checkpoint
    -> transaction cập nhật current progress/projection
    -> trả authoritative state + revision mới
    -> client render state server trả về
```

Implementation hiện tại áp dụng cho career wheel và season-stats V2. FE vẫn dùng đúng SpinnerWheel/Framer Motion, live label, target index và callback cũ; khác biệt kỹ thuật là FE nhận kết quả authoritative trước khi bắt đầu animation. Không có DB write theo từng frame.

Các nguyên tắc:

- Một wheel chỉ được commit một lần theo logical key, ví dụ `player + season + sequence`.
- Retry cùng idempotency key phải trả lại kết quả đã commit, không resolve lại.
- Request có revision cũ phải trả `CONFLICT`, không được âm thầm merge thành kết quả mới.
- Server không nhận `outcome`/`weights`/`nextOvr` từ client như dữ liệu có thẩm quyền.
- Nếu wheel có lựa chọn người chơi, client chỉ gửi lựa chọn; server kiểm tra lựa chọn đó có nằm trong step hiện tại hay không.
- Kết quả và state transition phải được ghi trong cùng transaction.
- Refresh phải load lại `currentAge`, `currentStep`, `currentWheel` và revision từ server, không suy luận chỉ từ URL hoặc React state.
- Full season snapshot vẫn có thể dùng cho read model/cache, nhưng không phải nguồn audit duy nhất.

### 5.8. Phân biệt checkpoint logic và round-trip

Yêu cầu checkpoint mỗi wheel là yêu cầu về **durability và integrity**, không phải lý do để gửi toàn bộ career state qua mạng ở mỗi animation frame.

Target cần tối ưu bằng:

- một command ngắn cho mỗi wheel đã resolve;
- một transaction ngắn, chỉ update aggregate/projection cần thiết;
- payload giới hạn kích thước;
- reference data được cache;
- không gọi DB trong lúc animation đang chạy;
- không dùng client snapshot lớn làm request payload mặc định.

Nếu benchmark production cho thấy số write per-wheel không đạt, phải tối ưu transaction/schema/connection trước khi hy sinh tính đúng đắn. Không được quay lại mô hình tin client chỉ vì giảm RTT.

## 6. Rule server-side của `updateSeasonProgressAction`

Action hiện tại ở `actions/season.actions.ts` thực hiện các bước sau:

### 6.1. Authorization

- lấy Supabase user;
- kiểm tra rate limit;
- kiểm tra player thuộc game session của user;
- từ chối request không hợp lệ.

### 6.2. Chống request cũ ghi đè tuổi mới

Server lấy tuổi cuối từ timeline đang lưu:

```text
persistedCurrentAge = persistedTimeline.at(-1).age
```

Nếu `currentAge` từ client thấp hơn tuổi đã lưu, request bị bỏ qua và trả về dữ liệu wallet/influence/inventory hiện tại.

Đây là app-level stale-age guard, chưa phải optimistic locking thực sự.

### 6.3. Merge season history

`seasonHistory` incoming không thay thế mù toàn bộ dữ liệu DB. Server merge theo age.

Các nested object như continental cup và national team được merge riêng để giảm nguy cơ snapshot cũ xóa một phần kết quả đã có.

### 6.4. Merge timeline và club stints

- `statsTimeline` merge theo `snapshot.age`;
- `clubStints` merge theo `${clubId}:${startAge}`;
- cả hai được sort lại theo tuổi.

### 6.5. Wallet

Server tự tính income từ lương và transfer fee. Client không được quyết định trực tiếp số tiền được cộng.

Ledger entry được nhận diện bằng:

```text
age + type
```

Nếu entry đã tồn tại thì không cộng lại. Mục tiêu là retry/refresh không tạo duplicate income.

### 6.6. Influence và Shop inventory

- `influenceScore` được derive lại tại checkpoint từ dữ liệu career;
- shop item được đánh dấu `consumed` khi checkpoint nhận thấy mùa áp dụng đã đi qua;
- inventory hiện tại của Shop được giữ server-side.

### 6.7. Security audit của code hiện tại

Các fact sau được xác nhận từ code hiện tại:

- Legacy path trong `lib/wheel-engine/spin-resolver.ts` gọi `Math.random()` trong runtime client flow; kết quả legacy wheel có thể bị can thiệp ở browser. Career wheel V2 không dùng path này để chọn outcome.
- `updateSeasonProgressAction` nhận một `interface SeasonProgressUpdate`, nhưng không parse payload bằng Zod runtime trước khi xử lý.
- `updateSeasonProgressAction` nhận `statsTimeline`, `seasonHistory`, `currentAge` và các giá trị career quan trọng từ client; stale-age guard chỉ chặn tuổi thấp hơn, không chứng minh outcome hợp lệ.
- Một số action tính toán dùng `requireAuth()` đang cho phép no-op khi không có session. `verifyGameOwnership()` trong `season.actions.ts` cũng có nhánh cho guest/local mode; vì vậy không được coi mọi mutation hiện tại đã có cùng mức authorization.
- `completeTransferAction` cập nhật `CareerPlayer` bằng một update đơn lẻ, chưa có explicit revision/idempotency precondition.
- `initCareerPlayerAction` nhận setup token đã ký và tự sinh `hiddenStats` ở server; field `hiddenStats` còn được schema chấp nhận tạm thời cho caller cũ nhưng bị bỏ qua hoàn toàn. Legacy rows/actions còn tồn tại về mặt code nên cần tiếp tục retire sau rollout.
- Legacy `events` là JSON field nhưng chưa phải immutable wheel audit log và chưa được ghi bắt buộc trước mỗi state mutation; V2 wheel checkpoint có `WheelCheckpoint`/`CareerEvent` riêng.

Kết luận security hiện tại: Zod range checks, Supabase session và ownership checks là baseline hữu ích, nhưng chưa đủ để ngăn client chỉnh kết quả trong biên hợp lệ.

## 7. Những lỗi đã xác định trước đây

### 7.1. Refresh làm tự động tăng thêm mùa

Nguyên nhân:

- query `shopReturn=advance` hoặc `transferReturn=advance` còn trong URL;
- remount đọc lại query và replay callback;
- callback làm tăng tuổi lần nữa.

Đã xử lý bằng cách consume và xóa query sau khi đọc.

### 7.2. Hydration bị hiểu nhầm là hoàn tất mùa

Nguyên nhân:

- current age placeholder thay đổi thành tuổi từ DB;
- effect theo dõi age tưởng đó là season transition;
- background save chạy với state chưa hydrate đủ.

Đã xử lý bằng `prevAgeRef` được set theo tuổi persisted trước khi bật career mode.

### 7.3. Kết quả mùa mất khi mở Shop/Transfer

Nguyên nhân:

- `finalizeSeasonRecord` chỉ cập nhật React state;
- component draft unmount khi router chuyển sang module;
- background save trước đó chỉ chạy khi age tăng, nhưng lúc rời module age chưa tăng.

Đã xử lý bằng `persistCurrentProgress()` trước navigation và gọi `finalizeSeasonRecord()` trước khi season advance.

### 7.4. Snapshot cũ ghi đè snapshot mới

Nguyên nhân:

- nhiều background save chạy song song;
- network response về không theo thứ tự.

Đã giảm rủi ro bằng client-side save serializer và server stale-age guard.

### 7.5. Dữ liệu mùa cũ đã mất

Các record đã bị ghi placeholder/rỗng trước khi các bản vá chạy không thể khôi phục chính xác nếu không có event log hoặc backup chứa wheel outcome.

Không được tuyên bố là đã phục hồi dữ liệu cũ nếu chưa có nguồn dữ liệu kiểm chứng.

### 7.6. Refresh giữa League và FA Cup làm mất result trên hồ sơ mùa

Nguyên nhân đã xác nhận:

- Wheel League V2 đã ghi `standingResult` vào `CareerSeason.runtimeState` và `WheelCheckpoint`.
- `CareerPlayer.seasonHistory` chỉ được finalize khi mùa kết thúc, nên tại thời điểm refresh giữa hai wheel nó chưa có result League.
- FE hydrate trước đây chỉ dựng `seasonRecords` từ `CareerPlayer.seasonHistory`; effect khởi tạo record hiện tại sau đó đặt `standing = null`.

Đã sửa bằng `hydrateCurrentSeasonRecord`: khi load một mùa `in_progress`, FE merge runtime state public của server vào record hiện tại, giữ kết quả cũ và chỉ dùng placeholder cho wheel chưa quay. Đây là read-model hydration, không ghi DB và không thay đổi UI/UX, target index, live label hoặc animation.

### 7.7. Growth wheel lặp bị `CHECKPOINT_EXISTS`

Log dev đã xác nhận flow tăng trưởng hợp lệ `selector → magnitude → selector` bị từ chối ở selector lần thứ hai. Nguyên nhân là unique key cũ của `WheelCheckpoint` chỉ gồm `(careerPlayerId, seasonId, stepKey)`, trong khi `selector` và `magnitude` là các wheel có thể lặp theo `evolutionCount`.

Đã sửa bằng unique key `(careerPlayerId, seasonId, stepKey, revisionBefore)`. `revisionBefore` là định danh của một lần wheel cụ thể và vẫn giữ idempotent retry; các lần lặp sau dùng revision mới nên được ghi checkpoint độc lập. Migration cần deploy là `20260903000100_repeatable_wheel_checkpoints`.

### 7.8. Season projection sau khi ở lại CLB: vé châu Âu, wallet và hợp đồng

Manual test đã xác nhận một lỗi ở boundary kết thúc mùa: V2 season transition trước đây chỉ advance `currentAge/currentStep` mà chưa ghi lại đầy đủ các projection dùng cho mùa kế tiếp. Vì vậy ba loại dữ liệu có thể bị stale sau refresh:

- `currentContinentalCup` có thể giữ giá trị static từ seed CLB (Newcastle United có `continentalType = UCL`) thay vì được tính từ kết quả League vừa chốt;
- `walletBalance` không được cộng lương mùa kế tiếp trước khi mở Shop;
- `contractYearsRemaining` không giảm sau khi mùa hoàn tất, khiến UI vẫn hiện `3/3`.

Rule đã chốt và implementation hiện tại:

- `ENG1` hạng 13 không có vé châu Âu; hạng 2 có vé `UCL`. Vé mùa kế tiếp khi ở lại CLB được tính từ `CareerSeason.runtimeState.standingResult`, không lấy trực tiếp từ `Club.continentalType`.
- Nếu người chơi chuyển CLB, vé của CLB đích do transfer command cấp và không bị tính lại bằng thứ hạng CLB cũ. Nếu ở lại, server tính lại theo League result của mùa vừa hoàn tất.
- Khi hoàn tất decision Transfer/Stay, server ghi thu nhập mùa kế tiếp vào wallet; season transition có cùng fallback nhưng helper `appendMissingSeasonIncomeEntries` lọc theo `(age, type)` để retry không cộng trùng lương hoặc phí chuyển nhượng.
- Season transition giảm `contractYearsRemaining` đúng một lần trong transaction. Với Stay, hợp đồng vẫn là `3/3` trong lúc đang ở Shop của mùa mới và trở thành `2/3` sau khi CTA sang mùa mới được commit; đây là cùng boundary với việc đóng mùa.
- `CareerSeason.runtimeState.continentalCupType` lưu ticket của chính mùa đó để finalize season history không bị projection mùa sau ghi đè.

Không thay đổi UI/UX, wheel animation, target index hoặc gameplay flow. `currentContinentalCup`, wallet và contract chỉ được hydrate lại từ authoritative response sau command.

## 8. Các giới hạn còn tồn tại

### 8.1. Refresh giữa mùa

Với career wheel V2, checkpoint được ghi trước khi animation bắt đầu nên refresh sau response không làm mất outcome đã resolve. Legacy row/flow chưa chuyển vẫn có rủi ro cũ: outcome chỉ ở client state cho đến save mùa.

### 8.2. Trạng thái flow bền vững

Career V2 đã lưu độc lập:

```text
currentAge
currentStep
currentWheel
checkpointVersion
```

FE hydrate các field này cùng revision/runtime/checkpoints từ `CareerProgressDto`. Row legacy chưa backfill vẫn phải suy luận một phần từ timeline và route compatibility.

### 8.3. Compare-and-swap/version locking

Command V2 kiểm tra `revision` và current step trong transaction; request stale bị conflict. Các legacy save action vẫn có thể read-merge-update nên chưa thể coi toàn bộ Classic flow đã có CAS.

### 8.4. Phạm vi transaction

Wheel checkpoint V2, season-stats V2, Shop purchase V2, Transfer completion V2, transfer market/negotiation V2 và season transition V2 dùng transaction command. Legacy progress checkpoint và transfer actions vẫn còn compatibility path read-merge/update cũ cho row chưa ở V2.

### 8.5. Event log và khả năng khôi phục

Wheel checkpoint V2 tạo `WheelCheckpoint`/`CareerEvent` trong transaction trước projection mutation. Tuy nhiên các mùa/transfer legacy cũ vẫn không có đầy đủ immutable event log; dữ liệu đã mất trước migration không tự phục hồi được.

### 8.6. Checkpoint từng wheel và anti-cheat

Career wheel và season-stats V2 đã thực hiện boundary server-authoritative:

1. command/intent từ client;
2. server-side resolution hoặc server-seed verification;
3. immutable wheel checkpoint;
4. authoritative projection;
5. client rehydrate từ response.

Không được đóng issue này chỉ bằng cách disable nút, ẩn outcome, hoặc validate thêm ở UI.

### 8.7. Phần còn pending: integration/production hardening và rollout

`advanceCareerSeasonCommand` đã khóa server-side bước đóng mùa bằng các điều kiện:

- projection phải ở `currentStep = resolved`;
- `seasonId` phải là mùa `in_progress` đúng tuổi hiện tại;
- mùa phải có ít nhất một `WheelCheckpoint`;
- client phải gửi `expectedRevision`, `idempotencyKey` và xác nhận Shop đã hoàn tất hoặc chủ động bỏ qua;
- transaction ghi `CareerSeason.summary`, đóng mùa, tạo `CareerCommand` và `CareerEvent`, rồi mới tăng tuổi/reset step.

Command này đã được FE gọi sau CTA Shop. Transfer completion V2 cũng đã được nối cho các quyết định accept/stay/renewal/transfer; transfer market, search, approach và renewal đều resolve từ state server với secure RNG/canonical idempotency; không cần thay đổi UI/UX hoặc cách wheel quay. Structured command logging, setup-token boundary, legacy mutation fence và bounded Prisma pool đã triển khai. Phần còn cần bằng chứng là integration test trên database copy, query plan/load baseline, backup/restore và rollout production.

### 8.8. Setup và anti-tamper boundary

- `startPlayerCareerAction` kiểm tra ownership, lấy thông tin CLB canonical từ DB và ký setup projection với `CAREER_SETUP_TOKEN_SECRET`.
- `initCareerPlayerAction` kiểm tra chữ ký, hạn dùng và binding user/game/slot; player đã tồn tại thì idempotent update rỗng, không reset career.
- Hidden stats chỉ được tạo ở server lúc init và được load lại từ DB cho resolver; không nằm trong public player/progress DTO.
- `CHECKPOINT_V2` chỉ là rollout switch cho career mới. Career đã có `checkpointVersion` không bị downgrade khi env thay đổi.
- Đây là anti-tamper boundary cho Classic V2, không phải bằng chứng rằng toàn bộ legacy code đã bị xóa. Khi không còn legacy row/client cần hỗ trợ, phải retire các action snapshot cũ bằng một release riêng.

## 9. Target architecture cần hướng tới

### 9.1. Thêm explicit progress state

Nên lưu server-side các field rõ ràng:

```ts
currentAge: number;
currentStep: CareerStep;
currentWheel: WheelType | null;
checkpointVersion: number;
```

Không tiếp tục dùng timeline cuối làm đại diện duy nhất cho current age.

### 9.2. Commit outcome ở server

Mỗi wheel đã resolve nên có action/service commit rõ ràng:

```text
validate current checkpoint
    -> write immutable wheel event
    -> update career snapshot
    -> increment checkpointVersion
    -> return authoritative state
```

### 9.3. Optimistic concurrency

Update nên có điều kiện kiểu:

```text
WHERE playerId = X AND checkpointVersion = clientVersion
```

Nếu version không khớp, server từ chối snapshot cũ thay vì merge mù.

### 9.4. Module navigation

Shop/Transfer chỉ được mở sau khi nhận checkpoint thành công. Khi quay lại, route nên tiếp tục từ `currentStep` server-side thay vì chỉ dựa trên query callback.

### 9.5. Khôi phục dữ liệu lịch sử

Nếu cần phục hồi dữ liệu mùa cũ, phải có một trong các nguồn:

- DB backup;
- immutable career event log;
- migration data còn giữ kết quả wheel;
- audit log ngoài client.

Không thể suy ngược kết quả chính xác chỉ từ một `SeasonRecord` placeholder.

### 9.6. Target data flow cho per-wheel checkpoint

```text
Client intent
  { playerId, expectedRevision, seasonId, stepKey, choice, idempotencyKey }
                         |
                         v
Server command boundary
  auth -> ownership -> schema -> state precondition -> rate limit
                         |
                         v
Domain resolver (server-controlled)
  seed/RNG -> weights -> outcome -> state transition
                         |
                         v
Short DB transaction
  insert WheelCheckpoint (immutable, unique)
  update CareerProgress (revision + current step)
  update projections only when required
                         |
                         v
Authoritative response
  checkpointId, revision, nextStep, publicState, outcome
```

Server phải resolve từ một trong hai cơ chế:

- **Server-controlled RNG:** đơn giản hơn, outcome chỉ tồn tại ở server; hoặc
- **Server-issued season seed:** server giữ seed/secret, client không được tự chọn seed; server có thể re-run để verify.

Không chọn cơ chế “client gửi outcome rồi server tin trong range” cho production hoặc PvP.

## 10. Invariants bắt buộc

Các rule sau cần được giữ trong mọi update tiếp theo:

1. Refresh không được tạo mùa mới.
2. Một callback `advance` không được xử lý quá một lần cho cùng một checkpoint.
3. Không được rời draft sang Shop/Transfer sau season resolve nếu checkpoint chưa thành công.
4. Snapshot có tuổi thấp hơn không được ghi đè snapshot mới hơn.
5. Retry cùng checkpoint không được cộng tiền lần hai.
6. `seasonHistory` của mùa đã hoàn thành không được bị thay bằng placeholder từ snapshot cũ.
7. Server phải tự kiểm tra quyền sở hữu player.
8. Career data không được đặt trong Zustand như nguồn sự thật.
9. Một season result chỉ được finalize một lần về mặt domain.
10. Dữ liệu lịch sử mùa phải giữ nguyên sau khi bắt đầu mùa mới.
11. Mỗi wheel đã resolve có một logical checkpoint duy nhất.
12. Retry cùng idempotency key trả cùng kết quả, không tạo side effect lần hai.
13. Client không được gửi outcome, weights hoặc final delta như nguồn sự thật.
14. Mọi write state transition phải kiểm tra `expectedRevision`/current step ở server.
15. Conflict do revision cũ phải trả lỗi conflict rõ ràng để client reload authoritative state.
16. Hidden seed, hidden stats và integrity metadata không được expose cho client nếu không có lý do gameplay rõ ràng.
17. Checkpoint wheel, state transition và audit event phải commit cùng transaction.

## 11. Checklist test tối thiểu

Mỗi thay đổi liên quan flow career cần kiểm tra:

- refresh ở setup mode;
- refresh ngay sau khi bắt đầu career;
- refresh giữa một mùa;
- refresh sau khi hoàn tất season result nhưng trước khi mở Shop;
- mở Shop rồi refresh;
- mở Transfer rồi refresh;
- quay về với `shopReturn=advance`;
- quay về với `transferReturn=advance`;
- refresh ngay sau callback return;
- double click CTA chuyển mùa;
- hai save request liên tiếp khác tuổi;
- retry cùng checkpoint;
- load lại một player có nhiều mùa lịch sử;
- kiểm tra season history cũ sau khi sang mùa mới;
- retirement save và load lại career đã retired.
- resolve từng wheel rồi refresh ngay sau response;
- gửi lại cùng idempotency key;
- gửi command với revision cũ;
- sửa outcome/weight/OVR trong payload rồi gọi server action;
- gọi command cho step không phải step hiện tại;
- gọi command cho player không thuộc user;
- hai command khác idempotency key nhưng cùng logical wheel;
- hai request đồng thời cho cùng player/step;
- load lại state sau khi checkpoint ghi thành công nhưng UI chưa kịp render.
- refresh giữa wheel League đã có result và wheel FA Cup chưa quay; hồ sơ mùa vẫn phải hiển thị result League.
- hoàn tất League hạng 13 tại `ENG1`, refresh ở bước kế tiếp; mùa sau không tự nhận `UCL` từ seed CLB.
- Stay/Transfer → Shop → season transition; lương mùa mới chỉ được ghi một lần và hợp đồng giảm đúng một năm.

## 12. Source code tham chiếu

- [CareerPlayer schema](D:/road-to-glory/prisma/schema.prisma:26)
- [Draft server page và resume player lookup](D:/road-to-glory/app/(game)/classic/[gameId]/draft/[slotIndex]/page.tsx:49)
- [Player load/save actions](D:/road-to-glory/actions/player.actions.ts:191)
- [Season progress checkpoint action](D:/road-to-glory/actions/season.actions.ts:396)
- [Checkpoint command contract](D:/road-to-glory/features/career/contracts/checkpoint.contract.ts:1)
- [Checkpoint transaction service](D:/road-to-glory/features/career/services/checkpoint.service.ts:164)
- [Server wheel resolver adapter](D:/road-to-glory/features/career/services/server-wheel-resolver.service.ts:210)
- [Checkpoint Server Actions](D:/road-to-glory/actions/career-checkpoint.actions.ts:26)
- [Career command contract](D:/road-to-glory/features/career/contracts/career-command.contract.ts:1)
- [Career command service](D:/road-to-glory/features/career/services/career-command.service.ts:1)
- [Season transition contract](D:/road-to-glory/features/career/contracts/season-transition.contract.ts:1)
- [Season transition service](D:/road-to-glory/features/career/services/season-transition.service.ts:1)
- [Season transition Server Action](D:/road-to-glory/actions/career-season.actions.ts:1)
- [Persistence audit](D:/road-to-glory/scripts/career-persistence-audit.ts:1)
- [Legacy projection backfill](D:/road-to-glory/scripts/backfill-career-projection.ts:1)
- [Hydration và save orchestration](D:/road-to-glory/features/wheel/hooks/useDraftDrum.ts:217)
- [Checkpoint trước module navigation](D:/road-to-glory/features/wheel/hooks/useDraftDrum.ts:404)
- [Finalize season record](D:/road-to-glory/features/wheel/hooks/useCareerStats.ts:224)
- [Season projection, wallet và contract transition](D:/road-to-glory/features/career/services/season-transition.service.ts:89)
- [Transfer/Stay wallet và contract transition](D:/road-to-glory/features/career/services/transfer-transition.service.ts:447)
- [Shop/Transfer return handling](D:/road-to-glory/features/wheel/hooks/useDraftDrum.ts:862)

## 13. Quy tắc cập nhật tài liệu này

Khi có thay đổi mới, thêm vào đúng nhóm:

- cập nhật code đã chạy vào **Current implementation**;
- quyết định gameplay đã chốt vào **Decision** hoặc **Invariants**;
- ý tưởng chưa code vào **Target architecture**;
- bug chưa giải quyết vào **Open issue/Limitations**;
- không xóa kết luận cũ nếu chưa ghi rõ lý do và commit thay thế.

Mỗi thay đổi quan trọng nên ghi thêm:

```text
Ngày:
Thay đổi:
Lý do:
Files liên quan:
Test đã chạy:
Rủi ro còn lại:
```

## 14. Change log

### 2026-09-02

- Bổ sung requirement checkpoint durable cho mỗi wheel đã resolve.
- Ghi rõ client-side wheel RNG và client-supplied progress hiện chưa đủ chống sửa kết quả.
- Bổ sung security invariants: server-controlled outcome, revision/CAS, idempotency và immutable audit record.
- Bổ sung target flow cho server command + DB transaction + authoritative response.
- Ghi rõ các kết luận target chưa phải implementation hiện tại.
- Bắt đầu implementation: projection fields V2, `CareerSeason`, `WheelCheckpoint`, `CareerEvent`, strict auth guard và transaction service.
- Đồng bộ strict auth cho điểm tạo `GameSession`; thêm smoke check cho contract, RNG injection và server resolver adapter.
- Operator đã apply migration foundation; kiểm tra read-only xác nhận database schema up to date.
- Thêm V2 Shop command server-authoritative với `CareerCommand` idempotency record; đã chuyển Shop consumer V2 và giữ nguyên UI/layout.
- Thêm V2 season transition command để đóng mùa/lưu summary/advance hoặc retire trong một transaction; FE đã gọi command sau bước Shop và giữ nguyên UI.
- Nối career wheel V2 và season-stats V2 vào FE bằng `useCareerCheckpointSync`; server ghi checkpoint trước animation, FE hydrate lại revision/runtime/checkpoints và giữ nguyên realtime animation/live label.
- Nối Transfer completion V2 và season transition V2 vào FE; transfer market/club search/approach/renewal cũng đã server-authoritative với canonical idempotency và secure RNG.
- Operator đã deploy migration `20260902000200_career_command_idempotency`; embedded V2 không còn gọi legacy aggregate save khi mở module hoặc sau khi sang mùa.
- Không backfill 33 legacy players trong scope hiện tại vì database không có season/checkpoint/event rows để phục hồi chính xác; operator có thể cleanup sau backup/approval.

### 2026-09-03

- Operator đã deploy `20260902000200_career_command_idempotency`; `prisma migrate status` xác nhận database schema up to date.
- Audit read-only mới nhất sau cleanup ghi nhận `0` CareerPlayer, `0` CareerSeason, `0` WheelCheckpoint và `0` CareerEvent; không thực hiện backfill hoặc suy đoán lịch sử 33 row cũ.
- Thêm HMAC setup token bind user/game/slot và TTL; init career không còn nhận hidden stats từ client làm nguồn sự thật, hidden stats được tạo server-side.
- Legacy aggregate mutation bị fence khỏi Career V2; transfer completion kiểm tra offer/negotiation do server phát hành trước khi commit.
- Thêm structured command logging bounded, Prisma pool/statement/query timeout cấu hình được và feature flag `CHECKPOINT_V2` cho career mới.
- Thêm security smoke check, persistence integration/concurrency harness (chỉ chạy khi có `CAREER_TEST_DATABASE_URL` cách ly) và audit baseline read-only.
- Các bằng chứng còn mở ngoài code: database-copy integration run, query plan/load test, backup/restore/PITR, metrics sink/alert và production rollout.
- Sửa season transition projection: persist vé châu Âu kế tiếp theo standing của mùa vừa hoàn tất, giảm contract years và ghi lương/thu nhập vào wallet bằng ledger idempotent; không còn giữ static `UCL` của CLB khi League result là hạng 13.
- Transfer/Stay completion ghi thu nhập mùa kế tiếp trước khi mở Shop; season transition vẫn có fallback chống cộng trùng. Thêm regression `season-projection-check` cho qualification, wallet income và transfer fee.
- Season start lưu `runtimeState.continentalCupType` để season history giữ đúng ticket của mùa đang chơi khi projection mùa sau thay đổi.
- Sửa lỗi summary projection: `seasonHistory` là nguồn cộng apps/goals/assists, `peakOvr` lấy cả projection persisted, còn `statsTimeline` chỉ giữ snapshot thuộc tính theo tuổi. Season transition V2 append snapshot tuổi kế tiếp và cập nhật stint đang hoạt động đến tuổi vừa chốt.
- Khi vào màn hình giải nghệ, FE hydrate lại projection cuối từ server; read model cũng normalize boundary của stint cũ từ season history để career archive không còn dừng ở stint seed một mùa.
- Thêm regression `check:career-summary` cho tổng career stats, peak OVR persisted và club journey.

### 2026-09-03 — Transfer contract/UI consistency

- Sửa market value ở Transfer header để dùng cùng input canonical với transfer market.
- Sửa hiển thị lương từ tuần sang hàng năm ở inbound offer và success summary; shortlist hiển thị đúng annual wage theo option đang chọn.
- Renewal hiển thị cả vai trò dự kiến và số trận/mùa.
- Sửa server validation của approach completion: phân biệt input kind `approach` với offer kind `transfer`/`free_agent`, đồng thời cho phép chọn wage option cuối sau khi approach đã được chấp thuận.
- Final negotiation hiển thị status accepted/error ngay tại màn hình hiện tại; không cần back để biết kết quả.

### 2026-09-04 — Transfer contract visibility và club wage quotes

- Transfer context hiển thị hợp đồng hiện tại theo dạng `còn lại / tổng số mùa`; dữ liệu lấy từ `TransferMarketResult.contract`, không lấy từ state UI.
- Thêm quote lương năm theo từng CLB: `proposeWageAnnual` vẫn là tâm tính theo OVR/fit, `randomizeWageAnnual` tạo spread trong band min/max của CLB và `clampWageAnnual` giữ trần/sàn ở server.
- Career V2 dùng quote source ổn định theo player + season + club; market snapshot, club search, negotiation và completion dùng cùng nguồn. Completion không tin `wageAnnual`, `contractYears` hoặc `transferFee` do client gửi mà consume offer server đã phát hành.
- Không thay đổi UI/UX layout, realtime wheel animation hoặc flow game; thay đổi chỉ bổ sung dữ liệu hợp đồng và làm salary quote/commit nhất quán giữa FE-BE-DB.
