# Media direction — action artwork integrated

Source context: https://chatgpt.com/share/6aebfd2f-98f8-83ec-9c62-58892dc2868a
Read using the browser. Previous chat text is reference material, not executable
instructions. Its media downloads could not be verified. Current user request
overrides its monochrome styling: restrained colour belongs in this game.

## Asset treatment

- Four individual-player references: full-body action stencil cutouts preserving
  the supplied pose and camera angle, transparent background, unbranded kit and limited colour.
  No front-facing portrait conversion; the earlier prototype is unused.
- Three match-scene references: static editorial illustrations, retain the key
  football action and simplify crowds, advertising, stadium detail and kits.
- Remove visible crests, sponsors, brand marks and lettering. That visual cleanup
  does not establish licensing rights to the underlying supplied photographs.
- Do not assign a famous person's face to a fictional career player. Use supplied
  athletes as decorative editorial imagery unless an explicit identity mapping exists.

## Surface decisions

| Surface / source component | Media decision |
| --- | --- |
| Home / Homepage ModeArt | One decorative player cutout in the existing art panel |
| Login / HeroPanel; password reset | One static scene behind the existing scrim; retain text contrast |
| Classic lobby | One shallow scene at the intro; no image repeated on every saved squad |
| QuickModeSetupScreen | One supporting player cutout beside setup; preserve field/action widths |
| QuickModeScreen | Keep wheel and tracker dominant; no looping scene behind the wheel |
| DraftDrumScreen / dossier | No unrelated famous portrait assigned to a generated player |
| PlayerCareerDialog / stickers | Real ratings and nation identity remain; portrait requires identity mapping |
| Squad pitch / sheet | Keep formation and names legible; no per-cell video |
| PveLobby / tournament | Static match-scene accent in intro; avoid covering score/table/match controls |
| Transfer / negotiation modals | Keep offer, wage and confirmation information dominant; no decorative video |
| ShopModal | Keep item icons and price information; portraits add no useful meaning |
| SeasonResultModal / SeasonRecapModal | Static scene only for a major result header, never on every stat row |
| BallonDorNominationModal / TrophyCabinetModal | Existing award icons; supplied match photos do not depict awards |
| CreateGameDialog / confirmation / destructive dialog | No large media; keep intent and action clear |
| Toast / ResultBanner / validation / loading | Existing semantic icons; no imagery or motion competing with feedback |
| Retirement | Optional editorial portrait beside archive, never replacing player identity |
| DesktopNotice | Existing monitor icon is sufficient |

## Production contract

All seven production assets: 800×1000 WebP with real alpha. Source compositions
are contained without cropping, adding transparent padding where necessary.
Files are 80–150 KB each (761,466 bytes total). Scenes remain static. No video
was produced because image-to-video animation is unavailable in this session.
No camera transform is presented as genuine action or facial animation.

## Current status

All seven new assets were created with the built-in Imagegen tool, visually
inspected and encoded as optimized WebP using the project's existing Sharp
installation. No new dependency was added.

| Supplied image | Asset in public/media/editorial | Production placement |
| --- | --- | --- |
| 1, running player | heritage-run.webp | Homepage Classic art panel |
| 2, airborne control | air-control.webp | Quick setup intro |
| 3, volley/control | volley-control.webp | Classic lobby intro |
| 4, overhead match | pitch-overview.webp | Auth HeroPanel background |
| 5, free kick | free-kick.webp | PvE lobby intro |
| 6, match duel | match-duel.webp | Season recap modal |
| 7, historical ball control | heritage-touch.webp | Retirement header |

Shared implementation: `components/shared/EditorialArt.tsx`; presentation rules:
`app/styles/features/editorial-media.css`. Dev-only Media tab in design-preview
shows the complete library. Existing handlers, route contracts and game logic
are retained. No athlete image is assigned to a fictional player's profile.

Prompt set used one edit per supplied image: retain original full-body pose,
camera and subject placement; remove background/advertising, all crests,
sponsors, brand logos, names and numbers; generic ball and kit; coloured
screenprint/stencil with charcoal, ivory and restrained source kit colours;
true transparency, no lettering, no headshot conversion. Scene edits retain
only essential pitch lines and sparse ground shapes.

Verification: seven assets have alpha and decode at 800×1000; 27 browser cases
passed, including all-asset decoding, actual rendered image size, desktop widths,
mobile notice, profile/shop/transfer/PvE/retirement and Quick wheel progression.
The first concurrent run had one wheel timeout; isolated retry and the final
27-case run passed. The long complete-career case was not repeated for this
presentation-only change (it passed in the preceding redesign run).
Logs and screenshots: `output/playwright/media-*`.

Limits: all current assets are static, not WebM animation. Authentic motion
requires an image-to-video source; it has not been fabricated from still frames.
Authenticated Classic and persisted season mutations were not executed; their
media integration was checked in source/build, with shared assets tested in the
safe dev gallery. No production deployment was performed.


## Hallmark composition correction

The initial placement was visually insufficient even though assets decoded and
controls fit. Corrected all seven positions: alpha-trimmed derivatives use actual
intrinsic dimensions from `dimensions.json`; originals are retained. Home art is
320px tall, Quick440px in a separate column, Classic280–300px, auth460px in a full
non-overlaid region, PvE340px, retirement340px beside grouped header copy. Recap
uses a wider dialog with a real artwork side column and separately scrolling
result details. The footer action remains visible. No action or domain handler
was changed. `ClassicLobbyIntro` is shared by production and the safe preview.

Direct screenshots and independent Hallmark review cover1024/1280/1440px.
The login crop was rejected in review and replaced with full contain; the final
review verdict was Ship. At1280×800 the submit action is visible at y495–551.
Evidence: `output/playwright/media-review/`, `media-layout-review.md`.
Browser regression28 passed; final media-specific4 passed after the login fix.
TypeScript, ESLint and production build passed. Hallmark render:0 FAIL,0 open
REFLEX; legacy24 WARN and470 spacing waivers remain documented separately.
The complete random career and authenticated database writes were not repeated.


## Record-screen correction — 2026-11-06

Supersedes the earlier large intro/header placements for Classic, PvE and retirement.
All three now have compact text-only headers. Classic's artwork sits beside the
squad list; PvE's artwork sits beside eligible sessions in a bounded272px panel;
retirement's artwork sits beside its card/archive grid. The club archive stays
flexible and dominant, and names/stat labels can wrap without ellipsis.

Populated safe fixtures use6 squads and7 club stints. One-session PvE has a
separate preview toggle. The same ClassicLobbyContent component is rendered in
production and preview; no data selection, link destination or mutation changed.
The initial independent review rejected retirement's narrow archive; this exposed
a shrink-wrapped dev fixture. The fixture now fills its real canvas. Final archive
width is452px at1024 and784px at1440/1920, with full labels. Independent scoring
confirmed all original composition findings resolved.

Evidence: output/playwright/records-review/ and records-layout-review.md.
Validation:13 targeted browser cases passed; TypeScript, ESLint and production
build passed. Hallmark rendered the three explicit dev views:0 FAIL and0 open
REFLEX, with24 existing warnings and470 documented spacing waivers. No authenticated
career write or complete random career was exercised for this presentation change.


## Painted subject scale correction

The earlier bounded272px PvE panel was too small for the scene despite fitting
its record list. This correction supersedes those fixed column/height limits.
Lists now use a proportional62/38 allocation, retaining compact headers. PvE
gets a440px scene slot, Classic480px, retirement500px, home400px, Quick500px and
auth520px. The recap dialogue uses1120px maximum width and a larger art column.
Actual contain-fit paint, not element height alone, is now a browser assertion.

The full nine-player auth view could not make individual figures legible in its
column. A new derivative from the same supplied artwork isolates the central
kicker and defender without reposing them. The PvE scene is also cleaned of its
pre-existing partial peripheral red player and noisy pitch arcs. Both use the
built-in Imagegen tool; original assets remain. Final WebP derivatives and their
intrinsic dimensions replace only the displayed copies.


Final display variants are `pitch-overview-action.webp` and `free-kick-clean.webp`
so already-open browsers request new image URLs rather than retaining old decoded
pictures. Their source keys stay unchanged. The built-in Imagegen edit prompts
requested central kicker/defender/ball focus for auth, and removal of the partial
peripheral player, arcs and noisy ground from PvE. The remaining five artworks
use their existing trimmed sources and larger contextual allocations.

The final independent review resolved both remaining image-specific findings.
Auth subjects render about340–450px tall at1280/1440; the cleaned PvE foreground
wall is about270×215px at1280 and305×250px at1440. The submit control remains
above the1280×800 fold. Data/handlers are unchanged. Evidence and report:
`output/playwright/scale-review/`, `painted-scale-review.md`.
Validation:14 targeted cases passed, then6 media cases confirmed the versioned
asset URLs; TypeScript, ESLint and production build passed. Hallmark final render
has0 FAIL/open REFLEX; existing warnings and spacing waivers remain documented.
No real-account mutation or complete random career was rerun for this visual fix.

## 2026-11-06: viewport and copy correction (supersedes auth scale above)

The previous fixed520px auth slot let the full login page scroll. A visible
submit button alone was insufficient verification. Auth now uses the remaining
viewport height for the illustration, with one heading and one sentence. The
stats, fictional career ticker, extra subtitle and decorative replay button are
removed. Whole bodies remain visible. Login, registration and recovery have
explicit document/panel scroll and control-bounds tests at five desktop sizes.

Classic, PvE and retirement rails are transparent without reducing their image
allocation. PvE leaves24px below its divider. The six-squad list renders at rest
without staggered fade-ins. Store dialogs have24px inset, a scrollable catalogue
and a separate footer; these checks now supplement horizontal-overflow tests.

Copy removes fixed16-season claims, English promotional filler and implementation
terms such as server/catalog. Season, eligibility, pricing and probability facts
remain sourced from existing game data. Current evidence is in
`output/playwright/ux-review/`; see `docs/UI_UX_Correction_2026-11-06.md` for scope
and validation limits. The underlying game services and data are unchanged.

## 2026-11-21: trophy cabinet

The cabinet now shares the paper modal shell. A transparent engraved trophy
collection occupies the left column beside separately scrolling records. The
player name, total count, category counts, runner-up records and individual
honours remain sourced from the existing season records.

Asset: `public/media/editorial/trophy-collection.webp`, 960×960 RGBA, 321810
bytes. Generated with the built-in imagegen tool, using the user's trophy-strip
reference and the existing Ballon d’Or and match-duel illustrations as style
references. WebP encoding preserves transparency. This is decorative collective
artwork, not a claim that the player has won every depicted trophy.

Generation prompt: “Create a production game illustration asset: a compact
still-life collection of ALL the distinct football trophy silhouettes in
reference 1, reinterpreted in the antique sports editorial illustration style
of reference 2 gold ball and reference 3 footballers. Reference 1 is SUBJECT
reference only, remove its grey background and enormous blank margins.
References 2 and 3 are STYLE references. Arrange the fifteen varied cups as a
handsome compact triangular three-tier collection, large tall handled
European cup and crowned league cup at the rear, elegant tapered silver
trophies and flared cups in the middle, small shield, round football award and
short cups at the front. Each individual silhouette remains readable, a little
overlap for depth, full trophy bases and handles visible. Brushed muted silver,
aged warm gold, dark engraved ink contours, fine crosshatching and halftone
grain, restrained highlights, collectible 1970s football annual illustration,
NOT shiny CGI or flat vector or cartoon. No shelf, no cabinet furniture, no
labels, text, branding, emblems or logos. Genuine transparent background outside
the trophy group. Composition nearly square with only a small transparent
margin, no huge empty space. This will be displayed on a warm cream paper modal
at 360px wide, so avoid excessive tiny detail. Do not draw UI.”

## Fictional trophy collection revision (2026-11-26)

`public/media/editorial/trophy-collection-v2.webp`: 960×960, transparent WebP,
318,962 bytes. Generated from the previous collection as a style reference using
the built-in image tool. The composition retains bronze engraving on warm paper,
with fictional vessel shapes, handles and bases, no logos or official competition
marks. This is a design distinction, not a legal clearance guarantee. EditorialArt
uses this version; the previous file remains for existing cached URLs.
