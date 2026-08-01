# Design SoT — UI/UX Overhaul (v1.1)

> **Status:** Source of Truth cho đợt **update lớn UI/UX** — **chưa code**.  
> **Phạm vi:** Presentation / layout / motion / hierarchy / anti-AI-vibe craft.  
> **Ngoài phạm vi:** Thay đổi game logic, wheel sequence, weights, Server Actions, sim formulas.
>
> **Product locks (2026-07-31, updated 2026-08-01):**
> 1. **Wheel / spinner là xương sống** Path to Glory — không bỏ, không thay bằng dashboard manager.
> 2. **Flow logic hiện tại giữ nguyên** (cùng `careerSubStep` order & branching).
> 3. **Visual system hiện tại giữ** (cream / pitch green / gold / Panini / stamp) — refine, không rebrand.
> 4. **Mobbin = reference craft** chống vibe AI generic — không copy app thể thao 1:1.
> 5. Đợt này **chỉ UI** — mọi đề xuất chạm logic → reject hoặc tách ticket riêng.
> 6. **Section Wheel CHỈ cho wheel spin** — non-wheel actions dùng floating modal riêng.
>
> Tài liệu liên quan:
> - [`frontend-style-system-guide.md`](./frontend-style-system-guide.md) — tokens / typography / rarity (vẫn SoT style).
> - [`game-design.md`](./game-design.md) — pillars Luck · Strategy · Probability · Storytelling · Replayability.
> - [`core-transfer-design.md`](./core-transfer-design.md) — transfer economy (logic đã lock; UI layer theo §5.4 đây).
> - [`core-game-logic-systems-map.md`](./core-game-logic-systems-map.md) — season pipeline kỹ thuật.
> - [`ui-ux-flow.md`](./ui-ux-flow.md) — flow cũ (có thể lệch runtime; **file này supersede phần presentation**).

---

## 1. Product DNA (không được đụng)

### 1.1 Path to Glory là gì

- Web game **career cầu thủ** dựa **Dynamic Weighted Wheel**.
- **Không** match engine, **không** tactician FM.
- Core loop: **Spin → Outcome → Career state đổi → Spin tiếp**.
- Session ~**15–30 phút** / một career slot; Squad XI = album nhiều career.

### 1.2 Flow logic LOCKED (UI phải phục vụ đúng thứ tự này)

**Draft setup** (giữ): nationality → age → height/weight → stats → career length → league → club → start career.

**Mỗi mùa career** (giữ đúng `careerSubStep` hiện tại):

```txt
idle
  → dir_increase → [dir_decrease?] → count
  → (selector → magnitude) × N
  → standing
  → domestic_cup
  → [continental_cup?]
  → [national_callup → national_tournament?]
  → [ballon_dor_nomination → ballon_dor_ranking?]
  → season_stats / resolved reveal
  → transfer (renewal / inbound / shortlist / FA)
  → next season  (lặp) | retire
```

**Cấm trong đợt UI này:**

| Cấm | Lý do |
|---|---|
| Gộp / bỏ / đổi thứ tự wheel steps | Đổi nhịp balance & narrative |
| Auto-skip spin (trừ rule đã có sẵn) | Mất ritual |
| Thay wheel bằng "Continue" inbox kiểu FM | Sai genre |
| Thêm màn hình bắt buộc mới vào giữa pipeline | Phá session pacing |
| Đổi weight / sim / transfer formulas "cho đẹp UI" | Scope creep logic |

UI chỉ được: **trình bày rõ hơn cùng một bước**, **nhấn stakes cảm xúc**, **giảm noise**, **không đổi câu hỏi người chơi trả lời bằng spin**.

---

## 2. Vấn đề UI hiện tại (chẩn đoán)

Giữ đúng hướng aesthetic; thiếu **craft + hierarchy + anti-generic**.

| Pain | Cảm giác user | Hướng sửa (UI-only) |
|---|---|---|
| Mọi step cùng 1 shell card | Ballon = tăng PAC về mặt cảm xúc | **Skin theo stakes** (cùng step, khác presentation) |
| Panel action dày + string switch | Wizard form, không "mùa bóng" | Layout denser cho growth; **ceremony** cho cup/Ballon |
| Timeline chỉ lúc retire | Sự nghiệp vô hình giữa chừng | **Story rail** cạnh wheel (read-only) |
| Transfer dạng bảng dài | Admin / AI spreadsheet | Negotiation focus: 1 quyết định nổi / view |
| Modal chồng (stats / result / profile) | Mệt, không biết SoT recap | **Một Season Recap** skim→expand (cùng data) |
| Token doc ≠ token code (`--coral` vs `--primary`) | Drift, dễ sinh UI lệch | Align implementation về style guide trong đợt UI |
| Generic AI tells | Flat cards, pill spam, purple glow, "dashboard tiles" vô hồn | Anti-patterns §4 |
| Non-wheel actions nằm trong section Wheel | Khó phân biệt đâu là spin, đâu là action khác | **Floating modal** cho transfer/recap (§5.6) |

---

## 3. Mục tiêu trải nghiệm (UI)

1. **Wheel vẫn là hero** mỗi bước quyết định — lớn, rõ, có tension.
2. **Cùng logic, khác cảm xúc** theo loại beat (growth vs cup vs Ballon vs transfer).
3. **Biết mình đang ở đâu trong mùa** mà không thêm bước mới (season strip read-only).
4. **Thấy sự nghiệp đang viết** (story rail / sticker) giữa các spin — không thay spin.
5. **Trông handcrafted** (editorial sport + game board), không "AI generated SaaS".
6. **Wheel section = wheel only** — transfer, recap, và actions khác tách ra floating modal.
7. **Mobile playable** — chơi được full career trên 375px+.

---

## 4. Anti-AI vibe — Craft rules

> Nghiên cứu dựa trên Dribbble, Behance, real apps (FIFA UT, FM26, Sorare, Strava),
> và editorial sport design. Không có Mobbin MCP (paid plan) → tham chiếu thủ công.

### 4.1 Lấy (tinh thần)

| Pattern | Áp dụng FL | Không làm |
|---|---|---|
| Game Day / Scoreboard | Standing & cup reveal = headline + stamp | Card stats xám nhạt |
| Progress Indicator | Season strip / `2 of N` growth chips | Progress bar giả gamification vô nghĩa |
| Achievement / Medal | Ballon & trophies = gold reserved | Confetti spam mọi spin |
| Player Profile / Collectible | Panini + scrapbook mid-career | Grid avatar generic |
| Bottom sheet Event Detail | Cup journey / table expand | Modal xếp chồng 3 lớp |
| Activity tracker | OVR tick / unlock chips sau spin | Dashboard KPI 6 widgets |

### 4.2 Cấm (AI / generic tells)

- Purple-on-white / indigo glow / glassmorphism nặng.
- Pill chip clusters trang trí không mang info.
- Multi-layer drop shadow "premium card".
- Emoji làm UI primary (stamp/icon hệ thống OK nếu đã có trong language).
- Inter-only flat marketing layout; hero text overpower brand/game motif.
- "Portal tiles" copy FM mà **che** wheel.
- Skeleton-loading theatre cho mọi click nhỏ.
- Empty illustration pack stock.

### 4.3 Bắt buộc (handcrafted tells)

- Cream/paper programme feel + pitch green CTA + gold **chỉ** award/rarity.
- Display font (Bebas/stamp) cho OVR & headlines; body readable.
- Wheel motion giữ tension (2.5–3.5s ease-out) — không bounce trang trí.
- Mỗi màn hình **một composition rõ** (wheel + context), không dashboard 12 panel.
- Real football anchors: pitch, sticker, table, cup stamp — không gradient abstract làm hero.

---

## 5. IA & layout (không đổi flow)

### 5.1 Career screen — 3 vùng cố định (Desktop)

```txt
┌─────────────────────────────────────────────────────────────┐
│  Season strip (read-only): Growth · League · Cups · … · Mkt │
├──────────────┬──────────────────────────────┬───────────────┤
│  Story rail  │       WHEEL SECTION          │  Panini /     │
│  (timeline,  │   (CHỈ wheel spin + result)  │  season side  │
│   OVR spark) │                              │               │
└──────────────┴──────────────────────────────┴───────────────┘
```

- **Giữa = WHEEL ONLY** — section giữa **chỉ dành cho wheel spin và kết quả spin**. Không nhét transfer UI, season recap, hay bất kỳ action tương tác nào khác vào đây.
- **Trái = context sự nghiệp** (read-only) — tăng storytelling (story rail: club stints, OVR sparkline).
- **Phải = identity card** (đã có Panini/SeasonProfile — polish, không bỏ).
- **Strip trên = orientation** — không click để skip logic; tối đa jump UI tới panel đang active.

> **Quy tắc phân tách:**
> - Mọi bước wheel spin (growth, standing, cup, Ballon, national) → render **trong** section giữa.
> - Mọi action tương tác KHÔNG phải wheel (transfer decisions, season recap, contract negotiation) → render bằng **floating modal** overlay (§5.6).

### 5.2 Stakes skins (CHỈ cho wheel steps)

Bảng này **chỉ** áp dụng cho các bước **có wheel spin**. Transfer và Season Recap KHÔNG nằm ở đây.

| Beat | Presentation skin | Visual treatment |
|---|---|---|
| Growth (dir/count/selector/mag) | Compact ritual + step chips | Tone Cream/Green tĩnh lặng, newsprint texture, Sans-serif. Ít particles |
| Standing | Programme headline "Xếp hạng mùa" | Bigger headline, editorial stamp kết quả |
| Domestic / Continental cup | Cup masthead + journey expandable | Tối hơn (deep green), cup icon nổi bật |
| National / Ballon | Ceremony overlay (gold, fuller bleed) | Background dark/black, wheel viền Gold, font Serif editorial. **Headline Hold**: text reveal delay 1–1.5s tạo suspense |

**Craft details — stakes skinning:**
- *Low-stakes (Growth):* Vòng quay in trên chất liệu **newsprint/editorial**. Kết quả = micro stamp "cộp" nhẹ (toast), không cản flow.
- *High-stakes (Cup/Ballon):* Vòng quay bọc **Panini shiny foil** viền gold. Kết quả = **full-bleed headline** chiếm 50%+ viewport, UI khác tạm ẩn.
- **Headline Hold (cup/Ballon/standing):** Typography oversized hiển thị theo nhịp: "VÀ KẾT QUẢ LÀ..." → [delay 1–1.5s] → "🏆 VÔ ĐỊCH" — giữ tension bằng timing, không bằng animation fancy.

### 5.3 Squad / Lobby

- Lobby & PitchBoard: gallery sticker XI — **không** đổi draft slot rules.
- Empty slot CTA rõ; filled slot = mini career badge (năm / OVR) — cosmetic.

### 5.4 Transfer UI — Floating Modal (logic đã lock ở core-transfer)

Transfer **KHÔNG** render trong section Wheel. Render bằng **floating modal** (§5.6).

- **Contract Fax metaphor:** Modal trông như tờ fax/hợp đồng giấy (Cream paper) đặt lên bàn.
- Sticky contract hiện tại ở trên.
- Inbound: tối đa K=3 nhưng **UI focus 1 card** (carousel/select), không 3 bảng song song dày đặc.
- Side-by-side comparison: trái = Current contract, phải = New offer. Chênh lệch lương **khoanh tròn bút marker** (editorial style).
- Quyết định: user "đóng dấu mộc" đỏ (Từ chối) hoặc xanh/vàng (Chấp nhận).
- Shortlist collapsed mặc định; approach % giữ.
- FA / unemployed warning rõ — copy/visual only.

### 5.5 Season Recap — Floating Modal (gộp 2 modal hiện tại)

Gộp `SeasonResultModal` + `SeasonStatsModal` thành **1 bề mặt duy nhất**. Render bằng **floating modal** (§5.6), KHÔNG trong section Wheel.

**Cấu trúc Recap:**

```txt
┌─────────────────────────────────────────┐
│  SEASON RECAP — Mùa 3 (Age 20)         │
│  CLB: Real Madrid · OVR: 78 → 82       │
├─────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ LEAGUE  │ │ CUP     │ │ EUROPE   │  │
│  │ 🥇 1st  │ │ 🏆 Win  │ │ SF       │  │
│  │ 38 apps │ │ 6 apps  │ │ 10 apps  │  │
│  └─────────┘ └─────────┘ └──────────┘  │
│                                         │
│  ┌─────────┐ ┌─────────┐               │
│  │ NATIONAL│ │ AWARDS  │               │
│  │ 🇪🇸 8app │ │ ⭐ BdO  │               │
│  └─────────┘ └─────────┘               │
├─────────────────────────────────────────┤
│  SEASON STATS: 54 Apps · 22G · 11A     │
│  Rating: 7.82 · Growth: +4 OVR         │
└─────────────────────────────────────────┘
```

- **Skim:** Tiles overview — mỗi competition = 1 tile nhỏ với icon + kết quả + apps.
- **Drill down:** Bấm tile → expand chi tiết (journey, stats breakdown, events).
- **Style:** "Year in Football" — Giant Typography cho highlight chính. Nền Cream, editorial tone.
- **Timing:** Xuất hiện sau khi tất cả competitions đã resolve, trước transfer step.

### 5.6 Floating Modal — Rules cho non-wheel actions

Mọi action tương tác KHÔNG phải wheel spin (transfer, season recap, contract decisions) phải dùng **floating modal overlay**.

| Quy tắc | Chi tiết |
|---|---|
| **Z-index** | `z-50` (modal layer), background blur nhẹ (`backdrop-blur-sm`) |
| **Kích thước** | Desktop: `max-w-xl` centered. Mobile: full-screen bottom sheet hoặc full modal (§11) |
| **Không chồng** | Tối đa 1 modal mở cùng lúc. Drill-down → expand trong modal, không mở modal mới |
| **Close** | Có nút X rõ ràng. Click backdrop đóng (trừ decision ép chọn như transfer accept/reject) |
| **Craft** | Modal trông như tờ giấy/programme đặt lên bàn — không phải SaaS dialog box |

---

## 6. Motion & feedback (UI-only)

| Moment | Motion |
|---|---|
| Mọi spin | Giữ resolver + animation wheel hiện tại |
| Sau outcome (low-stakes) | Micro stamp "cộp" lên góc màn hình (không chặn next step) |
| Sau outcome (high-stakes) | **Headline Hold** — text reveal delay 1–1.5s, full-bleed overlay tạm thời |
| Floating modal open | Slide-up từ dưới (mobile) hoặc fade-in centered (desktop), 0.3s ease-out |
| Season Recap | Tiles fade-in staggered (0.1s/tile). Expand = morphing transition |
| Transfer decision | "Contract fax" slide lên bàn. Stamp seal animation khi accept/reject |

---

## 7. Token & implementation hygiene (đợt UI)

1. Hội tụ về semantic tokens trong `frontend-style-system-guide.md` (`primary`, `gold`, surfaces…).
2. Giảm dần inline `style={{}}` / `--coral` ad-hoc **trên surface đang đụng** — không big-bang rewrite cả repo nếu ngoài scope màn hình.
3. Không thêm design system mới (không shadcn dashboard look).
4. Copy tiếng Việt giữ; tone editorial sport, ngắn.

---

## 8. Acceptance criteria

### Must

- [ ] Chơi full 1 mùa: **cùng thứ tự bước** như trước (manual QA checklist theo §1.2).
- [ ] Mọi quyết định nghề nghiệp vẫn qua **spin** (trừ transfer accept/reject/renew đã có).
- [ ] Wheel section **chỉ chứa wheel spin** — transfer/recap render bằng floating modal riêng.
- [ ] Wheel luôn là focus visual của bước quyết định.
- [ ] Ballon/cup **nhìn khác** growth step; growth vẫn rõ ràng, không bị "cúng".
- [ ] Không xuất hiện anti-patterns §4.2 trên màn hình đã ship.
- [ ] Transfer/season numbers **không đổi** so với logic hiện tại (cùng input → cùng BE result).
- [ ] Season Recap gộp `SeasonResultModal` + `SeasonStatsModal` thành 1 floating modal.
- [ ] Mobile: chơi được full career trên viewport 375px+ (§11).

### Nice

- [ ] Mid-career story rail đọc được club stints.
- [ ] Token align trên career + squad + lobby.

### Out of scope (ticket riêng)

- Đổi weight / apps / transfer economy.
- Thêm wheel type mới.
- i18n framework.

---

## 9. Phased delivery (gợi ý — vẫn UI-only)

| Phase | Ship | Risk |
|---|---|---|
| **U0** | SoT này + QA checklist flow | — |
| **U1** | Season strip + stakes skins (standing/cup/Ballon) + giữ growth shell | Thấp |
| **U2** | Story rail + Season Recap floating modal (gộp 2 modal) | Trung |
| **U3** | Transfer decision theatre (floating modal) + squad gallery polish | Trung |
| **U4** | Token convergence + mobile responsive polish | Thấp–trung |

Mỗi phase: playtest 1 career ngắn trước khi phase sau.

---

## 10. Quyết định đã chốt / chờ

| # | Quyết định | Status |
|---|---|---|
| D1 | Không bỏ / không thay spinner wizard bằng portal-first | **LOCKED** |
| D2 | Không đổi `careerSubStep` order | **LOCKED** |
| D3 | Giữ cream/pitch/gold/Panini language | **LOCKED** |
| D4 | Anti-AI craft reference, không clone | **LOCKED** |
| D5 | Story rail mid-career (read-only) bên trái wheel | **LOCKED** — giữ |
| D6 | Gộp Season Recap (SeasonResultModal + SeasonStatsModal → 1 floating modal) | **LOCKED** — gộp |
| D7 | Section Wheel CHỈ cho wheel spin. Non-wheel actions dùng floating modal riêng | **LOCKED** |
| D8 | Mobile responsive phải chơi được full career trên 375px+ | **LOCKED** |

---

## 11. Mobile Responsive Spec

### 11.1 Breakpoint Strategy

```txt
375px+  (mobile)    Target tối thiểu — iPhone SE / Android compact
640px   (sm)        Tablet portrait, large phone landscape
768px   (md)        Tablet landscape
1024px  (lg)        Desktop — primary target
1280px  (xl)        Wide desktop
```

### 11.2 Career Screen — Mobile Layout

Mobile **KHÔNG** hiển thị 3 cột. Chuyển sang **single column stacked**:

```txt
┌─────────────────────────┐
│  Season strip (compact) │  ← scrollable horizontal, icon-only
├─────────────────────────┤
│                         │
│    WHEEL SECTION        │  ← full-width, center
│    (spin + result)      │
│                         │
├─────────────────────────┤
│  Quick stats bar        │  ← OVR + Age + Club (collapsed)
└─────────────────────────┘
```

- **Story rail** → ẩn trên mobile. Truy cập qua hamburger menu hoặc swipe gesture.
- **Panini card / Season profile** → ẩn. Truy cập qua tap avatar nhỏ góc trên.
- **Season strip** → thu gọn thành icon-only (●○○○○) với label hiện khi tap.
- **Wheel** → chiếm full-width, wheel size tự scale theo viewport.

### 11.3 Floating Modal — Mobile

| Component | Mobile behavior |
|---|---|
| Season Recap | **Full-screen bottom sheet** — swipe down to dismiss. Tiles stack vertical |
| Transfer Decision | **Full-screen modal** — contract fax chiếm 100vh. 2 CTA buttons sticky bottom |
| Player Profile | **Full-screen drawer** từ phải. Swipe right to dismiss |
| Standing/Cup result | **Bottom sheet** 60% height — drag to expand full |

### 11.4 Touch Targets

- Minimum touch target: **44x44px** (WCAG 2.5.8).
- Wheel spin button: **>=56px** height, full-width trên mobile.
- CTA buttons (accept/reject): **>=48px** height, min-width 120px.
- Tile cards trong Season Recap: **>=64px** height.

### 11.5 Typography Scale — Mobile

```txt
Desktop → Mobile adjustments:
text-4xl  (36px) → text-3xl (30px)   Hero numbers (OVR)
text-2xl  (24px) → text-xl  (20px)   Page headings
text-xl   (20px) → text-lg  (18px)   Section titles
text-base (16px) → text-base (16px)  Body (giữ nguyên)
text-sm   (14px) → text-sm  (14px)   Labels (giữ nguyên)
```

### 11.6 Performance — Mobile

- Wheel animation: giảm particles/effects trên mobile (prefer `prefers-reduced-motion`).
- Backdrop blur: dùng `backdrop-blur-sm` (4px) thay vì `backdrop-blur-md` trên mobile.
- Image: lazy-load Panini stickers ngoài viewport.
- Scroll: sử dụng `scroll-snap` cho horizontal strips.

### 11.7 Mobile-specific Rules

- Không dùng hover-only interactions — phải có touch alternative.
- Không dùng tooltip — dùng tap-to-reveal hoặc inline label.
- Không dùng side-by-side comparison trên <640px — stack vertical.
- Swipe gestures cho navigation giữa competitions trong Recap.
- Safe area padding cho notch/dynamic island devices.

---

## 12. Anti-AI Craft — Bảng tham chiếu nhanh

Bổ sung cho §4 — bảng dấu hiệu cụ thể để kiểm tra khi review UI:

| Dấu hiệu AI (CẤM) | Giải pháp Craft (DÙNG) |
|---|---|
| Gradient purple-blue perfect | Paper texture + noise grain |
| Pill button clusters đều tăm tắp | Stamp/seal buttons, editorial weight khác nhau |
| Shadow đa lớp "floating card" | Viền đen 1px bình dị (newspaper border) |
| Identical card heights grid | Broken grid editorial, ô lệch nhau có chủ ý |
| Hero section gradient abstract | Pitch/sticker/cup cụ thể, real football anchors |
| Skeleton loading theatre mọi nơi | Chỉ skeleton cho data fetch >500ms |
| Confetti mọi spin | Confetti/particles **chỉ** cho trophy/Ballon (gold reserved) |

---

## Changelog

| Date | Note |
|---|---|
| 2026-07-31 | v1.0 — SoT UI overhaul; wheel-first; flow locked; Mobbin anti-AI craft; phased U1–U4. |
| 2026-08-01 | v1.1 — Wheel section chỉ cho wheel (D7). Non-wheel actions → floating modal (§5.6). Season Recap gộp confirmed (D6). Thêm Mobile Responsive Spec (§11). Thêm Anti-AI checklist (§12). Stakes skinning craft details (§5.2). Headline Hold timing rules. |
