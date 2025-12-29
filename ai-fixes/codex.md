# Housarr Code Review (quality, lean code, load speed)

## Findings (ordered by severity)
- High: All route chunks are preloaded after mount, which largely defeats code-splitting and adds immediate network/CPU cost on first load, especially on mobile or slow networks. Location: `frontend/src/components/Layout.tsx:67`. Impact: longer time-to-interactive and heavier data usage for users who only visit a subset of pages. Recommendation: prefetch only likely next routes (e.g., on hover or idle per nav item) or remove the global preload and rely on route-level lazy loading.
- Medium: The Inter font is loaded twice (CSS @import plus HTML <link>), causing duplicate font fetches and extra render-blocking. Locations: `frontend/src/index.css:1`, `frontend/index.html:8`. Impact: unnecessary network requests and slower first paint. Recommendation: keep only the HTML <link> with preconnect, or self-host the font and remove the CSS import.
- Medium: Theme store logs to console on every theme apply and mode change. Locations: `frontend/src/stores/themeStore.ts:36`, `frontend/src/stores/themeStore.ts:43`, `frontend/src/stores/themeStore.ts:51`. Impact: noisy console output and minor runtime overhead in production. Recommendation: remove the logs or guard them behind a dev-only check.
- Medium: An extraneous zero-byte `nul` file exists in the repo root. Location: `nul`. Impact: it breaks tools like `rg` (observed) and adds repo noise. Recommendation: delete the file and add a guard in `.gitignore` if needed.
- Medium: Generated cache file is present in version control working tree, which is environment-specific and can go stale. Location: `backend/bootstrap/cache/config.php`. Impact: inconsistent behavior across environments and extra repo noise. Recommendation: remove it from the repo and add `backend/bootstrap/cache/*.php` to `.gitignore` (generate at deploy time).
- Low: Each route is wrapped in its own `Suspense` even though the entire `Routes` tree already sits in a `Suspense` boundary. Location: `frontend/src/App.tsx:71`. Impact: extra component depth and duplicated fallback logic for no benefit. Recommendation: keep a single `Suspense` boundary or use route-level fallbacks only where they differ.
- Low: Manual search emits verbose `info` and `debug` logs for each DuckDuckGo request (including HTML samples). Locations: `backend/app/Services/ManualSearchService.php:182`, `backend/app/Services/ManualSearchService.php:291`. Impact: increased log volume and disk I/O under load. Recommendation: reduce to debug-only logging (or guard with `app.debug`) and avoid logging HTML samples in production.
- Low: Items list endpoint uses a hard limit default of 200 with no pagination option, which can lead to heavy responses for larger households. Location: `backend/app/Http/Controllers/Api/ItemController.php:60`. Impact: slower list loads and heavier memory use on both API and client. Recommendation: add pagination (page/limit) and return total counts to support incremental loading.
- Low: Empty middleware file adds confusion and dead code. Location: `backend/app/Http/Middleware/AddCacheHeaders.php`. Impact: maintenance noise with no functional value. Recommendation: implement it or delete it from the codebase.

## Open questions / assumptions
- Is the intent to always preload every route for perceived speed, even on mobile? If not, we can tailor prefetch behavior to user navigation patterns.
- Should manual-search logging stay verbose in production, or can it be gated to debug environments only?

## Testing gaps
- No automated frontend or backend tests are present in the repo; adding at least smoke tests for critical flows (auth, items list, dashboard) would reduce regression risk.
