# Modal Agent Guide — Football Life

Tài liệu này hướng dẫn AI agent và developer tạo modal mới trong Football Life.

Modal trong project này là **UI state thuần túy**. Không dùng modal để lưu game truth, không persist state từ modal trực tiếp, không chứa business logic trong modal component.

Football Life dùng hai pattern modal khác nhau tùy mục đích:

| Pattern | Dùng khi |
|---|---|
| **Zustand Store + Dialog** | Modal cần mở/đóng từ nhiều nơi khác nhau (career detail, delete confirm) |
| **Local State + Dialog** | Modal chỉ được mở từ một component, không cần share (inline confirm nhỏ) |

---

## 1. Khi nào dùng pattern nào

### Pattern A — Zustand Store + Dialog

Dùng khi:

- Modal cần được trigger từ nhiều component khác nhau.
- Modal hiển thị data phụ thuộc vào selection state (VD: player nào đang được chọn).
- Modal là "global" trong phạm vi game session.

Ví dụ trong Football Life:

- **Career Detail Modal** — user click slot bất kỳ trên pitch để xem career.
- **Delete Game Confirm Modal** — trigger từ game card hoặc header.

### Pattern B — Local State + Dialog

Dùng khi:

- Modal chỉ được mở từ đúng một button trong một component.
- Không cần share open state ra ngoài.
- Confirm đơn giản không cần data phức tạp.

Ví dụ:

- Confirm trước khi reset wheel mid-flow.
- Confirm trước khi thoát khỏi wheel spin screen.

### Không dùng modal cho

- Wheel spin flow — đây là **full screen** hoặc **page transition**, không phải modal.
- Fetch data lần đầu — dùng Server Component.
- Display error toàn màn hình — dùng error boundary hoặc toast.

---

## 2. Pattern A — Zustand Store + Dialog

### Bước 1: Tạo Zustand store

```ts
// features/player/stores/usePlayerModalStore.ts
import { create } from "zustand";

type PlayerModalState = {
  isOpen:           boolean;
  selectedPlayerId: string | null;
  openModal:        (playerId: string) => void;
  closeModal:       () => void;
};

export const usePlayerModalStore = create<PlayerModalState>((set) => ({
  isOpen:           false,
  selectedPlayerId: null,
  openModal:  (id) => set({ isOpen: true, selectedPlayerId: id }),
  closeModal: ()   => set({ isOpen: false, selectedPlayerId: null }),
}));
```

### Bước 2: Trigger từ bất kỳ component nào

```tsx
// features/squad/components/SlotDisc.tsx
"use client";

import { usePlayerModalStore } from "@/features/player/stores/usePlayerModalStore";

type SlotDiscProps = {
  slotIndex: number;
  player:    CareerPlayer | null;
  gameId:    string;
};

export function SlotDisc({ slotIndex, player, gameId }: SlotDiscProps) {
  const openModal = usePlayerModalStore((s) => s.openModal);

  if (!player) {
    return (
      <button
        className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-dashed border-white/50 bg-white/10 text-white transition-colors hover:border-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        onClick={() => {/* start wheel flow */}}
        aria-label={`Fill slot ${slotIndex}`}
      >
        <span className="text-xs font-bold uppercase">{getPositionLabel(slotIndex)}</span>
      </button>
    );
  }

  return (
    <button
      className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-white bg-white text-foreground transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      onClick={() => openModal(player.id)}
      aria-label={`View ${player.name}`}
    >
      <span className="text-[10px] font-bold">{player.jerseyNumber}</span>
      <span className="max-w-[40px] truncate text-[9px] font-medium">{player.shortName}</span>
    </button>
  );
}
```

### Bước 3: Đặt Dialog component ở root game layout

```tsx
// app/(game)/layout.tsx hoặc app/(game)/[gameId]/layout.tsx
import { CareerModal } from "@/features/player/components/CareerModal";

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CareerModal />   {/* ← Đặt một lần ở layout, không lặp lại */}
    </>
  );
}
```

### Bước 4: Tạo Dialog component

```tsx
// features/player/components/CareerModal.tsx
"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePlayerModalStore } from "@/features/player/stores/usePlayerModalStore";
import { useCareerPlayerQuery } from "@/features/player/queries/useCareerPlayerQuery";
import { OvrChart } from "./OvrChart";
import { ClubTimeline } from "./ClubTimeline";
import { PlayerCard } from "./PlayerCard";

export function CareerModal() {
  const { isOpen, selectedPlayerId, closeModal } = usePlayerModalStore();

  const { data: player, isLoading } = useCareerPlayerQuery(selectedPlayerId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
      <DialogContent className="max-w-xl overflow-auto p-0">
        {isLoading && <CareerModalSkeleton />}
        {player && (
          <>
            {/* Header — Player Card */}
            <div className="flex items-start gap-4 border-b border-border p-6">
              <PlayerCard player={player} size="sm" />
              <div className="flex-1 space-y-1">
                <p className="text-xs font-medium uppercase tracking-widest text-foreground-muted">
                  Career Overview
                </p>
                <h2 className="text-xl font-bold text-foreground">{player.name}</h2>
                <p className="text-sm text-foreground-muted">
                  {player.nationality} · {player.position} · Debut {player.debutAge}
                </p>
              </div>
            </div>

            {/* OVR chart */}
            <div className="border-b border-border px-6 py-4">
              <OvrChart timeline={player.statsTimeline} />
            </div>

            {/* Club timeline */}
            <div className="px-6 py-4">
              <ClubTimeline stints={player.clubStints} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 3. Pattern B — Local State + Dialog

Dùng cho confirm dialog đơn giản trong một component:

```tsx
// features/wheel/components/WheelSpinScreen.tsx
"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function WheelSpinScreen({ onExit }: { onExit: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleConfirmExit() {
    setConfirmOpen(false);
    onExit();
  }

  return (
    <>
      {/* Wheel UI... */}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <button
            className="text-sm text-foreground-muted underline-offset-4 hover:underline"
            onClick={() => setConfirmOpen(true)}
          >
            Thoát
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bỏ wheel spin hiện tại?</AlertDialogTitle>
            <AlertDialogDescription>
              Tiến trình spin sẽ bị mất. Slot sẽ vẫn trống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục spin</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit}>
              Thoát
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

## 4. Quy tắc khi tạo modal mới

### Về Zustand store

- Chỉ lưu `isOpen` và `selectedId` (hoặc minimal selection state).
- Không lưu player data trong store — dùng TanStack Query hook với `selectedId`.
- Không lưu game truth hay computed data.

### Về Dialog component

- Đặt Dialog component ở **layout hoặc page level** — không lặp lại trong nhiều component con.
- Luôn handle `onOpenChange` để sync Zustand store khi user đóng bằng Escape hoặc backdrop.
- Cung cấp `aria-label` hoặc `DialogTitle` để accessible.

### Về data fetching trong modal

- Dùng TanStack Query hook bên trong Dialog component.
- Dùng `enabled: !!selectedId` để chỉ fetch khi modal đang mở và có selection.
- Hiển thị skeleton khi `isLoading`.
- Hiển thị error state khi query thất bại.

```tsx
const { data: player, isLoading, isError } = useCareerPlayerQuery(selectedPlayerId);
// selectedPlayerId là null khi modal đóng → query disabled tự động
```

### Về mutation trong modal

- Mutation được phép trong modal nếu action rõ ràng (VD: delete player).
- Sau mutation success, đóng modal và invalidate query.
- Không optimistically update data trong modal — chờ server response.

```tsx
const deleteMutation = useDeleteCareerPlayerMutation(gameId);

async function handleDelete() {
  await deleteMutation.mutateAsync(player.id);
  closeModal(); // đóng modal sau khi delete thành công
}
```

---

## 5. Danh sách modals trong Football Life

| Modal | Pattern | Store | Trigger từ |
|---|---|---|---|
| **Career Detail Modal** | Zustand + Dialog | `usePlayerModalStore` | `SlotDisc` (filled) |
| **Delete Game Confirm** | Zustand + AlertDialog | `useDeleteGameStore` | `GameCard`, Game header |
| **Exit Wheel Confirm** | Local State + AlertDialog | Local `useState` | Wheel screen exit button |

---

## 6. Rules cho AI agent

Khi tạo modal mới, AI agent phải:

1. Xác định pattern phù hợp (Zustand store hay local state) theo bảng trên.
2. Nếu dùng Zustand — tạo store trong `features/<domain>/stores/use<Name>Store.ts`.
3. Dialog component đặt tại `features/<domain>/components/<Name>Modal.tsx`.
4. Mount Dialog **một lần duy nhất** tại layout hoặc page — không mount trong component con.
5. Handle `onOpenChange` để đồng bộ store khi user đóng bằng Escape hoặc backdrop click.
6. Fetch data trong Dialog bằng TanStack Query hook — không truyền data qua store.
7. Dùng `enabled: !!selectedId` trong query hook.
8. Hiển thị skeleton loading, empty state, và error state.
9. Không chứa business logic hay game calculation trong modal component.
10. Không lưu player data hay game truth trong Zustand store của modal.
11. Nếu modal có action (delete, confirm), mutation phải invalidate đúng query keys.

---

## 7. Test checklist

Khi thêm modal mới hoặc sửa behavior modal:

- [ ] `openModal(id)` → Dialog render với đúng data.
- [ ] `closeModal()` → Dialog biến mất, `selectedId` reset về `null`.
- [ ] Escape key hoặc backdrop click → `onOpenChange(false)` → store closed.
- [ ] Query có `enabled: !!selectedId` → không fetch khi modal đóng.
- [ ] Skeleton hiển thị khi `isLoading`.
- [ ] Error state hiển thị khi query thất bại.
- [ ] Mutation trong modal invalidate đúng query keys sau success.
- [ ] Dialog mount một lần ở layout — không bị duplicate.

Chạy:

```bash
npm run typecheck
npm test
```

---

## 8. File tham khảo

```txt
features/player/stores/usePlayerModalStore.ts     Career modal store
features/player/components/CareerModal.tsx         Career modal component
features/player/queries/useCareerPlayerQuery.ts    Data query trong modal

components/ui/dialog.tsx                           shadcn/ui Dialog primitive
components/ui/alert-dialog.tsx                     shadcn/ui AlertDialog primitive
```
