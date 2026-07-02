# Football Life

## Project Planning Document (MVP v1.0)

# 1. Overview

## Project Name

**Football Life**

## Genre

Luck-based Football Career Simulation

## Platform

-   Web (Desktop First)
-   Mobile Responsive (Phase 2)

# Vision

Football Life là một game mô phỏng sự nghiệp cầu thủ bóng đá theo phong
cách Random Wheel.

-   Không có gameplay điều khiển trận đấu.
-   Không có Match Engine.
-   Gameplay tập trung vào Luck, Strategy, Probability, Storytelling và
    Replayability.
-   Một career hoàn chỉnh kéo dài khoảng **15--30 phút**.

# 2. Project Goals

## MVP Goals

-   Validate gameplay loop
-   Tạo trải nghiệm gây nghiện
-   Replay cao
-   Có khả năng mở rộng thành Live Service

# 3. Data Scope

Dữ liệu sử dụng mùa giải **2025/26**.

## Leagues

-   Chỉ lấy Tier 1 và Tier 2.

## Clubs

-   Toàn bộ CLB thuộc các giải trên.

## Players

Các trường dữ liệu: - id - name - age - nation - club - position -
overall - potential - marketValue - salary - height - preferredFoot

# 4. Gameplay Flow (Classic Mode)

``` text
Tạo Game Session mới (Squad XI 4-3-3)
↓
Click vào slot vị trí trống trên sân (ST, CB, GK...)
↓
Quay Phase 1: Setup Wheels (6 bước lấy basic identity)
↓
Quay Phase 2: Career Loop (Lặp lại Stints & Years thi đấu)
  - Quay Stint Wheels: League Wheel → Club Wheel → Years at Club
  - Quay Yearly Wheels: Stats Update Wheels (OVR direction, quantity, magnitude)
  - Quay NT Wheels: Call-up, Tournament (mỗi 2/4 năm chẵn lẻ)
↓
Cầu thủ giải nghệ (Hết length sự nghiệp)
↓
Trích xuất Peak OVR & Render Player Card lưu vào slot
↓
Lặp lại cho đến khi đủ 11 vị trí trên sân
↓
Chốt Squad Rating & Hoàn thành Game Session
```

# 5. Core Systems

-   **Career Simulation**: Giả lập sự nghiệp theo stints chuyển nhượng và chỉ số stats timeline hàng năm.
-   **National Team Integration**: Gọi tuyển và tham gia cúp quốc tế (World Cup, Euro, Copa...) theo quốc tịch và OVR.
-   **Hidden Stats**: Chỉ số ẩn (`personality`, `professionalism`, `luckRating`) ảnh hưởng chấn thương, sự nghiệp, cúp và Ballon d'Or.
-   **Squad Rating**: Điểm đánh giá trung bình OVR của cả đội hình 11 vị trí.

# 6. Wheel Types

-   **Setup Wheels**: Nationality, Position, Debut Age, Debut Stats, Career Length, Number of Clubs.
-   **Career Loop Wheels**: League, Club, Years at Club, Ballon d'Or, Stats Updates (OVR Direction, Quantity, Magnitude), NT Call-up, NT Tournament.

# 7. Dynamic Weighted Wheel

```
Final Weight = Base Weight
            + AgeModifier
            + PositionModifier
            + NationalityModifier
            + UserBiasModifier
```

Mọi vòng quay đều được tính toán trọng số động deterministic trên backend trước khi được resolve bằng `Math.random()`.

# 8. Transfer & Stint System

Hành trình qua các CLB được quyết định thông qua vòng quay giải đấu (League Wheel), câu lạc bộ (Club Wheel) và số năm gắn bó (Years at Club Wheel) dựa trên OVR hiện tại và quốc tịch cầu thủ.

# 9. Save System

Career được lưu dưới dạng JSON trên Supabase.

# 10. Tech Stack

## Frontend

-   Next.js 15 (App Router)
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   Framer Motion
-   Zustand
-   TanStack Query

## Backend

-   Next.js Route Handlers
-   Server Actions
-   Middleware

## Database

-   Supabase PostgreSQL

## Authentication

-   Supabase Auth

## ORM

-   Prisma ORM

## Storage

-   Supabase Storage

## Deployment

-   Vercel
-   Supabase Cloud

# 11. Folder Structure

``` text
football-life/
├── app/
├── components/
├── features/
├── actions/
├── lib/
├── prisma/
├── scripts/
├── types/
└── public/
```

# 12. Roadmap

## Phase 1 — Foundations & Core Logic

-   Project setup, Auth & Database schema
-   Import real-world football data (clubs, leagues, trophy history)
-   Name generation lists by nationality
-   Core Wheel Engine (weight calculations & spin resolver with deterministic tests)

## Phase 2 — Interactive Game & Simulation Loop

-   Game Session CRUD & Squad XI 4-3-3 pitch board
-   Phase 1 Setup Wheels cascade
-   Phase 2 Career Simulation Loop (Stint level wheels, year-by-year BE simulation, stats update wheels, NT call-ups and tournaments)
-   Retrospective Peak OVR extraction & FIFA-style Card Reveal animation
-   Career Detail Modal (OVR progression chart, club timeline, events)

## Phase 3 — Leaderboard & Polish

-   Achievements & Statistics
-   Squad Rating Leaderboard
-   Share card generation (OG image export)
