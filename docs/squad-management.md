# Classic squad management

A source squad may move out exactly one retired player over its lifetime. Receiving
players does not spend its own outbound turn. Another squad owned by the same authenticated user can receive a player in an
exact-position formation slot, whether empty or occupied. An occupied destination
requires the exact occupant ID, its updatedAt snapshot and explicit DELETE consent.
The occupant is permanently deleted with its career dependants; this is not a swap
or a copy. Both in-progress and completed squads are eligible. Removing/replacing a player never restores the turn.

The player row is moved by ID; season records, honours, snapshots, checkpoints and
career history remain attached. A squad_player_moved event records source, target
and slot before the update. The source reopens, its rating is cleared, and affected
PvE snapshots are deleted atomically. An in-progress target stays in progress. A completed target retains completion
when it still has eleven retired players, with its rating recomputed. Deleting a squad cascades only its remaining players and
PvE data, so a player moved out beforehand survives.

## Server boundary

- actions/squad.actions.ts validates strict UUID/slot/confirmation schemas, obtains
  the owner from Supabase Auth, rate-limits and invalidates affected route caches.
- features/squad/services/squad-management.service.ts locks both squads in stable
  ID order, then rechecks ownership, retirement, occupancy and the permanent flag
  inside the transaction. Delete/replace and finalization share the squad lock.
- Existing unique(gameSessionId, slotIndex) remains the final slot collision guard
  for concurrent draft writers. A failure rolls back the whole move.
- Finalization now requires exactly eleven retired players matching formation slots.

Migration 20261126000100_squad_player_move adds game_sessions.playerMoveUsed with
NOT NULL/default false. Applied to the connected shared Supabase database on
2026-11-26 using prisma migrate deploy; migrate status confirmed current. No real
user squad or player was deleted or transferred during implementation. No new API,
Data API grant or privileged function was added; anon/authenticated cannot update
the flag through PostgREST.

## UI

Squad board exposes Delete squad with a typed DELETE confirmation. If an outbound
move remains, it reminds the owner to cancel and move a completed player first.
The archive header's Manage player button opens the move/replace/remove options
inside the same modal, replacing the former sidebar box. Transfer destinations are
loaded on demand and validated again on submission. Pending actions block dismissal
and conflicting submissions. Display-only dev previews never mutate account data.

## Checks

    pnpm exec tsx tests/squad-actions.test.ts
    pnpm exec tsx tests/squad-management.integration.ts
    pnpm exec tsx tests/squad-concurrency.integration.ts
    pnpm exec playwright test tests/e2e/squad-management.spec.ts

The first integration test uses real PostgreSQL inside one rollback transaction.
The concurrency test creates a random non-login synthetic owner and fixture squads,
uses separate runtime connections to test row locks, and removes all fixtures in
finally. It never selects a real account or existing squad. DIRECT_URL must be the
trusted administrative test connection; DATABASE_URL uses the runtime role.

Hallmark finish review: ship; no actionable findings. Render checks: 0 Floor/Reflex
failures. Mobile-hidden content warning is the existing desktop-only game policy.

## Occupied destination update

The destination list includes minimal occupant display data (id, name, updatedAt, portrait ID, position,
nationality and peak OVR),
never hidden stats or career histories. Selection and confirmation typing are local;
there is no extra request per keystroke or destination change. Changing destination
or reopening the form clears prior consent. No additional service or paid storage
is required.

The transaction locks the occupant row as well as both squads before checking the
snapshot. If B changed, disappeared or was replaced, it rejects the old consent and
leaves both squads untouched. The move event records replacedPlayerId before the
single transaction deletes B, moves A, consumes the source turn and clears both PvE
snapshots. A duplicate/stale request cannot delete the incoming replacement.

Real PostgreSQL tests additionally check victim cascade deletion, A's retained
history, completed-target rating, stale ID/timestamp rejection and two competing
requests confirming the same B. All synthetic owners/squads are cleaned up.

Infrastructure review found the existing unique(gameSessionId, slotIndex) index
covers occupant lookup. Migration 20261126000200_squad_owner_index adds a concurrent
(userId, createdAt) index for owner-filtered, date-ordered lists. Applied and checked
valid on 2026-11-26; current index size 16 kB. With the current small table PostgreSQL
still chooses a sequential scan. A zero-result synthetic-owner EXPLAIN ANALYZE took
0.063 ms inside PostgreSQL; this is not end-to-end response latency or a load-test
claim. The codebase does not pin a Vercel region; actual function-region settings
have not been verified. Keep compute near the existing Singapore Supabase database
when configuring deployment to avoid cross-region transaction round trips.

UI checks cover explicit DELETE, disabled submit, switching slots, fresh consent on
reopen, pending isolation and 1024/1280/1920 layouts. Hallmark fresh-context finish
review: ship, no design findings. No real player was overwritten by implementation
or testing. Production still requires deploying the changed application source.

## Comparison modal revision

The move view uses a wider two-column comparison with static existing portraits,
name, position, peak OVR and nationality. Roles distinguish the incoming retained
career from the permanently deleted occupant; empty slots show that no deletion
occurs. The footer stays visible on short desktop windows while its body scrolls.
No videos, full timelines, new image generation or per-selection requests are used.

Readonly destination loading is separate from mutation pending state. It says
Loading your squads and permits cancel/back/close. A request generation counter
ignores late responses after leaving or reopening the view. Destructive submission
still blocks dismissal and preserves all existing stale-occupant/ownership checks.

New files:
- features/player/components/PlayerMoveComparison.tsx
- app/styles/features/player-move.css

Modified wiring: PlayerManagement, PlayerCareerDialog, actions/squad.actions.ts,
types/squad.ts, app/layout.tsx, VI/EN message catalogs and squad UI/action tests.
No dependency or migration is needed. Hallmark render has no Floor/Reflex failures;
phone-hidden-content warning reflects the existing desktop-only policy. Fresh
finish review: ship. E2E covers comparison identities, metadata, static portraits,
explicit deletion consent, reset on selection, cancelable loading and three desktop
sizes. Action tests verify the comparison payload is owner-filtered and excludes
hidden stats, timelines and season history.
