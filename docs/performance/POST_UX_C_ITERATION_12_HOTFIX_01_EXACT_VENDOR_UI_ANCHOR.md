# POST-UX C Iteration 12 HOTFIX 01 — Exact vendor-ui Anchor

The original Iteration 12 patcher failed because its expected anchor did not
match the current `vite.config.ts`.

Current validated structure keeps:
- React / React DOM / React Router / lucide-react in `vendor`
- TanStack in `vendor-query`
- Recharts + Redux graph in `vendor-charts`
- Supabase / Stripe in `vendor-commerce`
- Sentry in `vendor-observability`
- motion / Radix / react-hot-toast in `vendor-ui`

This hotfix only extends the existing `vendor-ui` condition with:
- aria-hidden
- react-remove-scroll
- react-remove-scroll-bar
- react-style-singleton
- use-callback-ref
- use-sidecar

No dependency changes. Do not run `npm install`.
