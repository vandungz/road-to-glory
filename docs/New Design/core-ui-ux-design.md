# Road to Glory — UI/UX design system

Handoff spec for `docs/core-ui-ux-design.md`. Companion files:
`RTG — Current UI (recreation).dc.html` (1:1 recreation of today's UI)
and `RTG — Redesign.dc.html` (new direction, foundations + 16 surfaces —
the whole product from login to retirement).

Direction agreed with the product owner: **keep the retro Panini/football-album
identity — evolve it**. Same warm paper base and coral accent; hierarchy now
comes from scale and space instead of hard 2px borders and offset shadows.
No neon, no gradients, no glass. UI copy stays Vietnamese.

---

## 1. Design audit — what makes the current UI feel "AI-generated"

Read from `app/globals.css`, `app/(auth)/login/LoginForm.tsx`,
`app/(auth)/layout.tsx`, `app/(game)/page.tsx`, `app/(game)/[gameId]/page.tsx`,
`features/game/components/*`, `features/auth/components/LogoutButton.tsx`,
`features/player/components/*`, `features/wheel/components/*`,
`features/squad/components/SquadDashboard.tsx`, `components/ui/Modal.tsx`.

**1.1 One decoration recipe applied to everything.**
`.panini-card`, `.retro-btn`, `.retro-badge`, the season strip chips, the stat
grid, the shop items, the transfer offers and the pitch tokens all use the same
`2px solid #27272a` + `2–3px 2–3px 0 #27272a` treatment. When every element is
elevated, nothing is. There is no visual difference between the wheel (the
centrepiece) and a metadata footer.

**1.2 Border vocabulary is unbounded.**
In `DraftDrumScreen` and `StoryRail` alone: 2px solid, 1.5px solid, 1px solid,
1.5px dashed, 2px dashed, `border-left: 3px`, plus `box-shadow: inset` panels.
Nested containers reach four levels (paper → card → sub-card → stat grid → cell).

**1.3 Emoji as the icon system.**
⚽ 🏆 🏅 📈 💼 🎴 📊 🎮 📜 🍷 🌍 🌎 🛡️ ▶ ✨ 🏁 🔺 ➖ 📝 📩 🔍 appear in
`SeasonStrip`, `StoryRail`, `SeasonProfile`, `TrophyCabinetModal`,
`PersistentTransferSection`, `RetiredStage`, `PaniniSticker`, plus `getFlagEmoji`.
They render inconsistently across platforms, carry no semantics, and sit
alongside ~14 unrelated Lucide icons.

**1.4 No single primary action.**
The career screen presents, at equal weight: three right-hand tabs, three mobile
tabs, the spin button, the season-strip steps, "Tủ danh hiệu →", plus a shop CTA.
`RetiredStage` and the transfer modal each end with several bottom buttons.

**1.5 Three competing columns.**
`DraftDrumScreen` gives StoryRail (300px), the action panel and the
Panini/profile/transfer stack (360px) near-equal visual strength — all three are
white cards with identical borders and shadows.

**1.6 Type system has no scale.**
Sizes observed: 0.42, 0.45, 0.48, 0.5, 0.52, 0.54, 0.55, 0.58, 0.6, 0.62, 0.65,
0.68, 0.7, 0.72, 0.75, 0.78, 0.8, 0.82, 0.85, 0.88, 0.9, 0.92, 0.95, 1.05, 1.15,
1.25, 1.35, 1.45, 1.75, 2, 3.4 rem — with weights 400/500/600/700/800/900 and
five letter-spacing values. Labels at 0.42–0.5rem (≈7–8px) are below legibility.
Nearly everything is uppercase, so uppercase no longer signals anything.

**1.7 Wheel legibility depends on a hack.**
`SpinnerWheel` paints white labels on 8 bright fills and recovers contrast with a
2px dark text stroke (`paint-order: stroke fill`). Long Vietnamese labels
("VÒNG 1/16", "TỔNG KẾT & CHUYỂN NHƯỢNG") overflow their slices.

**1.8 Modal chrome is duplicated, not shared.**
`components/ui/Modal.tsx` is a sound foundation (portal, Escape, focus restore,
scroll lock, `aria-modal`), but `TrophyCabinetModal`, `SeasonRecapModal`,
`ShopModal` and `PersistentTransferSection` each re-implement header, close
button, footer and their own border/shadow language. Worse, three bypass it
entirely and hand-roll `position: fixed` overlays with click-outside-to-close and
no focus management at all: `TransferDecisionModal`, `SeasonStatsModal`, and
`CreateGameDialog` (which builds its own `.modal-overlay` + Framer Motion
variants). `PlayerCareerDialog` uses `Modal` but then neutralises it
(`backgroundColor: transparent, border: none, boxShadow: none`) to draw its own
card inside, plus a second hand-rolled close button with `onMouseEnter`/
`onMouseLeave` inline hover handlers. `PersistentTransferSection` is 841 lines
and `PlayerCareerDialog` 415 — both over the repo's 400–500 line limit.

**1.9 Mobile is a compressed desktop.**
The season strip scrolls horizontally with 5 chips; the 340px wheel is fixed
(`flex: 0 0 auto`) inside 390px minus padding; three emoji tabs stack above the
action panel, pushing the primary button below the fold.

**1.11 The shell is a fourth visual language.**
The lobby and squad-board pages use `3px solid` header borders (nowhere else in
the app), a 34px charcoal square holding a coral `Trophy` icon as the logo, and a
bordered+shadowed "Classic Lobby / Season 2025/26" plaque. `LoginForm` reaches
for yet another palette — raw `#fef3c7`/`#b45309` for warnings and
`#fce8e6`/`#c43a2a` for errors — none of which exist as tokens. Squad cards in
`GameList` carry a 6px coral top strip, a 52px circular OVR bubble, an
`⚽` emoji empty state, and `● In Progress` / `✓ Completed` badges mixing glyphs
with English while the rest of the UI is Vietnamese.

**1.12 Language is inconsistent.**
"My Squads", "New Squad", "Create New Squad", "Squad Name", "Default Formation",
"Cancel", "Create Squad →", "Starting XI", "No Squads Yet", "Logout", "POS /
PLAYER / OVR", "Empty Slot" are English inside a Vietnamese product. The
redesign carries Vietnamese throughout, with English kept only for genuine
football shorthand (PAC/SHO/PAS/DRI/DEF/PHY, OVR, CAM, Squad OVR).

**1.13 Intentional and worth keeping** — the paper texture, coral accent, the
Panini sticker as a collectable artifact, the dark gold trophy cabinet as the
one inverted surface, tabular career data, the 8-slice wheel, Oswald/Lora/Special
Elite as display/body/meta.

---

## 2. Design principles

1. **One rule weight.** 1px `#DEDACE`. No left/right/dashed/double borders, no
   border on every section.
2. **Two surface levels** (`paper`, `surface`) plus one inverted (`inverse`, for
   honours only). Shadow exists solely for overlays:
   `0 24px 56px -18px rgba(28,27,24,.55)`.
3. **Hierarchy from scale and space.** A 44px result headline next to 10px meta
   needs no container.
4. **One primary action per state.** Secondary actions are text or 1px-outline;
   never two filled buttons.
5. **Icons for navigation and actions only** — never in headings, labels, stat
   rows or badges. 8-concept set. No emoji anywhere in the UI (flags excepted,
   as data).
6. **Uppercase for meta, section labels and button labels.** Titles are
   sentence case with proper Vietnamese diacritics.
7. **Numbers are tabular** (`font-variant-numeric: tabular-nums`) so columns
   align and OVR changes don't shift layout.
8. **The Panini sticker is the only decorative artifact** allowed an ink border.
9. **Touch targets ≥ 44px; no text below 11px** (9–10px permitted only for
   Special Elite meta, which reads larger than its metrics).
10. **Motion is confirmation, not spectacle.** Wheel spin, sheet slide, result
    fade. `prefers-reduced-motion` snaps to the final state.

---

## 3. Tokens

Replace scattered literals in `globals.css` with these. Names map 1:1 to the
foundations panel in `RTG — Redesign.dc.html`.

```css
:root {
  /* surfaces */
  --rtg-paper:        #F4F1EA;  /* app background, textured */
  --rtg-surface:      #FFFDF8;  /* header, side panels, modals */
  --rtg-sunken:       #EBE7DC;  /* disabled fills, quiet zones */
  --rtg-inverse:      #1C1B18;  /* trophy cabinet, honours banner */

  /* ink */
  --rtg-ink:          #21201D;  /* primary text */
  --rtg-ink-2:        #5E5B52;  /* secondary text */
  --rtg-ink-3:        #8E8A7E;  /* muted / meta */
  --rtg-rule:         #DEDACE;  /* the only rule colour, always 1px */
  --rtg-rule-strong:  #C9C4B4;  /* outline buttons, segmented controls */

  /* semantics */
  --rtg-accent:       #E8502F;  /* primary action, current step */
  --rtg-accent-ink:   #C7401F;  /* accent on light bg, for text */
  --rtg-positive:     #2F6B45;  /* completed, ratings up, renewal */
  --rtg-warning:      #B0761C;  /* locked, in-progress elsewhere */
  --rtg-negative:     #B23A2B;  /* rejection, insufficient funds */
  --rtg-honour:       #B08432;  /* trophies on light */
  --rtg-honour-lit:   #C9A24D;  /* trophies on --rtg-inverse */
  --rtg-disabled:     #A8A49A;
  --rtg-focus:        #E8502F;  /* 2px outline, 2px offset */

  /* wheel — 8 rotating fills, white 12px label ≥ 4.5:1, no text stroke */
  --rtg-wheel-1: #E8502F;  --rtg-wheel-2: #3D6EA8;
  --rtg-wheel-3: #2F7A5C;  --rtg-wheel-4: #A97A18;
  --rtg-wheel-5: #635399;  --rtg-wheel-6: #9C3F6E;
  --rtg-wheel-7: #25736D;  --rtg-wheel-8: #454E96;

  /* elevation — overlays only */
  --rtg-shadow-overlay: 0 24px 56px -18px rgba(28,27,24,.55);
  --rtg-scrim: rgba(28,27,24,.55);

  /* radius */
  --rtg-radius:       2px;   /* everything */
  --rtg-radius-sheet: 12px;  /* mobile bottom sheet top corners */
}
```

**Transfer states** map onto semantics rather than new colours: offer =
`--rtg-accent` (recommended) / `--rtg-ink` (other), renewal = `--rtg-positive`,
rejected = `--rtg-negative`, free agent = `--rtg-warning`, expired =
`--rtg-disabled`.

**Wheel outcome states**: win = `--rtg-honour`, podium/late round =
`--rtg-ink`, early exit = `--rtg-ink-2`. The landed slice keeps its own fill;
the result headline below carries the semantic colour.

### Type scale

| Role | Family | Size / weight | Notes |
|---|---|---|---|
| Result headline | Oswald | 44 / 700 | 34 on mobile |
| Page title | Oswald | 30–34 / 600 | |
| Current action title | Oswald | 30 / 600 | 26 on mobile |
| Section label | Oswald | 12–13 / 600, +.10em, uppercase | |
| Numeric / stat | Oswald | 15–46 / 500–600, tabular-nums | |
| Body | Lora | 15 / 1.65 | 13.5–14 in panels |
| Metadata | Special Elite | 9.5–11, +.12em, uppercase | |
| Button label | Oswald | 13.5–17 / 600, +.08em, uppercase | |

Two families carry the UI (Oswald, Lora); Special Elite is the metadata voice
only — three faces total, unchanged from today.

### Spacing

4 / 8 / 12 / 16 / 20 / 24 / 28 / 32 / 40 / 56. Panel padding 24–28 desktop,
16–20 mobile. Buttons: 52px primary desktop, 58px mobile, 44–48 secondary.

### Icon set (8, Lucide, 1.6 stroke)

`shield` club · `trophy` honours · `globe` national team ·
`trending-up` attributes · `briefcase-business` transfer · `shopping-bag` shop ·
`calendar` season · `clock` progress. Plus `arrow-left`, `x`, `chevron-*`,
`check` as chrome. Everything else is deleted, including all emoji.

---

## 4. Component architecture

`components/ui/` — shared, no domain imports:

| Component | Replaces |
|---|---|
| `Surface` | `.panini-card`, ad-hoc white cards. Props: `level="paper\|surface\|inverse"`, `padding` |
| `Divider` | every `border-top/bottom` literal |
| `Button` | `.retro-btn`. `variant="primary\|outline\|quiet"`, `size`, `loading`, `disabled`, `fullWidth` |
| `IconButton` | header/close buttons. Requires `aria-label`, 44px box |
| `Badge` | `.retro-badge`, emoji chips. `tone` from semantics, text only |
| `Stat` / `StatGroup` | the 4-up and 6-up stat grids (`SeasonRecapModal`, `RetiredStage`, `PaniniSticker`) |
| `DataRow` | label/value rows in `SeasonProfile`, transfer header, shop |
| `SectionHeader` | 20+ inline `<span>` + `<h3>` pairs |
| `Tabs` | right-panel tabs, mobile tabs, transfer tabs (roving tabindex) |
| `ProgressIndicator` | `SeasonStrip`, the 13-step setup indicator |
| `TimelineItem` | `StoryRail` club list, trophy cabinet rows |
| `ResultBanner` | wheel result box, honours banner |
| `PrimaryActionArea` | the center column contract: eyebrow, title, body, slot, result, one CTA, next-up hint |
| `EmptyState` / `LoadingState` / `ErrorState` | currently missing everywhere |
| `Tooltip` | probability explainers (replaces `Info`/`CircleHelp` inline text) |
| `Modal` + `ModalHeader` / `ModalBody` / `ModalFooter` | see §5 |
| `Drawer` | mobile Nhật ký / Thẻ / Hợp đồng |
| `Field` (+ `Input`, `Radio`, `Checkbox`) | `.input-retro`, the login/create-squad form fields, the per-field error line |
| `AppShell` (header + footer) | the duplicated lobby / squad-board chrome |
| `SquadCard` | `GameList`'s bordered card with its coral strip and OVR bubble |
| `Segmented` | wage negotiation, offer selector, login/register toggle |
| `LineChart` | `PlayerOvrChart` (keep the component, restyle to tokens) |

Domain components keep their names and data contracts; only presentation
changes. `PersistentTransferSection` (841 lines) splits into
`TransferWindowModal` (shell + tabs), `OfferList`, `OfferRow`,
`RecommendedOffer`, `RenewalRow`, `ClubSearchPanel` — each well under 400 lines.
No new business logic in UI; `lib/transfer-economy.ts`,
`features/wheel/lib/simulation-helpers.ts`, `lib/shop-catalog.ts` and all server
actions untouched. No probability, formula or progression change. No `any`.

---

## 5. Modal system

`components/ui/Modal.tsx` stays the single foundation and gains: bottom-sheet
variant under 640px (`radius 12px 12px 0 0`, max-height 92dvh, drag affordance),
`prefers-reduced-motion` handling, focus trap (currently only initial focus +
restore), `aria-labelledby` wired to `ModalHeader`, and size presets
`sm | md | lg`.

Rules enforced by `ModalHeader` / `ModalFooter`:
one title, one close affordance, one primary action, secondary as text/outline,
body scrolls (never the page), no nested modals — the transfer flow uses tabs
inside one modal instead.

Content components own content only: `SeasonResultModal`, `SeasonRecapModal`,
`TransferWindowModal`, `TransferDecisionModal`, `TrophyCabinetModal`,
`PlayerCareerDialog`, `ShopModal`, `SeasonStatsModal`, `CreateGameDialog`.

`TrophyCabinetModal` is the one modal on `--rtg-inverse` — a deliberate product
decision (the archive feels like a different room), expressed through surface
colour alone, not different chrome.

The three current hand-rolled overlays (`TransferDecisionModal`,
`SeasonStatsModal`, `CreateGameDialog`) must be migrated onto `Modal`; that is
the single biggest accessibility win in this pass. `PlayerCareerDialog` stops
overriding `Modal`'s surface and instead renders `ModalHeader` + a two-column
body, dropping its duplicate close button and inline hover handlers.

---

## 6. Layout

**Desktop** (`RTG — Redesign.dc.html` §01): 64px global header carrying
season / age / club / OVR + shop and trophy icon buttons; 44px phase rail
(5 steps, current underlined in accent); then 268px career ledger (on paper, no
card — quiet) | fluid center action area | 336px dossier (surface, tabbed:
Thẻ cầu thủ / Mùa giải / Hợp đồng). The center column is the only place with
large type and a filled button, so focus is unambiguous.

**Mobile 390** (§02, three states): 52px header, compact context bar
(OVR · club · season + 5-segment phase bar), full-width wheel (328px inside
390px), primary CTA pinned above a 60px bottom bar (Nhật ký / Thẻ / Hợp đồng →
drawers). Nothing horizontally scrolls. States shown: ready, processing
(wheel dimmed, spinner, disabled CTA, explicit "Đang xử lý" in the context bar),
resolved-with-transfer-pending.

**Setup** (§03): 13 spins grouped into 4 named chapters (Xuất thân · Chỉ số ·
Thể chất · Khởi đầu) with segment ticks instead of 13 numbered circles; the
right panel is the dossier being filled in, so progress is legible as content.

**Season recap** (§04): result headline first (readable in under a second),
then 4 stats on rules, then per-competition rows that expand in place. Desktop
modal and mobile bottom sheet carry identical content.

**Transfer** (§05): one recommended offer on a sunken panel with a segmented
wage negotiation (each option shows its acceptance probability from
`approachChancePercent`); other offers, renewal and rejected states as rows with
progressively weaker emphasis. Footer states the consequence of doing nothing.

**Trophy cabinet** (§06): grouped Cá nhân / Câu lạc bộ / Đội tuyển on the
inverse surface, rows on 1px rules, empty group written as a sentence.

**Shop** (§07): one row per item — name, effect, price, state
(Mua / Đã mua / Thiếu €X / Chưa mở bán). No cards.

**Career profile** (§08): OVR trajectory bar chart + one tabular season table.
Replaces ~40 bordered cards.

**Retirement** (§09): editorial summary page, 5 headline numbers on rules,
clubs and honours side by side, single "Lưu sự nghiệp" action.

**Squad dashboard** (§10): pitch as the graphic (44px circular tokens), squad as
a scannable table with a status column; the empty slot's own row is the draft
entry point.

**Auth** (§11, three states): the form sits directly on paper — no card, no
border, no shadow. Login/register is one underlined tab pair, not a
charcoal-filled segmented toggle. Inputs are 1px inset outlines, 48px tall;
errors are a sentence in `--rtg-negative` under the field it belongs to, not a
tinted box with an icon. The confirm-email view is a paragraph plus a disabled
cooldown button — the 52px circle-with-mail-icon is gone.

**Lobby** (§12): this is the shell every non-gameplay page inherits — 64px
header (wordmark, not a logo tile), the user's email, a text logout; 56px footer.
Squad cards become a 3-column grid separated by 1px rules on a `--rtg-rule`
background, so cells share edges instead of each carrying its own border and
shadow. Draft progress is a two-part bar (8/11), status is a coloured meta label,
OVR is large tabular type — no bubble. The empty state is a heading, a sentence
and the primary action.

**Create squad** (§13): name field plus three radio rows (sơ đồ + one-line
description); primary action right, `Huỷ` as text left. Replaces the
three charcoal-filled formation tiles.

**Season result / season stats** (§14): two `sm` modals. Result leads with the
placement at 40px, then 4 stats on rules, then the league table as a real table
with the player's club row tinted `--rtg-paper` — no per-row emoji, no
`0.42rem` labels. Stats modal is label/value `DataRow`s plus per-competition
rows, and the Ballon d'Or eligibility notice moves onto `--rtg-inverse` with the
honours voice instead of a yellow warning box.

**Contract negotiation** (§15): the offer is a three-column comparison table —
term, current, proposed — so the decision is legible in one read; wage
negotiation is a segmented control showing each option's acceptance probability.
One primary `Ký hợp đồng`; `Từ chối tất cả đề nghị` is text. Replaces the
two competing 48px stamp buttons.

**Retired-player archive** (§16): left column is the Panini sticker (gold header
for Hall of Fame) plus lifetime totals and honours as `DataRow`s; right column is
the OVR line chart and the per-season table, with award years as a tinted
full-width row rather than a `border-left: 3px` callout.

---

## 7. States

Every action surface defines: idle · processing (spinner + text, CTA disabled,
context bar shows it) · disabled (sunken fill, `--rtg-disabled` text, reason
given in words) · empty (a sentence, never an icon) · error (`--rtg-negative`
text + retry) · result · reduced-motion. The server-action pattern: optimistic
UI is never silent — the phase bar and the CTA both change before the response
lands.

---

## 8. Files

Created for the design handoff:
`RTG — Current UI (recreation).dc.html` (10 gameplay surfaces as they are today),
`RTG — Redesign.dc.html` (foundations + 16 redesigned surfaces, §00–§16),
`core-ui-ux-design.md` (this file → `docs/core-ui-ux-design.md`).

Expected repo touch list for implementation:

- `app/globals.css` — tokens; delete `.panini-card` / `.retro-btn` /
  `.retro-badge` / `.input-retro` / `.card-retro` / `.badge-status` decoration
  and the `.modal-overlay` / `.modal-panel` pair.
- `components/ui/*` — new primitives + `Modal` upgrade (bottom sheet, focus
  trap, reduced motion, size presets).
- `app/(auth)/layout.tsx`, `app/(auth)/login/LoginForm.tsx` — §11.
- `app/(game)/page.tsx`, `app/(game)/[gameId]/page.tsx` — shared shell, §12.
- `features/game/components/GameList.tsx`, `CreateGameDialog.tsx` — §12, §13.
- `features/auth/components/LogoutButton.tsx` — text button.
- `features/wheel/components/*` — all 15 files, §01–§07, §14, §15.
- `features/squad/components/SquadDashboard.tsx`, `PitchBoard.tsx` — §10.
- `features/player/components/PlayerCareerDialog.tsx`, `PlayerOvrChart.tsx`,
  `PlayerStickerCard.tsx` — §08, §16.

No `actions/*`, no `lib/*` game logic, no `types/*`, no `features/*/services/*`.

---

## 9. Cut features — remove, do not build

**Cross-mode career archive (Tủ lưu trữ).** Cut by product decision — it is not
being implemented. The homepage design no longer shows the archive strip, the
header link, or the `/classic/archive` route. Existing code for it is dead (every
path links to `#archive`, which is not a route) and should be deleted in the same
pass:

| File | What to remove |
| --- | --- |
| `features/game/components/Homepage.tsx` | the `rtg-home-archive` block (`#archive`, lines ~113–120), the `archiveStats` prop, and the `Danh hiệu` `ModeStat` that reads `archiveStats.totalAwards` |
| `components/shared/AppShell.tsx` | the `archiveHref` prop and its `rtg-app-shell__archive` link + `__context-rule` divider |
| `app/(game)/page.tsx` | the `getArchiveStatsForUser` call, the `Promise.all` entry, and `archiveHref="#archive"` |
| `features/game/services/game-session.service.ts` | `ArchiveStats` interface and `getArchiveStatsForUser` |
| `globals.css` | `.rtg-home-archive*` and `.rtg-app-shell__archive` rules |

Removing `archiveStats` drops one stat from the Classic mode band — replace it
with a session-derived value (squad count, or highest squad rating) rather than
leaving three stats where the design shows four.

**Not affected:** `TrophyCabinetModal` (Tủ danh hiệu — a *player's* honours,
opened from `StoryRail`) and the retired stage (§16) both ship today and stay.
They are per-player career surfaces, not the cross-mode cabinet. Retired players
remain readable through the squad list as a muted "đã giải nghệ" group at the
bottom — that is where the career payoff lives now, at no new-route cost.

---

## 10. Follow-up

- Player photography for the Panini sticker: the redesign shows a striped
  placeholder where a real portrait or generated avatar belongs.
- Vietnamese slice labels still need a length budget — "VÒNG 1/16" fits at
  7.4px; anything longer should abbreviate rather than shrink.
- Sound design for the spin was out of scope.
- `/auth/reset-password` is linked from `LoginForm` but has no page in the repo —
  either build it on the §11 pattern or remove the link.
- `app/dev/draft-preview` and `app/dev/transfer-window-preview` were left alone;
  they are dev harnesses, not product surfaces.
- The English→Vietnamese copy pass (§1.12) needs a product-owner review before
  implementation — the redesign proposes wording, not final strings.
- The 8 wheel fills were tuned for white text; if any label ever moves to dark
  text, the ratios must be re-checked.
