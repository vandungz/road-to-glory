# Loading Agent Guide

Tài liệu này hướng dẫn developer và AI agent sử dụng Loading module trong AirenoOS.

Loading trong dự án này là renderer UI state. Loading không phải official project truth, không được dùng để lưu Backpack/BOQ/Approval/Gantt truth, và không được truy cập Node.js/Electron API trực tiếp từ renderer.

## 1. Import chuẩn

```tsx
import {
  ComponentLoading,
  LoadingSpinner,
  PageLoading,
  useAsyncLoading,
  useGlobalLoading
} from '@/shared/components/loading';
```

Global overlay đã được render một lần trong `AppProviders`. Module không tự render `GlobalLoadingOverlay` trừ khi đang viết test hoặc story riêng.

## 2. Khi nào dùng từng loại loading

### App/Page Loading

Dùng `PageLoading` khi cả page hoặc module view chưa sẵn sàng render dữ liệu chính.

Phù hợp cho:

- Initial module query.
- Page cần giữ layout ổn định trong lúc chuẩn bị dữ liệu.
- Route/module transition có dữ liệu cần tải trước.

Không dùng `PageLoading` cho một action nhỏ trong button hoặc một panel đơn lẻ.

```tsx
if (query.isLoading) {
  return (
    <PageLoading
      title="Loading Backpack"
      description="Preparing visible project truth records."
    />
  );
}
```

### Component Loading

Dùng `ComponentLoading` cho card, list, table, panel hoặc một vùng con của page.

Phù hợp cho:

- Backpack list.
- BOQ table.
- Approval lane.
- Source Trace panel.
- Một widget đang refresh riêng.

```tsx
<ComponentLoading
  isLoading={query.isLoading}
  label="Loading Backpack items"
  fallback={<BackpackListSkeleton />}
>
  <BackpackList items={items} />
</ComponentLoading>
```

Nếu không truyền `fallback`, component sẽ dùng skeleton mặc định. Khi module cần UI riêng, truyền fallback để custom nhưng vẫn giữ logic chung.

### Global Overlay Loading

Dùng `useGlobalLoading` cho action quan trọng cần khóa màn hình tạm thời.

Chỉ dùng cho:

- Export file.
- Sync project.
- Initialize workspace.
- Apply governed write.
- Action nếu user thao tác tiếp có thể gây double write, mất trace, hoặc trạng thái không nhất quán.

Không dùng global overlay cho:

- Query loading thông thường.
- Refresh một table/list.
- Validate form local.
- Loading trong button đơn giản.

```tsx
const { withGlobalLoading } = useGlobalLoading();

await withGlobalLoading(
  {
    title: 'Applying governed write',
    description: 'Preserving before/after state and decision trace.'
  },
  () => applyGovernedWrite()
);
```

Global loading dùng operation ID nội bộ. Nếu nhiều action blocking chạy chồng nhau, overlay chỉ tắt khi tất cả operation đã kết thúc.

### Async Flow Loading

Dùng `useAsyncLoading` khi cần gọi một hàm async và chờ xử lý xong trong component.

Phù hợp cho:

- Button action.
- Submit form renderer-only.
- Preview/export preparation.
- Flow cần hiển thị error local.

```tsx
const { isLoading, error, run } = useAsyncLoading();

async function handleExport(): Promise<void> {
  await run(() => exportFile());
}

return (
  <>
    <Button
      disabled={isLoading}
      onClick={handleExport}
    >
      {isLoading ? <LoadingSpinner className="mr-2" /> : null}
      {isLoading ? 'Exporting' : 'Export'}
    </Button>
    {error ? <p className="text-sm text-red-600">Export failed.</p> : null}
  </>
);
```

## 3. State management rules

- Zustand chỉ giữ global overlay UI state.
- Loading state không phải official project truth.
- Không lưu Backpack, BOQ, Approval, Gantt, DecisionReceipt hoặc Source Trace truth trong loading store.
- TanStack Query vẫn quản lý server/cache loading cho data fetch.
- Domain services vẫn quản lý business action và governed writes.
- Renderer event handler có thể bắt đầu flow, nhưng official writes phải đi qua service abstraction đúng tầng.

## 4. Custom UI theo module

Loading module dùng composition, không dùng registry variant trung tâm.

Module được phép custom:

- `fallback` của `ComponentLoading`.
- `title` và `description` của `PageLoading`.
- Copy trong `withGlobalLoading`.
- Button label/spinner position.

Module không được custom bằng cách:

- Tạo store loading riêng cho official truth.
- Render nhiều global overlay ở nhiều nơi.
- Chặn màn hình cho query loading thông thường.
- Thêm dependency loading/dialog mới nếu primitive hiện tại đủ dùng.

## 5. Governed write example

```tsx
const { withGlobalLoading } = useGlobalLoading();

async function handleApplyWrite(): Promise<void> {
  await withGlobalLoading(
    {
      title: 'Applying governed write',
      description: 'Creating before/after trace and decision receipt.'
    },
    async () => {
      await governedWriteService.applyWrite(command);
      await queryClient.invalidateQueries({ queryKey: queryKeys.backpackItems(projectId) });
    }
  );
}
```

Lưu ý: loading chỉ khóa UI. Nó không tự tạo `DecisionReceipt`, không validate permission, không transition truth state. Các việc đó thuộc domain/service layer.

## 6. Rules cho AI agent

Khi thêm loading vào module, AI agent phải:

1. Dùng `ComponentLoading` cho vùng nhỏ và `PageLoading` cho toàn page.
2. Dùng `LoadingSpinner` trong button/action ngắn.
3. Dùng `useAsyncLoading` cho async flow local.
4. Dùng `useGlobalLoading` chỉ cho action blocking nghiêm trọng.
5. Không render `GlobalLoadingOverlay` trong module page.
6. Không lưu official project truth vào loading state.
7. Không dùng global overlay để che loading của TanStack Query thông thường.
8. Không gọi filesystem/native API trực tiếp từ loading component.
9. Không dùng loading hook để bỏ qua governed write service.
10. Thêm test nếu loading behavior có logic mới hoặc ảnh hưởng workflow quan trọng.

## 7. Test checklist

Khi sửa Loading module hoặc thêm wrapper phức tạp, kiểm tra:

- `useAsyncLoading` bật `isLoading` khi promise pending.
- `useAsyncLoading` tắt `isLoading` sau success.
- `useAsyncLoading` giữ error sau failure.
- Global overlay hiển thị khi có active operation.
- Nhiều global operations chạy chồng nhau không tắt overlay quá sớm.
- `withGlobalLoading` luôn clear operation trong cả success và failure.

Chạy:

```bash
npm run typecheck
npm test
```

## 8. File tham khảo

- Loading exports: `src/renderer/shared/components/loading/index.ts`
- Global overlay integration: `src/renderer/app/providers.tsx`
- Loading store: `src/renderer/shared/components/loading/loadingStore.ts`
- Async hook: `src/renderer/shared/components/loading/useAsyncLoading.ts`
- Unit tests: `src/tests/unit/useAsyncLoading.test.tsx`
- Global tests: `src/tests/unit/globalLoading.test.tsx`
