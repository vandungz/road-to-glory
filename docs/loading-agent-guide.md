# Loading Agent Guide — Football Life

Tài liệu này hướng dẫn developer và AI agent sử dụng Loading module trong **Football Life** (tên thư mục gốc: `road-to-glory`).

Loading trong dự án này chỉ dùng để quản lý trạng thái hiển thị UI (renderer UI state). Loading không phải là nguồn dữ liệu thực (project truth), không được dùng để lưu trữ dữ liệu của `CareerPlayer`, `GameSession`, `Club`, hay `League`, và không được thực hiện các câu lệnh ghi database (Prisma / Supabase) trực tiếp từ phía client loading components.

---

## 1. Import chuẩn

```tsx
import {
  ComponentLoading,
  LoadingSpinner,
  PageLoading,
  useAsyncLoading,
  useGlobalLoading
} from '@/components/shared/loading';
```

Global loading overlay đã được tích hợp một lần trong `AppProviders` ở `app/layout.tsx`. Các page hay module không tự ý render `GlobalLoadingOverlay` riêng để đảm bảo tính nhất quán của UI.

---

## 2. Phân loại và Cách Sử dụng Loading

### 2.1. App/Page Loading (`PageLoading`)
Dùng `PageLoading` khi cả page hoặc một module view lớn chưa sẵn sàng kết xuất dữ liệu.

**Phù hợp cho**:
- Màn hình tải danh sách đội hình lần đầu (`SquadList` query).
- Tải thông tin ban đầu của phòng bốc thăm (Draft Room setup).
- Route transition giữa các màn hình lớn trong game.

*Không dùng `PageLoading` cho các thao tác nhỏ trong nút bấm hoặc một góc panel đơn lẻ.*

```tsx
if (query.isLoading) {
  return (
    <PageLoading
      title="Đang tải đội hình"
      description="Đang chuẩn bị danh sách cầu thủ cho câu lạc bộ của bạn."
    />
  );
}
```

### 2.2. Component Loading (`ComponentLoading`)
Dùng `ComponentLoading` cho card, panel, list, table hoặc một vùng con cụ thể của page.

**Phù hợp cho**:
- Bảng đấu mùa giải (`LeagueTable`).
- Khung trận đấu tiếp theo (`UpcomingFixture`).
- Khung thuộc tính cầu thủ (`AttributeSummary`).

```tsx
<ComponentLoading
  isLoading={query.isLoading}
  label="Đang tải thuộc tính cầu thủ..."
  fallback={<AttributeSkeleton />}
>
  <AttributeSummary player={player} />
</ComponentLoading>
```
*Nếu không truyền `fallback`, component sẽ sử dụng skeleton mặc định.*

### 2.3. Global Overlay Loading (`useGlobalLoading`)
Dùng `useGlobalLoading` cho các hành động (action) quan trọng cần khóa màn hình tạm thời nhằm tránh user thao tác phá vỡ tính nhất quán của dữ liệu.

**Chỉ dùng cho**:
- **Lưu cầu thủ đã hoàn thành Draft** về database (`saveCareerPlayer`).
- **Giả lập toàn bộ mùa giải** khi bấm nút `PLAY MATCH` (quá trình tính toán nhiều trận đấu).
- **Lưu/Xóa game session**.
- Các hành động ghi (write mutations) mà nếu user thao tác tiếp có thể gây lỗi click đúp, trùng lặp request hoặc mất đồng bộ.

```tsx
const { withGlobalLoading } = useGlobalLoading();

await withGlobalLoading(
  {
    title: 'Đang giả lập mùa giải mới',
    description: 'Vui lòng không tắt trình duyệt trong lúc giả lập kết quả...'
  },
  () => simulateSeasonAction()
);
```

### 2.4. Async Flow Loading (`useAsyncLoading`)
Dùng `useAsyncLoading` khi cần gọi một hàm async cục bộ và chờ xử lý xong ngay trong component mà không cần khóa toàn bộ màn hình.

**Phù hợp cho**:
- Click nút bấm đơn giản (như nút bốc lồng quay `Roll 🎲`).
- Nút click chuyển tab phụ.

```tsx
const { isLoading, error, run } = useAsyncLoading();

async function handleRollDrum(): Promise<void> {
  await run(() => spinDrum());
}

return (
  <>
    <Button disabled={isLoading} onClick={handleRollDrum}>
      {isLoading ? <LoadingSpinner className="mr-2" /> : null}
      {isLoading ? 'Đang quay lồng...' : 'Quay Lồng 🎲'}
    </Button>
    {error ? <p className="text-sm text-red-600">Lỗi quay lồng.</p> : null}
  </>
);
```

---

## 3. Quy tắc Quản lý Trạng thái (State Management Rules)

- **Zustand**: Chỉ giữ trạng thái bật/tắt (transient UI state) của global overlay. Cấm tuyệt đối việc lưu dữ liệu cầu thủ (`CareerPlayer`) hay trận đấu (`GameSession`) trong Zustand loading store.
- **TanStack Query**: Quản lý trạng thái loading của việc fetch dữ liệu từ server (`isLoading`, `isFetching`).
- **Server Actions**: Quản lý tiến trình xử lý dữ liệu và mutation ở phía backend. Client chỉ nhận tín hiệu và hiển thị giao diện chờ tương ứng.

---

## 4. Custom UI cho các Module
Loading module hỗ trợ custom các thành phần:
- `fallback` của `ComponentLoading`.
- `title` và `description` của `PageLoading` & `withGlobalLoading`.
- Vị trí của `LoadingSpinner` trên button.

*Không được phép tự tạo store loading riêng để lưu trữ dữ liệu thực của game.*

---

## 5. Ví dụ về Governing Writes & Loading

```tsx
const { withGlobalLoading } = useGlobalLoading();

async function handleSavePlayer(): Promise<void> {
  await withGlobalLoading(
    {
      title: 'Đang ký hợp đồng chuyên nghiệp',
      description: 'Đang đưa cầu thủ vào đội hình chính thức của câu lạc bộ...'
    },
    async () => {
      await saveCareerPlayerAction(playerData);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.game(gameId) });
    }
  );
}
```

*Lưu ý: loading chỉ làm nhiệm vụ khóa UI và hiển thị trạng thái chờ. Việc lưu trữ thực tế, kiểm tra nghiệp vụ và tính toán logic thuộc về Server Actions và Feature Services.*

---

## 6. Quy tắc dành cho AI Agent
Khi làm việc với các component có chứa loading, AI agent bắt buộc phải:
1. Sử dụng `ComponentLoading` cho vùng nhỏ và `PageLoading` cho toàn trang.
2. Dùng `LoadingSpinner` trong các nút bấm xử lý nhanh.
3. Dùng `useAsyncLoading` cho các thao tác async cục bộ tại component.
4. Chỉ dùng `useGlobalLoading` cho các thao tác ghi dữ liệu (mutations) quan trọng.
5. Không render trực tiếp `GlobalLoadingOverlay` trong page component của module.
6. Không lưu trữ dữ liệu bóng đá thực (`CareerPlayer`, `GameSession`, v.v.) vào loading state.
7. Không dùng global overlay để che đi trạng thái loading của TanStack Query thông thường.

---

## 7. File tham chiếu
- Loading Components & Hooks: `components/shared/loading/`
- Global Overlay Provider: `app/layout.tsx` (AppProviders)
- Tests: `components/shared/loading/__tests__/`
