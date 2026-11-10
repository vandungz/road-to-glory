# Transfer filters revision

## Delivered

- Removed the overview header's redundant bottom rule, the final club row's
  bottom rule and the decorative rule beneath the negotiation back button.
- Removed the willingness checkbox from both transfer presentations. The market
  generator always uses the existing available-for-offers behavior. Request
  schemas accept historical boolean fields but normalize them to true, including
  the authoritative market context. Fee, wage and negotiation formulas remain
  the existing services; the availability modifier is now always enabled.
- Introduced shared `FilterSelect` and `SearchField` components. They use the
  locked typography, palette and focus tokens without new dependencies.
- League choices support local, case/diacritic-insensitive search; popup height
  is capped at360px and options scroll inside it. Menus use the native popover
  top layer to avoid clipping inside scroll regions or modal containers.
- League, prestige and fee controls now use the same component. Fee labels are
  short; explanations appear on a separate line in the menu.
- Club search has one focus boundary, a clear action, an80-character limit
  matching the server contract, empty/loading/error states and a retry action.
- Filters reset pagination. Pagination now uses the server's totalCount rather
  than the length of the current eight-row page. Tabs/counts reflect that total.
- Compact desktop spacing preserves the useful list height after adding counts
  and pagination. Only result lists scroll.

## Reuse

```tsx
<FilterSelect
  label="Lọc theo giải đấu"
  value={league}
  options={leagues.map((item) => ({
    value: item.id,
    label: item.name,
    description: `Hạng ${item.tier}`,
  }))}
  searchable
  onChange={setLeague}
/>
```

Options accept value, label, optional description and optional search keywords.
The trigger opens with click, Enter or Arrow keys; option navigation uses Arrow
keys and Home/End. Enter selects; Escape closes and returns focus without closing
an enclosing modal. Clicking outside dismisses the menu. Scrolling the source
list or resizing the window closes a detached menu. Use searchable for long
lists, and descriptions instead of squeezing explanations into trigger labels.
Styles are imported directly from the root layout to reach protected routes.

## Verification

-9/9 targeted E2E cases pass: the four workspace regressions, three filter cases
  and authenticated Chromium/Firefox cases at1440×900,1280×720 and1024×768.
- Checks include search focus, clear/empty/reset states, keyboard selection,
  fee quote changes, complete menu labels, bounds, independent scroll, real long
  league menus, real pagination and zero captured browser errors.
- Transfer economy/authority checks pass, including deterministic equality for
  historical willingness=false/true requests and normalization of false to true.
- Production build, TypeScript and ESLint pass.
- Hallmark rendered sweep:0 FAIL,23 WARN,470 WAIVED. Existing warnings remain
  recorded. Independent finish review:ship, no open visual findings.

Evidence: `output/playwright/filter-*.log` and
`filter-{search,leagues,fee,offers}-final-*.png`; E2E artifacts are in
`output/playwright/results`. The authenticated suite requires the private
QA fixture via RTG_AUTH_FIXTURE_PATH and skips without it. No user's browser
was controlled and no account credentials or existing player records changed.

Validation is local. No deployment or real transfer acceptance/purchase was
performed. The existing negotiation callback is covered by the shared UI test.

New files:

```text
components/ui/FilterSelect.tsx
components/ui/SearchField.tsx
app/styles/foundation/filters.css
tests/e2e/transfer-filters.spec.ts
docs/Transfer_Filters_Revision.md
```

No install command is needed.
