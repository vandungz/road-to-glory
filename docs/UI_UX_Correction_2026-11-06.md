# UI/UX correction — 6 November 2026

The user's screenshots demonstrated two regressions: a scrolling login and a
beige media panel touching the PvE divider. Both are corrected in shared source.

## Changes and coverage

| Flow | Correction | Evidence |
| --- | --- | --- |
| Login/register | Short introduction; viewport-sized art; no fixed520px slot, ticker, decorative stats or replay button; submit visible immediately | Five desktop sizes, login/register/expired-link state; document and panel scroll dimensions and control bounds |
| Password recovery | Remove duplicated label; choose new-password form from server-verified user session instead of testing an initially empty password; display correct success text | Anonymous route E2E and render checks for both initial modes; existing Supabase mutation authorization/validation preserved |
| Home | Remove duplicated slogan/discovery captions and misleading fixed16-season claim; concise mode descriptions | Browser capture, navigation suite |
| Quick setup | Remove repeated explanations around three labeled inputs | Browser capture; identity, validation, keyboard, reload and complete-career E2E |
| Classic | Compact heading, count only; six records immediately readable, transparent action-art rail | Six-squad fixture at four desktop widths |
| PvE | Clear eligibility sentence; transparent rail;24px gap after divider; remove server terminology and generic terminal copy | One/two-session and empty fixtures; four desktop widths; tournament copy checked against source |
| Shop | Remove duplicate heading, subtitle and season line;24px modal inset; catalogue scrolls without overlapping footer | Dialog geometry at1024×768 and1440×900, failed-purchase recovery, keyboard close/focus and no-write checks |
| Transfer | `club.prestige` correctly labeled “Danh tiếng”; remove unsupported “an toàn” caption | Source mapping and negotiation callback fixture |
| Recap/retirement | Transparent rails; remove archive implementation jargon; retain records, actions and full-body artwork | Real shared components with season and seven-club fixtures |

## Copy examples

| Before | After |
| --- | --- |
| “Mười ba vòng quay… mười sáu mùa quyết định…” | “Draft11 cầu thủ và theo dõi từng sự nghiệp qua các mùa giải.” |
| “Chọn đội hình chinh chiến” | “Chọn đội hình dự giải” |
| “Guest friendly, chơi ngay” and repeated discovery slogan | Removed |
| “Phần còn lại để wheel viết tiếp câu chuyện.” | “Tạo cầu thủ và quay vòng quay để mô phỏng sự nghiệp.” |
| “Vòng bảng sẽ được tính một lần ở server.” | “Bắt đầu từ vòng bảng để giành suất vào vòng loại trực tiếp.” |
| “Một trận thua không xóa được những khoảnh khắc…” | “Đội hình đã bị loại khỏi giải.” |
| “Độ phù hợp” for club prestige | “Danh tiếng” |
| “Career archive · final record” | Removed; retirement explanation uses plain Vietnamese |
| “Đường dẫn có hiệu lực trong1 giờ.” | Removed; provider-configured expiry is not asserted without evidence |

## Verification

- Full Chromium E2E suite:34 passed, including a complete deterministic guest
  career, reload/restart, desktop gate, keyboard/modals and fixture callbacks.
- After submit-animation, list and shop-layout corrections:16 targeted tests
  passed. Final auth/design confirmation after copy cleanup:10 passed
  (`output/playwright/ux-last-confirm.log`).
- ESLint, TypeScript and production build pass. Recovery initial-state render
  assertions pass through `pnpm check:auth-recovery`.
- Hallmark rendered sweep:0 FAIL,24 WARN,470 WAIVED; remaining legacy warnings/waivers recorded in
  `output/playwright/ux-hallmark-final.log`.
- Independent finish review inspected13 images. Initial incomplete animation
  captures were rejected, root animation problems fixed and screenshots retaken.
  Final review requested removal of one duplicated shop heading; removed and
  recaptured. No remaining visual finding from that review is unresolved.

Screenshots: `output/playwright/ux-review/`. Tests/logs:
`ux-full-e2e.log`, `ux-confirm-final.log`, `ux-lint-final.log`,
`ux-build-final.log`, `ux-hallmark-final.log` under `output/playwright/`.

## Limits

Protected UI uses the actual shared components with isolated fixtures, not a
production account. No persistent career mutation, real purchase, Google OAuth,
recovery email delivery or live password change was performed. No game resolver,
weights, service, database schema or persistent state was changed. Browser
automation runs Chromium; other browser engines were not tested in this pass.

No packages need installing. Rules for future updates are recorded in `design.md`.

## New files in this correction

```text
tests/
├── auth-recovery.test.tsx
├── tsconfig.json
└── e2e/auth-layout.spec.ts
docs/UI_UX_Correction_2026-11-06.md
```

Existing feature components, auth pages, shared CSS, E2E expectations and design
documentation were edited in place. The full diff also contains earlier,
authorized redesign work from this chat; it was preserved.

## Hallmark warning disposition

The rendered sweep scans imported legacy rules as well as the final cascade.
Warnings about the old auth ticker and locked home CTA refer to removed markup.
Base primary-button, panel-border/radius and Quick stripe rules are superseded
by identity layers. Disabled controls are intentionally subdued. State stripes
identify the current player, passed/eliminated groups or transfer feedback.
Repeated application container rules preserve the existing shell. Numeric
heuristics also match nonnumeric empty-state headings. The final rendered views
and independent review, rather than a static zero-warning claim, are the basis
for the visual verdict;24 warnings and470 recorded spacing waivers remain in
the log. The phone-content warnings reflect the explicitly requested desktop-only
policy; mobile users receive the desktop notice. Rejected wage options are disabled.
This pass does not certify a site-wide accessibility conformance audit.
