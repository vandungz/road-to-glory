# Frontend Style System Guide — Football Life

## 1. Mục tiêu của tài liệu

Tài liệu này định nghĩa hệ thống styling, layout và quy tắc giao diện cho Football Life — một web game mô phỏng sự nghiệp cầu thủ bóng đá. Mục tiêu là giúp mọi developer và AI coding agent tạo UI nhất quán, dễ mở rộng và dễ bảo trì.

Các mục tiêu chính:

- Giữ giao diện nhất quán giữa các màn hình: Squad XI board, Wheel spin, Player card, Career modal.
- Tránh styling ngẫu nhiên theo từng file hoặc từng người viết code.
- Duy trì một design system có thể mở rộng khi thêm mode và feature mới.
- Giúp AI agent sinh code UI theo đúng quy chuẩn thay vì tự sáng tạo màu sắc, spacing hoặc layout.
- Ngăn tình trạng CSS hỗn loạn, class Tailwind quá dài, inline style tùy tiện và magic number khó kiểm soát.

Nguyên tắc cốt lõi: UI phải được tạo từ token, component, layout pattern và utility đã thống nhất. Nếu cần một biến thể mới, hãy kiểm tra pattern hiện có trước khi thêm mới.

---

## 2. Design Philosophy

Football Life là một **game**, không phải dashboard hay app quản lý. UI cần tạo cảm giác **sport editorial meets game board** — đậm chất bóng đá, có chiều sâu tường thuật, nhưng vẫn rõ ràng và functional.

Lấy cảm hứng aesthetic từ [7a0.org](https://7a0.org/en):

- **Paper/cream nền** → cảm giác match programme, editorial bóng đá.
- **Dark bold condensed typography** → tiêu đề mạnh mẽ, số liệu rõ ràng.
- **Grass green** → pitch, active state, accent chính.
- **Gold/amber** → trophy, award, rarity highlight.
- **Tối giản nhưng có cá tính** → không thừa decoration, mỗi thành phần có lý do tồn tại.

Triết lý thiết kế:

- Game feel > productivity app feel.
- Bold typography > decoration.
- Pitch metaphor > generic card UI.
- Intentional color > màu ngẫu nhiên.
- Smooth reveal > instant state change.
- Sport editorial > SaaS dashboard.

Hướng thẩm mỹ cụ thể:

- Nền cream/paper để tạo feel in ấn, không phải nền trắng lạnh hoặc đen tối hoàn toàn.
- Typography đậm, condensed cho heading lớn; clean, readable cho body và stats.
- Màu xanh lá (pitch green) là màu primary — gắn liền với bóng đá.
- Gold/amber chỉ dùng cho trophy, award, card rarity cao — không dùng tùy tiện.
- Tránh gradient nặng, shadow quá sâu, nhiều màu cùng lúc.
- Animation phải phục vụ game feel (wheel spin, card reveal) — không dùng để trang trí thuần túy.

---

## 3. Theme System

### 3.1 Color Palette

Không hardcode màu. Mọi màu phải đến từ CSS variable hoặc Tailwind token.

#### Semantic Tokens

```txt
Background    Nền tổng thể app — cream/paper tone
Surface       Nền card, panel, modal — cream nhạt hơn một chút
Surface-muted Nền phụ — toolbar, table header, empty slot
Surface-raised Nền nổi — dropdown, popover, tooltip

Foreground    Text chính
Foreground-muted Text phụ — metadata, caption, label phụ
Foreground-disabled Text không khả dụng

Primary       Pitch green — hành động chính, active state, accent
Primary-fg    Text trên nền primary
Gold          Trophy / Award / Rarity highlight
Gold-fg       Text trên nền gold

Border        Đường viền component, divider
Border-strong Viền nổi bật hơn — card active, focused element

Danger        Lỗi, injury, negative event
Success       Goal, award, positive event
Warning       Caution, trạng thái cần chú ý
```

#### Palette Values (HSL — Dark mode là primary)

```css
/* CSS Variables — đặt trong :root hoặc [data-theme] */

/* Background system — paper/cream tone */
--background:      42 25% 94%;      /* #f2ede3 — cream paper */
--surface:         40 20% 97%;      /* #f8f5ef — lighter cream */
--surface-muted:   40 15% 90%;      /* #e8e2d8 — muted cream */
--surface-raised:  0 0% 100%;       /* #ffffff — pure white for overlays */

/* Text */
--foreground:      30 15% 12%;      /* #1f1a14 — near-black warm */
--foreground-muted: 30 10% 45%;     /* #7a7060 — warm gray */
--foreground-disabled: 30 8% 65%;   /* #aca99f — very muted */

/* Primary — pitch green */
--primary:         142 45% 28%;     /* #266b3e — dark pitch green */
--primary-light:   142 40% 38%;     /* #3a9154 — hover state */
--primary-fg:      0 0% 100%;       /* white text on green */

/* Gold — trophy / award */
--gold:            43 80% 48%;      /* #d4960d — rich gold */
--gold-light:      43 80% 92%;      /* #fdf3d3 — gold tint background */
--gold-fg:         30 15% 12%;      /* dark text on gold */

/* State colors */
--danger:          4 72% 45%;       /* #c43a2a */
--danger-muted:    4 72% 95%;       /* #fce8e6 */
--success:         142 50% 35%;     /* #2d8247 */
--success-muted:   142 50% 93%;     /* #e5f5ea */
--warning:         38 90% 48%;      /* #e08c0a */
--warning-muted:   38 90% 93%;      /* #fef3da */

/* Border */
--border:          35 20% 82%;      /* #d6cfc2 — warm light border */
--border-strong:   35 25% 65%;      /* #b5a98e — stronger border */

/* Ring (focus) */
--ring:            142 45% 28%;     /* same as primary */
```

#### Dark mode

Dark mode dùng cùng tên token, chỉ khác giá trị. Override bằng `[data-theme="dark"]` hoặc `.dark`:

```css
[data-theme="dark"] {
  --background:      220 15% 10%;
  --surface:         220 12% 14%;
  --surface-muted:   220 10% 18%;
  --surface-raised:  220 12% 20%;
  --foreground:      40 20% 92%;
  --foreground-muted: 40 10% 55%;
  --border:          220 12% 24%;
  --border-strong:   220 12% 35%;
}
```

### 3.2 Card Rarity Colors

Player card có 6 mức rarity, mỗi mức có màu riêng:

```css
--rarity-bronze:     24 55% 52%;     /* #c67838 */
--rarity-silver:     210 12% 60%;    /* #8fa0ad */
--rarity-gold:       43 80% 48%;     /* #d4960d — same as --gold */
--rarity-rare-gold:  43 90% 42%;     /* #c48500 — deeper gold */
--rarity-epic:       270 55% 52%;    /* #7c42c4 — purple */
--rarity-legendary:  — (animated gradient, defined in component)
```

### 3.3 Usage Rules

- ❌ Không hardcode màu trong component: `bg-green-700`, `text-yellow-500`, `border-gray-300`.
- ❌ Không dùng arbitrary color: `bg-[#266b3e]`.
- ✅ Dùng semantic token: `bg-primary`, `text-foreground-muted`, `border-border`.
- ❌ Không dùng nhiều màu khác nhau để biểu thị cùng một ý nghĩa.
- ❌ Không dùng màu chỉ để trang trí nếu không tăng khả năng hiểu giao diện.

Ví dụ tốt:

```tsx
<div className="border border-border bg-surface text-foreground">
  <p className="text-sm text-foreground-muted">Debut Age</p>
  <p className="text-2xl font-bold">17</p>
</div>
```

Ví dụ không nên dùng:

```tsx
<div className="border border-gray-300 bg-[#f8f5ef] text-slate-800">
  <p className="text-[13px] text-gray-500">Debut Age</p>
  <p className="text-[26px] font-bold">17</p>
</div>
```

---

## 4. Typography System

### 4.1 Font Stack

Football Life dùng hai font gia đình:

**Display / Heading** — Bold, condensed, sport editorial feel:

```txt
"Bebas Neue", "Impact", ui-sans-serif
```
Dùng cho: số OVR lớn, tiêu đề Squad Rating, heading game lớn.

**Body / UI** — Clean, readable, neutral:

```txt
"Inter", ui-sans-serif, system-ui, sans-serif
```
Dùng cho: toàn bộ UI text, label, stats, metadata.

Cấu hình trong Tailwind:

```ts
fontFamily: {
  sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
  display: ["Bebas Neue", "Impact", "ui-sans-serif"],
  mono: ["SFMono-Regular", "Consolas", "Liberation Mono", "Menlo", "monospace"],
}
```

### 4.2 Typography Scale

```txt
text-xs      12px — metadata, badge nhỏ, timestamp, helper text
text-sm      14px — body text mặc định, form label, table cell
text-base    16px — body text đọc dài, mô tả, section body
text-lg      18px — section heading nhỏ
text-xl      20px — panel title, card title
text-2xl     24px — page heading, modal title
text-3xl     30px — hero number (OVR lớn)
text-4xl+    dùng font-display cho số/tiêu đề game đặc biệt
```

### 4.3 Font Weight

```txt
font-normal    (400) body text, table cell, mô tả
font-medium    (500) label, table header, UI button
font-semibold  (600) panel title, card name, section heading
font-bold      (700) page title, số OVR trong card
font-black     (900) dùng với font-display cho hero number
```

### 4.4 Sport-Specific Typography Patterns

**OVR Number** (số overall trên card):

```tsx
<span className="font-display text-4xl font-black text-foreground">83</span>
```

**Eyebrow Label** (như 7a0.org — label nhỏ uppercase trước heading):

```tsx
<span className="text-xs font-medium uppercase tracking-widest text-foreground-muted">
  Classic Mode
</span>
```

**Stat Pair** (label + value cạnh nhau):

```tsx
<div className="flex flex-col items-center gap-0.5">
  <span className="text-xs font-medium uppercase text-foreground-muted">PAC</span>
  <span className="text-base font-bold text-foreground">88</span>
</div>
```

**Position Badge**:

```tsx
<span className="text-xs font-bold uppercase tracking-wider text-primary">ST</span>
```

### 4.5 Rules

- Tránh `text-[13px]`, `text-[22px]` — dùng scale có sẵn.
- Không dùng heading quá lớn chỉ để đẹp — phải phục vụ hierarchy.
- Tối đa 3 cấp typography rõ ràng trong một màn hình.
- Font display chỉ dùng cho số/tiêu đề game nổi bật, không dùng cho body text.

---

## 5. Spacing System

Dựa trên Tailwind default spacing scale. Không dùng arbitrary pixel values.

### Spacing thường dùng

```txt
gap-1      4px   — icon + text rất gần
gap-2      8px   — icon + text, chip group items
gap-3      12px  — form field group nhỏ
gap-4      16px  — card content, section items mặc định
gap-6      24px  — section lớn, panel group
gap-8      32px  — vùng layout chính

p-2        8px   — chip, badge nhỏ
p-3        12px  — button, toolbar item
p-4        16px  — card body, panel compact
p-5        20px  — card body mặc định
p-6        24px  — modal body, section lớn

px-3 py-1.5    button nhỏ
px-4 py-2      button mặc định
px-6 py-4      modal header/footer
```

### Vertical rhythm

- Card content: `space-y-3` hoặc `space-y-4`.
- Form field group: `space-y-2`.
- Section stack: `space-y-6`.
- Stat row: `gap-4` hoặc `gap-6`.

### Rules

- Ưu tiên `gap` và `space-y` thay vì margin rải rác.
- Không dùng `pt-[19px]`, `mb-[13px]` — luôn dùng scale Tailwind.
- Các vùng tương đương phải có spacing tương đương.

---

## 6. Layout System

### 6.1 App Shell

Football Life là **web game** nên layout khác với app quản lý:

```txt
AppShell
 ├── Header (nav đơn giản: logo + menu)
 └── Main Content
      ├── Squad XI Board View (màn hình chính)
      ├── Wheel Spin View (overlay hoặc full)
      └── Career Modal (overlay)
```

### 6.2 Squad XI Board Layout

```tsx
<div className="min-h-screen bg-background">
  <header className="border-b border-border bg-surface px-6 py-4">
    {/* Nav */}
  </header>
  <main className="mx-auto max-w-5xl px-4 py-8">
    {/* Formation board */}
  </main>
</div>
```

### 6.3 Pitch / Formation Board

Pitch board dùng **relative positioning** với percentage-based slot placement (như 7a0.org):

```tsx
<div className="relative aspect-[3/4] w-full max-w-sm rounded-xl bg-pitch-green">
  {/* Pitch markings SVG */}
  {slots.map(slot => (
    <button
      style={{ left: slot.x, top: slot.y }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
    >
      {/* Slot disc */}
    </button>
  ))}
</div>
```

Pitch green color token:

```css
--pitch:         142 55% 22%;    /* #1e5c32 — deep grass green */
--pitch-light:   142 45% 30%;    /* #2e7a46 — lighter stripe */
--pitch-mark:    0 0% 100% / 0.3; /* white semi-transparent markings */
```

### 6.4 Wheel Spin View

Wheel spin dùng **full-screen overlay** hoặc replace main content area:

```tsx
<div className="fixed inset-0 z-40 flex items-center justify-center bg-background/95 backdrop-blur-sm">
  <div className="flex w-full max-w-lg flex-col items-center gap-6 px-4">
    {/* Step indicator */}
    {/* Active wheel */}
    {/* Previous steps summary strip */}
    {/* Continue button */}
  </div>
</div>
```

### 6.5 Career Detail Modal

```tsx
<div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm">
  <div className="fixed inset-y-0 right-0 w-full max-w-xl overflow-auto bg-surface shadow-xl">
    {/* Header */}
    {/* Player card */}
    {/* OVR chart */}
    {/* Club career timeline */}
    {/* Stats */}
  </div>
</div>
```

### 6.6 Max Width Constraints

```txt
max-w-sm    384px   Pitch board, player card
max-w-md    448px   Wheel spin panel
max-w-xl    576px   Career modal
max-w-3xl   768px   Game list, home section
max-w-5xl   1024px  Main layout container
```

---

## 7. Component Patterns

### 7.1 Player Card

Card được thiết kế theo kiểu FIFA card nhưng có visual identity riêng.

**Cấu trúc**:

```tsx
<div className={cn(
  "relative flex flex-col rounded-xl border-2 p-4",
  "aspect-[2/3] w-36",
  rarityStyles[rarity],
)}>
  {/* Top row: OVR + Position + Flag */}
  <div className="flex items-start justify-between">
    <div className="flex flex-col">
      <span className="font-display text-3xl font-black leading-none">{ovr}</span>
      <span className="text-xs font-bold uppercase tracking-wider">{position}</span>
    </div>
    <span className="text-lg">{flag}</span>
  </div>

  {/* Player silhouette / avatar */}
  <div className="flex-1 flex items-center justify-center">
    {/* avatar */}
  </div>

  {/* Name */}
  <p className="text-center text-sm font-semibold truncate">{name}</p>

  {/* Stats row */}
  <div className="grid grid-cols-3 gap-1 mt-2">
    {stats.map(s => (
      <div key={s.key} className="flex flex-col items-center">
        <span className="text-[10px] font-medium uppercase">{s.key}</span>
        <span className="text-xs font-bold">{s.value}</span>
      </div>
    ))}
  </div>
</div>
```

**Rarity styles**:

```ts
const rarityStyles = {
  bronze:     "border-[--rarity-bronze] bg-gradient-to-b from-amber-900/20 to-amber-700/10",
  silver:     "border-[--rarity-silver] bg-gradient-to-b from-slate-400/20 to-slate-300/10",
  gold:       "border-[--rarity-gold] bg-gradient-to-b from-yellow-600/20 to-yellow-400/10",
  rare_gold:  "border-[--rarity-rare-gold] bg-gradient-to-b from-yellow-700/30 to-yellow-500/15",
  epic:       "border-[--rarity-epic] bg-gradient-to-b from-purple-600/20 to-purple-400/10",
  legendary:  "border-transparent bg-gradient-to-b from-pink-500/20 via-yellow-500/20 to-cyan-500/20 animate-shimmer",
}
```

### 7.2 Slot Disc (Formation Slot)

Slot trên pitch — empty hoặc filled:

```tsx
{/* Empty slot */}
<button className={cn(
  "absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center",
  "rounded-full border-2 border-dashed border-white/50 bg-white/10",
  "text-white transition-colors hover:border-white hover:bg-white/20",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
)}>
  <span className="text-xs font-bold uppercase">{position}</span>
</button>

{/* Filled slot */}
<button className={cn(
  "absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center",
  "rounded-full border-2 border-white bg-white",
  "text-foreground transition-transform hover:scale-110",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
)}>
  <span className="text-[10px] font-bold">{jerseyNumber}</span>
  <span className="text-[9px] font-medium truncate max-w-[40px]">{shortName}</span>
</button>
```

### 7.3 Wheel Component

Wheel dùng **SVG segments** với Framer Motion cho animation:

```tsx
<div className="relative mx-auto aspect-square w-64">
  <motion.svg
    viewBox="0 0 200 200"
    animate={{ rotate: targetDegrees }}
    transition={{ duration: 3, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {segments.map((seg, i) => (
      <WheelSegment key={i} segment={seg} index={i} total={segments.length} />
    ))}
  </motion.svg>
  {/* Center pointer */}
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="h-3 w-3 rounded-full bg-foreground" />
  </div>
</div>
```

### 7.4 Chip / Mode Selector

Như 7a0.org — compact button group để chọn option:

```tsx
<div className="flex flex-wrap gap-2" role="group">
  {options.map(opt => (
    <button
      key={opt.value}
      className={cn(
        "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected === opt.value
          ? "border-primary bg-primary text-primary-fg"
          : "border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-muted",
      )}
    >
      {opt.label}
    </button>
  ))}
</div>
```

### 7.5 Eyebrow + Heading Pattern

Pattern label nhỏ + heading lớn (dùng nhiều trong game UI):

```tsx
<div className="space-y-1">
  <span className="text-xs font-medium uppercase tracking-widest text-foreground-muted">
    {eyebrow}
  </span>
  <h2 className="text-2xl font-bold text-foreground">{heading}</h2>
</div>
```

### 7.6 Buttons

**Primary** (hành động chính — spin, confirm):

```tsx
<button className={cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-6",
  "bg-primary text-primary-fg text-sm font-semibold",
  "transition-colors hover:bg-primary-light",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:pointer-events-none disabled:opacity-50",
)}>
  {children}
</button>
```

**Outline** (hành động phụ):

```tsx
<button className={cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-6",
  "border border-border bg-surface text-foreground text-sm font-medium",
  "transition-colors hover:bg-surface-muted hover:border-border-strong",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "disabled:pointer-events-none disabled:opacity-50",
)}>
  {children}
</button>
```

**Ghost** (subtle):

```tsx
<button className={cn(
  "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3",
  "text-sm font-medium text-foreground-muted",
  "transition-colors hover:bg-surface-muted hover:text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
)}>
  {children}
</button>
```

---

## 8. Animation Rules

Football Life là game — animation có vai trò quan trọng trong game feel, nhưng phải có mục đích và không làm chậm UX.

### 8.1 Game Animations (Framer Motion)

| Animation | Duration | Easing | Mục đích |
|---|---|---|---|
| Wheel spin | 2.5–3.5s | `[0.25, 0.1, 0.25, 1]` (ease-out) | Tạo tension, drama |
| Card reveal | 0.6s | `spring(stiffness: 260, damping: 20)` | Satisfying reveal |
| Slot fill | 0.4s | `spring` | Feedback khi fill slot |
| Modal open | 0.3s | ease-out | Drawer slide in |
| Result flash | 0.2s | ease-in-out | Highlight winning segment |

### 8.2 UI Animations (Tailwind transition)

```txt
transition-colors duration-150   Hover state color change
transition-transform duration-200 Scale effect on hover
transition-opacity duration-200  Fade in/out
```

### 8.3 Rules

- ❌ Không animate layout lớn gây reflow.
- ❌ Không dùng `transition-all` — chỉ animate property cụ thể.
- ❌ Không bounce, overshoot trừ trong wheel spin có chủ đích.
- ✅ Wheel spin PHẢI có deceleration rõ ràng (ease-out cuối).
- ✅ Card reveal nên có flip hoặc scale effect để tạo cảm giác satisfying.
- ✅ Slot disc khi được fill nên có pop animation nhỏ.
- ❌ Không animate liên tục trừ loading indicator hoặc legendary card shimmer.

### 8.4 Wheel Spin Easing

```ts
// Wheel spin: accelerate fast, decelerate slow
const wheelEasing = [0.12, 0, 0.39, 1]; // cubic-bezier

// Card reveal: spring
const cardReveal = { type: "spring", stiffness: 260, damping: 20 };
```

---

## 9. Icon System

Dùng `lucide-react` làm icon system mặc định. Không trộn icon pack.

### Icon sizes

```txt
size-3   10px   Rất hiếm — metadata cực nhỏ
size-4   16px   Mặc định UI button, toolbar, list
size-5   20px   Section icon, modal close
size-6   24px   Empty state, prominent action
```

### Icon usage trong game context

- Trophy icon: dùng cho career events trophy.
- Star icon: dùng cho individual awards, rating highlight.
- Flag icons: dùng emoji flag thay vì SVG icon pack.
- Jersey number: dùng text, không phải icon.

---

## 10. State Styling Rules

### States cần hỗ trợ

```txt
hover       Phản hồi nhẹ khi hover
active      Đang nhấn hoặc đang active
focused     Focus ring bắt buộc cho accessibility
disabled    Không thể tương tác — opacity + pointer-events
loading     Spin animation + disable action
selected    Rõ hơn hover, dùng primary color
filled      Slot đã có player — khác với empty slot rõ ràng
error       Danger token + text giải thích
```

### Standard states

**Focus**:

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

**Disabled**:

```tsx
className="disabled:pointer-events-none disabled:opacity-50"
```

**Loading**:

```tsx
{isLoading && <Loader2 className="size-4 animate-spin" />}
```

**Selected (chip)**:

```tsx
className={cn(
  "border border-border",
  selected && "border-primary bg-primary text-primary-fg",
)}
```

**Empty vs Filled slot**:

```tsx
className={cn(
  "rounded-full border-2 transition-all",
  isEmpty
    ? "border-dashed border-white/50 bg-white/10 hover:border-white hover:bg-white/20"
    : "border-white bg-white text-foreground hover:scale-110",
)}
```

---

## 11. Empty State Rules

Mọi màn hình và section cần có empty state. Không để vùng trắng không có context.

### Empty slot trên pitch

```tsx
<button className="... border-dashed ...">
  <span className="text-xs font-bold uppercase text-white/70">{position}</span>
</button>
```

### No games yet

```tsx
<div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
  <p className="text-base font-semibold text-foreground">Chưa có Squad nào</p>
  <p className="text-sm text-foreground-muted">Tạo game mới để bắt đầu xây dựng Squad XI đầu tiên.</p>
  <button className="...">Tạo Game Mới</button>
</div>
```

### Wheel has no result yet

```tsx
<div className="flex h-32 items-center justify-center text-sm text-foreground-muted">
  Spin wheel để bắt đầu.
</div>
```

---

## 12. Responsive Rules

Football Life là web game, tối ưu desktop nhưng cần chơi được trên mobile.

### Breakpoint strategy

```txt
default (mobile)   320px+   Single column, pitch full width
sm                 640px    Wider layout
md                 768px    Pitch + side panel có thể hiện
lg                 1024px   Full layout desktop — primary target
xl                 1280px   Wide desktop
```

### Pitch board responsive

- Mobile: pitch chiếm full width màn hình.
- Desktop: pitch ở bên trái, info panel ở bên phải.

```tsx
<div className="flex flex-col gap-6 lg:flex-row lg:items-start">
  <div className="mx-auto w-full max-w-sm lg:mx-0">
    {/* Pitch */}
  </div>
  <div className="flex-1">
    {/* Squad info, game actions */}
  </div>
</div>
```

### Wheel spin

- Mobile: full screen overlay.
- Desktop: centered panel trong overlay.

### Career modal

- Mobile: full screen bottom sheet hoặc full screen modal.
- Desktop: right side drawer `max-w-xl`.

---

## 13. Tailwind Config

### tailwind.config.ts

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background:       "hsl(var(--background))",
        foreground:       "hsl(var(--foreground))",
        "foreground-muted":    "hsl(var(--foreground-muted))",
        "foreground-disabled": "hsl(var(--foreground-disabled))",
        surface:          "hsl(var(--surface))",
        "surface-muted":  "hsl(var(--surface-muted))",
        "surface-raised": "hsl(var(--surface-raised))",
        border:           "hsl(var(--border))",
        "border-strong":  "hsl(var(--border-strong))",
        ring:             "hsl(var(--ring))",
        primary: {
          DEFAULT:        "hsl(var(--primary))",
          light:          "hsl(var(--primary-light))",
          fg:             "hsl(var(--primary-fg))",
        },
        gold: {
          DEFAULT:        "hsl(var(--gold))",
          light:          "hsl(var(--gold-light))",
          fg:             "hsl(var(--gold-fg))",
        },
        pitch: {
          DEFAULT:        "hsl(var(--pitch))",
          light:          "hsl(var(--pitch-light))",
        },
        danger:           "hsl(var(--danger))",
        "danger-muted":   "hsl(var(--danger-muted))",
        success:          "hsl(var(--success))",
        "success-muted":  "hsl(var(--success-muted))",
        warning:          "hsl(var(--warning))",
        "warning-muted":  "hsl(var(--warning-muted))",
      },
      fontFamily: {
        sans:    ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Bebas Neue", "Impact", "ui-sans-serif"],
        mono:    ["SFMono-Regular", "Consolas", "Liberation Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        sm:  "calc(var(--radius) - 2px)",
        md:  "var(--radius)",
        lg:  "calc(var(--radius) + 2px)",
        xl:  "calc(var(--radius) + 6px)",
        "2xl": "calc(var(--radius) + 10px)",
      },
      boxShadow: {
        sm:      "var(--shadow-sm)",
        md:      "var(--shadow-md)",
        overlay: "var(--shadow-overlay)",
        card:    "var(--shadow-card)",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "200% center" },
          "100%": { backgroundPosition: "-200% center" },
        },
      },
      animation: {
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
```

### CSS Variables setup (globals.css)

```css
@import url("https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap");

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background:      42 25% 94%;
    --surface:         40 20% 97%;
    --surface-muted:   40 15% 90%;
    --surface-raised:  0 0% 100%;
    --foreground:      30 15% 12%;
    --foreground-muted: 30 10% 45%;
    --foreground-disabled: 30 8% 65%;
    --primary:         142 45% 28%;
    --primary-light:   142 40% 38%;
    --primary-fg:      0 0% 100%;
    --gold:            43 80% 48%;
    --gold-light:      43 80% 92%;
    --gold-fg:         30 15% 12%;
    --pitch:           142 55% 22%;
    --pitch-light:     142 45% 30%;
    --danger:          4 72% 45%;
    --danger-muted:    4 72% 95%;
    --success:         142 50% 35%;
    --success-muted:   142 50% 93%;
    --warning:         38 90% 48%;
    --warning-muted:   38 90% 93%;
    --border:          35 20% 82%;
    --border-strong:   35 25% 65%;
    --ring:            142 45% 28%;
    --radius:          0.5rem;
    --shadow-sm:       0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md:       0 4px 6px -1px rgb(0 0 0 / 0.1);
    --shadow-overlay:  0 20px 25px -5px rgb(0 0 0 / 0.15);
    --shadow-card:     0 2px 8px 0 rgb(0 0 0 / 0.08);
  }

  [data-theme="dark"] {
    --background:      220 15% 10%;
    --surface:         220 12% 14%;
    --surface-muted:   220 10% 18%;
    --surface-raised:  220 12% 20%;
    --foreground:      40 20% 92%;
    --foreground-muted: 40 10% 55%;
    --foreground-disabled: 40 8% 35%;
    --border:          220 12% 24%;
    --border-strong:   220 12% 35%;
  }
}
```

### Z-index scale

```txt
base      0
sticky    10
dropdown  30
overlay   40
modal     50
toast     60
```

---

## 14. Tailwind Usage Rules

- ✅ Ưu tiên semantic token thay vì màu Tailwind thô.
- ✅ Dùng `cn` helper (clsx + tailwind-merge) cho conditional class.
- ❌ Không dùng arbitrary values như `w-[347px]`, `text-[13px]`, `bg-[#266b3e]`.
- ❌ Không dùng inline styles trừ khi giá trị runtime cần (VD: `style={{ left: slot.x }}`).
- ❌ Không tạo giant className block — extract component khi pattern lặp lại.
- ✅ Thứ tự class: layout → sizing → spacing → border → background → typography → state → animation.

---

## 15. AI Agent Frontend Rules

AI coding agents phải tuân thủ quy tắc giao diện hiện có trước khi sinh code mới.

### Bắt buộc

- Reuse token màu từ hệ thống — không tự chọn màu.
- Reuse spacing scale Tailwind — không dùng arbitrary px.
- Reuse component đã có (Button, Chip, Card, Slot) nếu tồn tại.
- Dùng `font-display` chỉ cho số OVR và heading game đặc biệt.
- Dùng `font-sans` cho toàn bộ UI text còn lại.
- Pitch màu phải dùng token `--pitch`, không tự chọn green.
- Gold/trophy màu phải dùng token `--gold`, không tự chọn yellow.
- Animation wheel spin phải dùng Framer Motion với easing đã định nghĩa.

### Cấm

- ❌ Không dùng `bg-green-700`, `text-yellow-500`, `border-gray-300` tùy tiện.
- ❌ Không dùng `bg-[#hexcode]` tùy tiện.
- ❌ Không tạo button/card/chip riêng nếu component shared đã tồn tại.
- ❌ Không thêm animation bounce hoặc over-dramatic effect.
- ❌ Không dùng icon pack khác ngoài `lucide-react`.
- ❌ Không dùng font serif hoặc font display cho body text.
- ❌ Không thêm gradient nặng trừ card rarity đã được defined.

### Khi AI agent chỉnh UI

1. Đọc component hiện có trong cùng khu vực feature.
2. Xác định token, spacing và animation pattern đang dùng.
3. Chỉnh code theo pattern đó.
4. Không refactor toàn bộ style nếu nhiệm vụ nhỏ.
5. Kiểm tra hover, focus, empty, loading, filled state nếu component có tương tác.

---

## 16. UI Consistency Checklist

Trước khi commit UI change:

- [ ] Màu có dùng semantic token không?
- [ ] Spacing có dùng Tailwind scale không?
- [ ] Typography có đúng scale và font family không?
- [ ] Hover state có tồn tại cho element tương tác không?
- [ ] Focus ring có nhìn thấy được không?
- [ ] Disabled state có rõ ràng không?
- [ ] Loading state có disable action và giữ layout ổn định không?
- [ ] Empty state có tồn tại cho slot, list, panel không?
- [ ] Animation wheel có deceleration đúng không?
- [ ] Card rarity có dùng đúng rarity style không?
- [ ] Pitch slot empty/filled có phân biệt rõ không?
- [ ] Không có inline style tùy tiện?
- [ ] Không có arbitrary color hay spacing?
- [ ] Không có giant Tailwind className string?
- [ ] Responsive đã kiểm tra ở mobile và desktop chưa?
- [ ] Icon đúng size và đúng pack không?
