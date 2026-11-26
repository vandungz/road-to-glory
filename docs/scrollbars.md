# Shared scrollbars

CSS-only native scrollbars cannot guarantee matching geometry across browser/OS
implementations. overlayscrollbars 2.17.1 (MIT, pinned in package/lockfile) renders
a shared overlay thumb while retaining native wheel, touch, keyboard and scroll
positions. It is bundled locally, with no CDN, background requests or polling.

components/ui/ScrollArea.tsx keeps the existing element/tag as the viewport. It
initializes in its own effect after hydration and destroys the instance on unmount.
Do not initialize newly streamed React DOM from a global MutationObserver: that
changes server-rendered children before hydration and causes mismatches. The root
ScrollbarRuntime handles the document only. Shared ModalBody covers dialog bodies;
app main areas, filters, squad/archive, wheel, shop, transfer, PvE and Quick lists
use ScrollArea. Keep an existing tag with as="aside"/"main"/"section" when needed.

Theme tokens in app/styles/foundation/scrollbars.css set an 8px footprint and a
rounded 4px visible thumb with transparent track. Hover/focus changes color rather
than width. No native arrow controls are rendered. Forced-colors uses the native
accessible fallback; JavaScript-disabled pages retain native scrolling.

    pnpm exec playwright install firefox
    pnpm exec playwright test --config playwright.scrollbars.config.ts

Chromium and Firefox checks cover native-control hiding, track transparency,
rounded thumb, unchanged client width/x position on hover, wheel, keyboard Home/End,
drag and document scrolling. Screenshots are saved under .hallmark/shots. Vendor
Brave/Edge/Zen builds have not been individually certified, and legacy Internet
Explorer is outside Next.js 15's supported browser baseline.
