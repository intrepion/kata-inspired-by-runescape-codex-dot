# Validation

Local validation, 2026-11-06, on macOS with Node 24 and Chromium through Playwright 1.63.0. Final syntax, all 40 unit/provenance tests, production build and the full HTTP browser gameplay suite passed.

- `npm run check`: syntax validation of model, renderer and UI.
- `npm test`: deterministic mechanics regressions plus strict screenshot manifest/provenance integrity checks.
- `npm run build`: production Vite build, with locally bundled Three.js.
- `npm run test:browser`: production HTTP server at `http://127.0.0.1` on an ephemeral port. Real public-control play covers quest acceptance, movement, copper/tin gathering, smelting, smithing, forge quest completion, banking, shopping, equipment, fishing, cooking, woodcutting/firemaking, melee combat, loot, bones, skill panels, pause/help, persistence/reload, world click, reset cancellation and 390px mobile layout.
- `npm run capture:arcade`: real HTTP gameplay screenshots after gathering and completing a production quest. No injected game state or modified screenshot pixels. Two reviewed screenshots, original PNGs and provenance JSON are shipped.
- Desktop 1440px and mobile 390px screenshots visually inspected. No horizontal mobile overflow or uncaught browser errors in the test.

No gameplay was tested using a direct local file or a `file://` URL.

## Limits

Unit tests establish selected deterministic invariants, not exact RuneScape parity. Browser tests do not exhaust every quest combination, every level, every browser/GPU or every mobile device. They are a real gameplay smoke/regression suite, not a formal exhaustive proof. Browser QA fixes the initial Date seed while normal timers run. It uses naturally earned food during combat and bounded waits that tolerate slow rendering; action timings can still vary. Shader/font rendering differs across platforms.

Screenshots are local gameplay captures tied to the recorded source commit and served-input hashes. They are not CI screenshots and are not claimed pixel-equivalent to deployment. GitHub Actions repeats syntax, unit, build and browser tests for its published commit. Deployment status must be checked for that exact commit before announcing completion.
