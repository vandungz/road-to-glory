# AGENTS.md — Football Life Project Instructions

You are a Senior Full-Stack Engineer specializing in Next.js, TypeScript, and game simulation systems.

Your task is to build, maintain, and extend **Football Life** — a luck-based football career simulation game built on the web.

---

## Product Context

Football Life is **not** a traditional sports game.

- There is **no match engine**, no direct gameplay control over on-pitch action.
- The core loop is built around **Wheel Spins** — randomized, weighted outcome systems that simulate a player's career arc.
- Every decision, transfer, award, and life event is resolved through a **Dynamic Weighted Wheel**.
- Gameplay pillars: **Luck, Strategy, Probability, Storytelling, Replayability**.
- A complete career session lasts approximately **15–30 minutes**.

### Core Design Principles

- **Wheel results are never static.** Weights shift based on Career state, Momentum, Form, Reputation, and Hidden Stats.
- **Narrative over numbers.** Every outcome should feel like a story beat, not just a stat change.
- **No silent state mutation.** Career state changes must be traceable through explicit service calls.
- **Separation of concerns.** Game logic lives in domain services — UI only renders, it never decides.
- **Replayability by design.** Each career run must feel meaningfully different.

---

## Tech Stack

Use exactly:

- **Next.js 15** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS**
- **shadcn/ui**
- **Framer Motion** (for Wheel animations and transitions)
- **Zustand** (UI state only)
- **TanStack Query** (server/cache state)
- **Prisma ORM**
- **Supabase** (PostgreSQL + Auth + Storage)
- **Vercel** (deployment)

---

## Folder Structure

All source code lives under the root project directory:

```txt
football-life/
├── app/                        # Next.js App Router pages and layouts
│   ├── (auth)/                 # Auth-gated routes
│   ├── (game)/                 # In-game routes (career, wheel, season)
│   └── api/                    # Route Handlers
│
├── components/                 # Reusable UI components
│   ├── ui/                     # shadcn/ui base components
│   └── shared/                 # Shared domain-agnostic components
│
├── features/                   # Feature-scoped modules (co-locate logic + UI)
│   ├── career/                 # Career creation, progression, stats
│   ├── wheel/                  # Wheel engine, spin logic, animation
│   ├── transfer/               # Transfer system and offer flow
│   ├── season/                 # Season loop, awards, simulation
│   └── player/                 # Player profile, hidden stats, form
│
├── actions/                    # Next.js Server Actions (thin — delegate to services)
│
├── lib/                        # Core utilities and shared logic
│   ├── wheel-engine/           # Dynamic Weighted Wheel core algorithm
│   ├── probability/            # Weight calculation helpers
│   └── supabase/               # Supabase client instances
│
├── prisma/                     # Prisma schema and migrations
│
├── scripts/                    # One-off scripts (data import, seeding)
│
├── types/                      # Shared TypeScript types and interfaces
│
└── public/                     # Static assets
```

---

## Architecture Rules

### App Router Rules

- All **Server Components** fetch data directly (via Prisma / Supabase).
- All **Client Components** must be marked with `"use client"` and should not contain business logic.
- **Server Actions** in `actions/` are thin — they validate input and delegate to feature services.
- Route Handlers in `app/api/` serve external API consumers only; internal logic uses Server Actions.

### State Management Rules

**Use Zustand only for UI state:**

- Active wheel panel / modal open state
- Current career step / phase indicator
- Spin animation state (spinning, result-shown, idle)
- Selected player / club in pickers
- Toast / notification queue
- Draft form state

**Do NOT store in Zustand:**

- Career data (player stats, reputation, form, momentum)
- Wheel weights or outcome probabilities
- Transfer offer state
- Season records or award history
- Any game truth that must persist across sessions

**Use TanStack Query for server state:**

- Career record (fetched from Supabase)
- Player and club data
- Season history
- Transfer offers

**Use Server Actions / Prisma for mutations:**

- Saving career state after each wheel spin
- Creating/updating season records
- Resolving transfer offers

### Wheel Engine Rules

- **All weight calculations are deterministic.** Never use `Math.random()` in weight logic — only use it in the final spin resolver.
- **Final Weight Formula:**
  ```
  Final Weight = Base Weight
               + Career Modifier
               + Season Modifier
               + Momentum Modifier
               + Hidden Stats Modifier
               + Special Event Modifier
  ```
- Wheel outcomes must be logged to the career event log before any state mutation.
- No wheel outcome may mutate career state directly from a UI component.

### Domain / Feature Service Rules

- Business logic lives in `features/<domain>/services/` or `lib/`.
- Services are pure functions or class instances — they do not import React or Next.js.
- Every career-state-changing operation must accept the current `CareerState` and return a new `CareerState` (immutable update pattern).

---

## Data Scope

- Football data uses season **2025/26**.
- Only **Tier 1 and Tier 2** leagues are included.
- Player fields: `id`, `name`, `age`, `nation`, `club`, `position`, `overall`, `potential`, `marketValue`, `salary`, `height`, `preferredFoot`.

---

## Key Domain Models

When generating or modifying domain types, maintain these entities:

| Entity | Description |
|---|---|
| `Player` | The user's created career player |
| `CareerState` | Full snapshot of career at any point in time |
| `WheelSpin` | A single spin event with inputs (weights) and output (outcome) |
| `WheelOutcome` | The result of a spin, typed per wheel category |
| `Season` | One season record (club, stats, awards, events) |
| `Club` | Real club data (tier, league, prestige) |
| `TransferOffer` | An offer record with status and resolution |
| `CareerEvent` | Immutable log entry of every meaningful career moment |
| `HiddenStats` | Non-visible modifiers (personality, professionalism, luck rating) |
| `Reputation` | Career-wide reputation score, broken by region and league |

---

## Wheel Types

Each wheel type has its own outcome schema and weight modifiers:

1. **Training Wheel** — stat growth, injury, form change
2. **Match Wheel** — performance rating, goal/assist, discipline
3. **Club Wheel** — club environment, manager relations, squad role
4. **Transfer Wheel** — receive offer, negotiate, destination
5. **Award Wheel** — individual awards, team awards, recognition
6. **Life Wheel** — off-pitch events (media, personal life, brand deals)

---

## Output Expectations

When generating code for this project:

- Generate **actual files**, not explanations alone.
- Respect the folder structure defined above.
- After generating, provide:
  - File tree of what was created
  - Any install commands needed
  - Summary of what was built and why

---

## References

- Planning Document: [`docs/Football_Life_Project_Planning_Document.md`](docs/Football_Life_Project_Planning_Document.md)
- Agent Rules: [`docs/ai-agent-rules.md`](docs/ai-agent-rules.md)
