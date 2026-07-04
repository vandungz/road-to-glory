# AI Agent Rules — Football Life

AI agents modifying this codebase must preserve the **integrity of the Career simulation model** and the **Wheel Engine's deterministic nature**.

---

## Required Behavior

### Before Making Changes

- Read the relevant feature folder (`features/<domain>/`) and its service files before modifying behavior.
- Read [`AGENTS.md`](../AGENTS.md) to understand architectural boundaries.
- Check `types/` for existing domain types before creating new ones.

### Code Placement

- Put **game business logic** (wheel calculations, career progression, transfer resolution) in `features/<domain>/services/` or `lib/`.
- Put **UI rendering** in `components/` or `features/<domain>/components/`.
- Put **data fetching** in Server Components or TanStack Query hooks — not inside event handlers.
- Put **Server Actions** in `actions/` — keep them thin, delegate to services.
- Put **Prisma queries** in dedicated data-access functions, never inline in components.

### Wheel Engine Safety

- Weight calculations must remain **pure and deterministic** — same inputs → same weights, always.
- The final `Math.random()` spin call may only happen inside the designated spin resolver function (`lib/wheel-engine/`).
- Every spin must produce a logged `WheelSpin` record before any `CareerState` mutation occurs.
- Never hardcode weights — always derive from `CareerState` modifiers.

### Career State Safety

- Career state is the **single source of truth** for all game data.
- Mutations to `CareerState` must go through service functions that return a new state object.
- Every meaningful career event must append a `CareerEvent` to the event log before returning.
- Do not mutate career state from within UI event handlers or Zustand actions.

### Type Safety

- Use **strict TypeScript** (`strict: true`). Do not use `any`.
- When adding a new wheel outcome type, extend the `WheelOutcome` discriminated union — do not add loose string fields.
- Validate all incoming server action inputs with **Zod schemas** before passing to services.

---

## Forbidden Behavior

- ❌ Do not use `Math.random()` anywhere except the final spin resolver in `lib/wheel-engine/`.
- ❌ Do not store `CareerState`, wheel weights, or transfer offers in Zustand.
- ❌ Do not write business logic inside React components or Server Actions.
- ❌ Do not create feature-local duplicate types that shadow the canonical types in `types/`.
- ❌ Do not bypass Prisma/Supabase by writing raw SQL inline in components or actions.
- ❌ Do not use `any` — use proper discriminated unions and generics.
- ❌ Do not import server-only modules (`prisma`, `supabase-admin`) in client components.
- ❌ Do not hardcode football data (clubs, leagues, players) — always read from the database.

---

## Safe Change Pattern

Follow this sequence when adding or modifying a feature:

1. **Define or update domain types** in `types/` (entities, wheel outcomes, career events).
2. **Add or update Zod schemas** for validation.
3. **Write or extend the service function** in `features/<domain>/services/` with unit tests.
4. **Add or update the Prisma query** / data-access layer if persistence is involved.
5. **Create or update the Server Action** in `actions/` (thin — validate + delegate).
6. **Add TanStack Query hook** if the feature needs client-side data fetching.
7. **Update Zustand store** only if there is new transient UI state needed (e.g., new modal, new animation state).
8. **Build the UI component** that reads from query hooks and dispatches server actions.
9. **Test** — unit test services, verify spin outcomes produce correct state transitions.

---

## Wheel Change Pattern

When modifying any wheel type (Training, Match, Club, Transfer, Award, Life):

1. Update the outcome type in `types/wheel.ts`.
2. Update the weight modifier function in `lib/wheel-engine/`.
3. Update the outcome resolver for that wheel type.
4. Update the `CareerEvent` log schema if a new event category is introduced.
5. Verify that the formula `Final Weight = Base + Career + Season + Momentum + HiddenStats + SpecialEvent` still holds.
6. Do not change the spin resolver's random call — only change the weight inputs fed into it.

---

## Data Import / Seeding Rules

- Football data scripts live in `scripts/` only.
- Never commit raw CSVs or unprocessed data to the repo — only processed, normalized data goes into the database.
- Player `overall` and `potential` values must remain read-only at runtime — they are reference data, not mutable game state.

---

## Framer Motion / Animation Rules

**Stack:** `framer-motion@12.x` + `react@19.x` + `next@15.x`

### Hydration Invariant — `AnimatePresence`

`AnimatePresence` từ Framer Motion 12 sử dụng React 19's `Activity` API nội bộ. Điều này tạo ra `<div hidden={true}>` phía server nhưng hydrate thành `hidden={null}` phía client — gây **Recoverable Hydration Error**.

**Rule bắt buộc:** Bất kỳ component nào dùng `AnimatePresence` đều phải áp dụng `isMounted` pattern:

```tsx
// ✅ ĐÚNG — defer AnimatePresence đến sau hydration
"use client";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";

export function MyComponent() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      {/* UI không liên quan đến animation render bình thường */}

      {isMounted && (
        <AnimatePresence>
          {isOpen && <motion.div .../>}
        </AnimatePresence>
      )}
    </>
  );
}
```

```tsx
// ❌ SAI — AnimatePresence render thẳng từ server
export function MyComponent() {
  return (
    <AnimatePresence>
      {isOpen && <motion.div .../>}
    </AnimatePresence>
  );
}
```

**Scope:** Rule này áp dụng cho **tất cả** `AnimatePresence` trong project — kể cả những cái bên trong form, nested trong component khác, hay dùng làm error message container.

**Tại sao không dùng `suppressHydrationWarning`:** `suppressHydrationWarning` chỉ che lỗi, không fix nguyên nhân. `isMounted` pattern loại bỏ mismatch tại gốc.

---

## References

- Architecture overview: [`AGENTS.md`](../AGENTS.md)
- Project planning: [`docs/Football_Life_Project_Planning_Document.md`](Football_Life_Project_Planning_Document.md)
