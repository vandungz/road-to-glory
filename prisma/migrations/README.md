# Migration runbook

The repository did not contain Prisma migration history when the persistence
update started. `00000000000000_baseline` is a schema baseline captured from
the current database structure; `20260902000100_career_persistence_foundation`
is the additive V2 migration, `20260902000200_career_command_idempotency`
adds idempotency storage for non-wheel career commands,
`20260918000100_transfer_workflow_state` stores compact resumable transfer
state separately from the season JSON runtime aggregate,
`20260903000100_repeatable_wheel_checkpoints` allows repeated growth wheel
steps, `20260904000100_ballon_dor_test_fixture` records the first (now removed)
fixture-registry attempt, and `20260904000200_ballon_dor_nugu_checkpoint_case`
attaches a deterministic CM test player directly to the existing Nugu squad.

## Existing database without `_prisma_migrations` history

1. Take and verify a database backup.
2. Confirm the database schema is the one used to produce the baseline.
3. Mark only the baseline as applied:

```powershell
npx prisma migrate resolve --applied 00000000000000_baseline
```

4. Apply the additive migration:

```powershell
npx prisma migrate deploy
```

5. Verify:

```powershell
npx prisma migrate status
```

After the command-idempotency migration is added to the deployed codebase, run
`npx prisma migrate deploy` again and verify status before enabling any future
V2 Shop command consumer. The current Shop UI remains on its existing action.

## Ballon d'Or development data case

The migration targets exactly one existing in-progress `Nugu` / `4-4-2`
session and inserts a CM at slot 6 with:

- `currentAge = 25`
- `currentStep = ballon_dor_nomination`
- `checkpointVersion = 2`, `revision = 0`
- deterministic nomination and ranking weights for manual testing

No test URL, server action, or extra session is created. After applying the
migration, open the normal `Nugu` squad, select the active CM slot 6, and the
existing checkpoint hydration opens the Ballon d'Or nomination wheel.
If no matching Nugu session exists, the migration safely skips the fixture; if
more than one exists or slot 6 is occupied, it aborts instead of guessing.

## Legacy projection backfill

Inspect first without writing:

```powershell
npm run backfill:career-projection
```

The backfill only fills `currentAge/currentStep/currentWheel` when all three
are null and the latest timeline has an explicit age. It keeps
`checkpointVersion=1` and never fabricates seasons or wheel checkpoints. To
apply after reviewing the dry-run, use the explicit confirmation:

```powershell
$env:CAREER_BACKFILL_CONFIRM = "I_UNDERSTAND_LEGACY_PROJECTION"
npm run backfill:career-projection -- --apply
```

Do not run `prisma migrate dev` against a shared or production database. Do not
mark the V2 migration as applied before its tables, columns, indexes and
foreign keys have been verified.

## New database

```powershell
npx prisma migrate deploy
```

This applies the baseline first, then the additive V2, command-idempotency,
repeatable-checkpoint, fixture cleanup, and direct Nugu test-data migrations.
