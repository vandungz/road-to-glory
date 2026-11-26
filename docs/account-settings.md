# Account settings

Updated 2026-11-26. Settings has URL-backed Profile, Security, Audio and Language
tabs. Only the selected panel is visible; the page fits the supported desktop
viewport. Profile remains available through the `/profile` compatibility redirect.

## Password changes

`actions/account.actions.ts` derives identity/email from `auth.getUser()`, validates
input and consumes the authenticated account-security quota (5 attempts/15 minutes).
Password changes verify the current password, update it through Supabase Auth and
sign out other sessions. A partial session-revocation failure is reported explicitly.
Google-only users manage their Google password with Google rather than being asked
for a nonexistent game password.

## Self-deletion

`supabase/account-deletion.sql` was applied to the connected Road to Glory project
as `account_self_deletion`. No application service-role key is needed.

- The server action accepts a confirmation and current password, never a target ID.
  Email/password accounts must verify the current password again.
- The authenticated-only RPC derives the owner from the signed JWT, checks the
  account and session still exist, and requires password/OAuth/OTP/MFA authentication
  within five minutes. Refreshing an old access token does not refresh its AMR time.
- Google reauthentication uses the existing `/auth/callback?next=/profile` allowlist
  entry. A short-lived HttpOnly return cookie selects the Security tab afterward;
  it grants no authorization and cannot select an external destination.
- The SQL transaction deletes only owned game sessions, their cascading career/PvE
  records, and the Auth identity. Auth session/identity foreign keys cascade too.
- A parent-owner trigger locks the Auth row when creating/reassigning a game session.
  This prevents concurrent account deletion from leaving a new orphan. Historical
  orphaned fixture rows are not modified by this migration.
- Existing access tokens can outlive deletion, but `getUser()` and this RPC reject
  the missing identity/session. Game tables retain their existing Data API lockdown.
- Current Storage contains no objects. If future uploads belong to a user, deletion
  fails atomically until a Storage API cleanup workflow is implemented; it does not
  leave partial account deletion or silently claim the files were deleted.

The Supabase advisor warning about an authenticated `SECURITY DEFINER` RPC is
intentional here: self-deletion requires Auth-table access. The function has an
empty search path, no caller-selected ID and explicit identity/session/recency
checks. PUBLIC/anon have no EXECUTE privilege. The internal trigger function has
no API-role EXECUTE grants. See the [advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Verification

- `pnpm exec tsx --tsconfig tests/tsconfig.json tests/account-settings.test.ts`
  exercises the real actions with provider/quota stubs, including guest, malformed
  input, injected foreign ID, wrong password, quota, update/revocation ordering,
  and RPC failure/success. It never sends real credentials.
- `pnpm exec tsx --tsconfig tests/tsconfig.json tests/account-oauth-return.test.ts`
  checks origin rejection, callback reuse, the local return tab and external-target
  rejection without contacting Google.
- `tests/account-deletion.sql` was executed with the migration in one transaction
  ending in ROLLBACK. Random dummy identities/sessions/squads verified guest denial,
  stale auth, revoked session, owner isolation, cascading deletion and rejection of
  a deleted owner. No real account was deleted.
- Browser tests exercise confirmation/cancellation and preview-only submission,
  tab isolation and geometry, URL restoration, keyboard navigation, audio portal
  layout, homepage playback, and existing game progression.

The dev settings preview never submits credential/deletion mutations. End-to-end
OAuth on a real provider and a real-account password/deletion journey remain manual
release checks; do not use an account whose saved careers must be preserved.

## Profile and action loading

Profile uses separate rows for the avatar/display name, editable name,
email and Google connection. Only Google is offered as an additional provider.
Connecting uses `auth.linkIdentity`, never `signInWithOAuth`; errors return to the
same signed-in Settings page. It requires Supabase's Manual Linking option, whose
current Dashboard state has not yet been verified. The public `/auth/v1/settings`
response does not expose that flag. See the [official identity-linking guide](https://supabase.com/docs/guides/auth/auth-identity-linking).

Security tracks the active operation (`password` or `delete`) independently from
the global disabled state. Only the active submit shows a spinner; the other form
is not marked busy. Delete-field clearance is checked in a real browser after the
dialog animation settles. Source review of the other loading buttons found Shop
and Transfer keyed by item/club; Login separates verification/resend; PvE, player
management, squad finalization and creation use one visible submit per operation.
No additional concurrent-spinner defect was confirmed in those paths.

Avatar assets and input boundaries are documented in `profile-avatar-assets.md`.

## Interface polish (2026-11-26)

The header Profile shortcut renders the signed-in user's selected avatar. The picker
retains accessible radio names but shows pictures only; saving closes it immediately
and updates the avatar optimistically, rolling back and announcing a failure if the
server rejects the save. Small precompressed avatars load eagerly without transforms.
The email row has no Primary label. Shared scrollbar styles preserve native input,
with transparent tracks and hidden arrow buttons where the browser supports styling.
Scrollbar viewports now use the same custom thumb on Chromium and Firefox; native
scrollbars remain the high-contrast / JavaScript-disabled fallback. See scrollbars.md.

The Credits footer is removed; required music attribution lives in Terms of service.
Desktop guidance explains how to widen the browser or continue on a computer and
provides a clean copy-link action, with a read-only fallback if clipboard access fails.
Hallmark render checks: no Floor failures; gate72 waived for intentionally scrolling
Trophy records with visible art, tabs and footer. Fresh-context finish review: ship,
no substantiated findings. No additional dependency was installed.

Settings now includes an Information tab linking to Privacy, Terms and the creator's
Ko-fi page. Support links share components/shared/SupportLink.tsx, open a new tab
and do not load a widget, iframe or third-party script. Headers (including Transfer)
include the heart link; footers include the text link. Google configuration and a
real-provider verification checklist are in google-account-linking.md.
