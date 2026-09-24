# POST-UX C Iteration 12 HOTFIX 09.1 — Lazy PDP Export Cleanup

HOTFIX 09 correctly changed App.tsx and added the Supabase preconnect, but its generic
replace helper treated an empty replacement string as already applied because every
string contains `""`.

As a result, `LazyProductDetailPage` remained in `src/routes/lazy-routes.tsx`, causing
the HOTFIX 09 smoke test to fail.

This patch removes exactly that stale export using explicit CRLF/LF/no-newline handling.

No dependencies.
No Vite changes.
No API changes.
Do not run npm install.
