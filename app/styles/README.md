# Football Life styles

The stylesheet tree is grouped by responsibility, while `app/globals.css`
keeps the original cascade order. The order is part of the styling contract:
later files contain responsive or final-surface overrides for earlier layers.

## Naming convention

- `football-*` is the project namespace for component and feature classes.
- BEM modifiers use `--`, for example `football-modal-panel--inverse`.
- BEM elements use `__`, for example `football-dashboard__actions`.
- State classes such as `is-active`, `is-complete`, and `has-error` remain
  generic because they describe state rather than ownership.

## Where to look

- `foundation/`: design tokens, shared primitives, and animations.
- `features/`: feature surfaces that map to product areas.
- `layout/`: viewport and responsive layout rules.
- `overrides/`: intentionally late rules that resolve feature-specific cascade
  conflicts.

When adding a selector, prefer the closest feature file and keep the
`football-` namespace. Do not move a rule between files without checking its
position in the import order.
