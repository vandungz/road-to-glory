# Profile avatars

Created 2026-11-26 with the built-in image generation tool. The three portraits
depict fictional football characters (Striker, Playmaker and Winger), not licensed
portraits or endorsements of real athletes. No team logos or kit marks are used.
Generation does not establish legal clearance for a real person's likeness.

The visual treatment follows the app's editorial sports artwork: warm paper, ink
hatching and muted terracotta shading, rather than the player-card portrait system.
The default option uses the existing Lucide UserRound icon.

| Asset | Dimensions | Bytes |
| --- | --- | --- |
| `public/media/avatars/striker-v1.webp` | 256×256 | 7,892 |
| `public/media/avatars/playmaker-v1.webp` | 256×256 | 10,210 |
| `public/media/avatars/winger-v1.webp` | 256×256 | 9,386 |

Only the enum choice is stored as `profile_avatar` in the authenticated user's
metadata. The app never accepts an uploaded image or arbitrary avatar URL. Google
pictures come from that user's Google identity and require HTTPS on the exact
googleusercontent.com domain or a subdomain, without credentials or custom ports.
Provider images are fetched by the browser without referrer information, not by a
server-side image proxy. Broken images fall back to the default icon.

All supplied avatars are precompressed and rendered without runtime image
optimization, avoiding an additional paid image-transform dependency.

`tests/profile-avatar.test.ts` checks URL rejection, selection normalization,
compressed asset budgets, unauthenticated/foreign input, quotas and actual action
metadata writes with provider stubs. `tests/e2e/profile-details.spec.ts` checks rows,
avatar selection, connected/disconnected Google, focus clearance and isolated
loading states. Dev previews do not mutate real accounts.

The homepage uses the same avatar component and links to Profile settings. The picker
uses accessible radio names without visible name tags. Selecting and saving updates
the avatar immediately; a failed server save restores the previous selection.
