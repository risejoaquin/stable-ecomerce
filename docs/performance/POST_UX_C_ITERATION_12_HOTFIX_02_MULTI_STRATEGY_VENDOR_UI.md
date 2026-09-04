# POST-UX C Iteration 12 HOTFIX 02 — Multi-strategy vendor-ui patch

The user's local vite.config.ts does not match the exact GitHub-main anchor.

This patcher avoids exact multiline matching and uses three safe strategies:

1. Extend an existing react-hot-toast vendor-ui condition.
2. Otherwise extend an existing @radix-ui condition.
3. Otherwise create vendor-ui immediately before the default node_modules
   `return 'vendor'`.

It adds only:
- aria-hidden
- react-remove-scroll
- react-remove-scroll-bar
- react-style-singleton
- use-callback-ref
- use-sidecar

No dependency changes. Do not run npm install.
