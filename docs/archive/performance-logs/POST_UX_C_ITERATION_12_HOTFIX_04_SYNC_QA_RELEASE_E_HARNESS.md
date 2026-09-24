# POST-UX C Iteration 12 HOTFIX 04 — Sync QA RELEASE E Harness

The local QA RELEASE E smoke was stale and still required a specific comment
string for the prior blank-screen regression.

GitHub main already uses structural validation instead:
- react
- react-dom
- react-router
- react-router-dom
- lucide-react
- stable `return 'vendor'`

This hotfix synchronizes only `scripts/qa/smoke-qa-release-e.ps1`.

No runtime changes.
No vite.config changes.
No dependency changes.
Do not run npm install.
