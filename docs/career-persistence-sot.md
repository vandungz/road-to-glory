# Football Life — SoT: Lưu, Load và Checkpoint sự nghiệp

> Trạng thái: **Current implementation / cần tiếp tục cập nhật**  
> Ngày ghi nhận: **2026-09-02**  
> Phạm vi: career player, draft/wheel, season progression, Shop, Transfer, resume sau refresh.

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

Khi mount, `useDraftDrum` gọi `getCareerPlayerAction` một lần và khôi phục:

- player identity;
- `statsTimeline`;
- `clubStints`;
- `seasonHistory`;
- achievements;
- contract/wage/market value;
- current club và continental cup;
- wallet, influence và shop inventory;
- tuổi hiện tại từ snapshot cuối của `statsTimeline`.

Hiện chưa có cột DB độc lập cho `currentAge`. Rule hiện tại là:

```text
currentAge = statsTimeline.at(-1).age
```

Đây là một coupling quan trọng và là điểm cần cải thiện trong kiến trúc tương lai.

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

Wheel outcome hiện chủ yếu được giữ trong client state. Season record ban đầu có thể được tạo với placeholder như `Chờ quay`.

Khi hoàn tất mùa, `finalizeSeasonRecord()` chốt vào `seasonRecords` ở client trước khi tăng tuổi. Nó cập nhật các nhóm như:

- standing;
- domestic/continental result;
- national team result;
- apps, goals, assists, clean sheets;
- match rating và competition stats;
- Ballon d'Or result.

Điều này mới là bước commit vào working state; chưa đồng nghĩa với commit DB.

### 5.3. Chuyển sang mùa tiếp theo

Khi `currentAge` tăng:

1. timeline được thêm snapshot của tuổi mới;
2. season state cũ được reset để bắt đầu mùa mới;
3. effect theo dõi thay đổi tuổi lấy snapshot mới nhất;
4. `updateSeasonProgressAction` được gọi để checkpoint server.

Background save có serializer:

- chỉ một request save chạy tại một thời điểm;
- request mới trong lúc request cũ chạy sẽ đánh dấu `pending`;
- sau khi request cũ xong, gửi snapshot mới nhất;
- tránh network jitter làm request cũ ghi sau request mới.

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

Shop ở trạng thái đầu mùa chưa nhất thiết phải ép save full season; Shop sau khi mùa resolve thì phải ép save.

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

## 8. Các giới hạn còn tồn tại

### 8.1. Refresh giữa mùa vẫn có thể mất dữ liệu

Nếu người chơi refresh sau một hoặc nhiều wheel nhưng trước checkpoint, outcome mới chỉ ở client state và có thể mất.

### 8.2. Chưa có trạng thái flow bền vững

DB chưa lưu độc lập:

```text
currentAge
currentStep
currentWheel
checkpointVersion
```

Do đó resume phải suy luận từ timeline, season history, client callback và route query.

### 8.3. Chưa có compare-and-swap/version locking

Hai request cùng tuổi vẫn có thể cùng đọc một bản DB rồi ghi lần lượt. Merge làm giảm mất dữ liệu, nhưng chưa loại bỏ hoàn toàn race condition.

### 8.4. Checkpoint chính chưa bao bọc toàn bộ read-merge-write trong transaction

`purchaseShopItemAction` có transaction riêng vì liên quan đến chi tiền. Career progress checkpoint chính hiện vẫn là read rồi update thông thường.

### 8.5. Event log chưa phải nguồn khôi phục đầy đủ

Theo domain rule, wheel outcome nên được log trước khi mutate state. Code hiện tại chưa biến `events` thành một event log đầy đủ và bắt buộc cho từng wheel outcome.

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

## 12. Source code tham chiếu

- [CareerPlayer schema](D:/road-to-glory/prisma/schema.prisma:26)
- [Draft server page và resume player lookup](D:/road-to-glory/app/(game)/classic/[gameId]/draft/[slotIndex]/page.tsx:49)
- [Player load/save actions](D:/road-to-glory/actions/player.actions.ts:191)
- [Season progress checkpoint action](D:/road-to-glory/actions/season.actions.ts:396)
- [Hydration và save orchestration](D:/road-to-glory/features/wheel/hooks/useDraftDrum.ts:217)
- [Checkpoint trước module navigation](D:/road-to-glory/features/wheel/hooks/useDraftDrum.ts:404)
- [Finalize season record](D:/road-to-glory/features/wheel/hooks/useCareerStats.ts:224)
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
