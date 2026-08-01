# Design SoT — UI/UX Overhaul (v1.0)

> **Status:** Source of Truth cho đợt **update lớn UI/UX** — **chưa code**.  
> **Phạm vi:** Presentation / layout / motion / hierarchy / anti-AI-vibe craft.  
> **Ngoài phạm vi:** Thay đổi game logic, wheel sequence, weights, Server Actions, sim formulas.
>
> **Product locks (2026-07-31):**
> 1. **Wheel / spinner là xương sống** Path to Glory — không bỏ, không thay bằng dashboard manager.
> 2. **Flow logic hiện tại giữ nguyên** (cùng `careerSubStep` order & branching).
> 3. **Visual system hiện tại giữ** (cream / pitch green / gold / Panini / stamp) — refine, không rebrand.
> 4. **Mobbin = reference craft** chống vibe AI generic — không copy app thể thao 1:1.
> 5. Đợt này **chỉ UI** — mọi đề xuất chạm logic → reject hoặc tách ticket riêng.
>
> Tài liệu liên quan:
> - [`frontend-style-system-guide.md`](./frontend-style-system-guide.md) — tokens / typography / rarity (vẫn SoT style).
> - [`game-design.md`](./game-design.md) — pillars Luck · Strategy · Probability · Storytelling · Replayability.
> - [`core-transfer-design.md`](./core-transfer-design.md) — transfer economy (logic đã lock; UI layer theo §6 đây).
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
| Thay wheel bằng “Continue” inbox kiểu FM | Sai genre |
| Thêm màn hình bắt buộc mới vào giữa pipeline | Phá session pacing |
| Đổi weight / sim / transfer formulas “cho đẹp UI” | Scope creep logic |

UI chỉ được: **trình bày rõ hơn cùng một bước**, **nhấn stakes cảm xúc**, **giảm noise**, **không đổi câu hỏi người chơi trả lời bằng spin**.

---

## 2. Vấn đề UI hiện tại (chẩn đoán)

Giữ đúng hướng aesthetic; thiếu **craft + hierarchy + anti-generic**.

| Pain | Cảm giác user | Hướng sửa (UI-only) |
|---|---|---|
| Mọi step cùng 1 shell card | Ballon = tăng PAC về mặt cảm xúc | **Skin theo stakes** (cùng step, khác presentation) |
| Panel action dày + string switch | Wizard form, không “mùa bóng” | Layout denser cho growth; **ceremony** cho cup/Ballon |
| Timeline chỉ lúc retire | Sự nghiệp vô hình giữa chừng | **Rail timeline** cạnh wheel (read-only) |
| Transfer dạng bảng dài | Admin / AI spreadsheet | Negotiation focus: 1 quyết định nổi / view |
| Modal chồng (stats / result / profile) | Mệt, không biết SoT recap | **Một Season Recap** skim→expand (cùng data) |
| Token doc ≠ token code (`--coral` vs `--primary`) | Drift, dễ sinh UI lệch | Align implementation về style guide trong đợt UI |
| Generic AI tells | Flat cards, pill spam, purple glow, “dashboard tiles” vô hồn | Anti-patterns §4 |

---

## 3. Mục tiêu trải nghiệm (UI)

1. **Wheel vẫn là hero** mỗi bước quyết định — lớn, rõ, có tension.
2. **Cùng logic, khác cảm xúc** theo loại beat (growth vs cup vs Ballon vs transfer).
3. **Biết mình đang ở đâu trong mùa** mà không thêm bước mới (season strip read-only).
4. **Thấy sự nghiệp đang viết** (timeline / sticker) giữa các spin — không thay spin.
5. **Trông handcrafted** (editorial sport + game board), không “AI generated SaaS”.

---

## 4. Anti-AI vibe — Mobbin-informed craft rules

> Mobbin dùng như **thư viện pattern craft** (sports / progress / profile / scoreboard),  
> **không** như template clone. Không có Mobbin MCP trong workspace → khi implement,  
> designer/dev tự mở [Mobbin Sports](https://mobbin.com/explore/mobile/app-categories/sports)  
> và đối chiếu checklist dưới.

### 4.1 Lấy từ Mobbin (tinh thần)

| Pattern Mobbin | Áp dụng FL | Không làm |
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
- Multi-layer drop shadow “premium card”.
- Emoji làm UI primary (stamp/icon hệ thống OK nếu đã có trong language).
- Inter-only flat marketing layout; hero text overpower brand/game motif.
- “Portal tiles” copy FM mà **che** wheel.
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

### 5.1 Career screen — 3 vùng cố định

```txt
┌─────────────────────────────────────────────────────────────┐
│  Season strip (read-only): Growth · League · Cups · … · Mkt │
├──────────────┬──────────────────────────────┬───────────────┤
│  Story rail  │     WHEEL HERO + ACTION      │  Panini /     │
│  (timeline,  │     (đúng subStep hiện tại)  │  season side  │
│   OVR spark) │                              │               │
└──────────────┴──────────────────────────────┴───────────────┘
```

- **Giữa = wheel + primary CTA** — không bị portal cướp focus.
- **Trái = context sự nghiệp** (read-only) — tăng storytelling.
- **Phải = identity card** (đã có Panini/SeasonProfile — polish, không bỏ).
- **Strip trên = orientation** — không click để skip logic; tối đa jump UI tới panel đang active.

### 5.2 Stakes skins (cùng step machine)

| Beat | Presentation skin | Vẫn là |
|---|---|---|
| Growth (dir/count/selector/mag) | Compact ritual + step chips | SpinnerWheel |
| Standing | Programme headline “Xếp hạng mùa” | SpinnerWheel |
| Domestic / Continental cup | Cup masthead + journey expandable | SpinnerWheel |
| National / Ballon | Ceremony (gold, fuller bleed) | SpinnerWheel |
| Transfer | Decision theatre (1 offer focus) | Cùng transfer rules |
| Resolved / season_stats | Single Season Recap (tile→detail) | Cùng payload sim |

### 5.3 Squad / Lobby

- Lobby & PitchBoard: gallery sticker XI — **không** đổi draft slot rules.
- Empty slot CTA rõ; filled slot = mini career badge (năm / OVR) — cosmetic.

### 5.4 Transfer UI (logic đã lock ở core-transfer)

- Sticky contract hiện tại.
- Inbound: tối đa K=3 nhưng **UI focus 1 card** (carousel/select), không 3 bảng song song dày đặc.
- Shortlist collapsed mặc định; approach % giữ.
- FA / unemployed warning rõ — copy/visual only.

---

## 6. Motion & feedback (UI-only)

| Moment | Motion |
|---|---|
| Mọi spin | Giữ resolver + animation wheel hiện tại |
| Sau outcome | Micro stamp / OVR tick trên rail (không chặn next step) |
| High stakes reveal | Longer hold + headline; **không** thêm confirmation step bắt buộc |
| Modal → Recap | Prefer sheet/expand trong composition; giảm z-index stack |

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
- [ ] Wheel luôn là focus visual của bước quyết định.
- [ ] Ballon/cup **nhìn khác** growth step; growth vẫn rõ ràng, không bị “cúng”.
- [ ] Không xuất hiện anti-patterns §4.2 trên màn hình đã ship.
- [ ] Transfer/season numbers **không đổi** so với logic hiện tại (cùng input → cùng BE result).

### Nice

- [ ] Mid-career timeline rail đọc được club stints.
- [ ] Season Recap một bề mặt chính.
- [ ] Token align trên career + squad + lobby.

### Out of scope (ticket riêng)

- Đổi weight / apps / transfer economy.
- Thêm wheel type mới.
- i18n framework.
- Mobile-native redesign từ zero.

---

## 9. Phased delivery (gợi ý — vẫn UI-only)

| Phase | Ship | Risk |
|---|---|---|
| **U0** | SoT này + QA checklist flow | — |
| **U1** | Season strip + stakes skins (standing/cup/Ballon) + giữ growth shell | Thấp |
| **U2** | Story rail timeline + Season Recap gộp modal | Trung |
| **U3** | Transfer decision theatre + squad gallery polish | Trung |
| **U4** | Token convergence trên surfaces đã đụng | Thấp–trung |

Mỗi phase: playtest 1 career ngắn trước khi phase sau.

---

## 10. Quyết định đã chốt / chờ

| # | Quyết định | Status |
|---|---|---|
| D1 | Không bỏ / không thay spinner wizard bằng portal-first | **LOCKED** |
| D2 | Không đổi `careerSubStep` order | **LOCKED** |
| D3 | Giữ cream/pitch/gold/Panini language | **LOCKED** |
| D4 | Mobbin = anti-AI craft reference, không clone | **LOCKED** |
| D5 | Timeline rail mid-career (read-only) | Đề xuất U2 — OK trừ khi product veto |
| D6 | Gộp Season Recap | Đề xuất U2 — OK trừ khi muốn giữ 2 modal |

---

## Changelog

| Date | Note |
|---|---|
| 2026-07-31 | v1.0 — SoT UI overhaul; wheel-first; flow locked; Mobbin anti-AI craft; phased U1–U4. |
