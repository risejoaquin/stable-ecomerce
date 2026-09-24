# POST-UX C HOTFIX 20.2 — QA Contract Repair

HOTFIX 20.1 successfully applied the below-the-fold deferral, but the original
HOTFIX 20 smoke still failed because it asserted one exact whitespace-sensitive
JSX closing sequence.

HOTFIX 20.2 changes only the QA script.

It validates semantic source ordering:
1. `secondaryContentReady` gate.
2. Similar products inside the gate.
3. Reviews inside the gate.
4. EditorialFooter inside the gate.
5. MobileEditorialNav after the deferred region.
6. CartDrawer after MobileEditorialNav.

No production source code, dependencies, Vite configuration, server code, CSS,
CSP, SEO, or image pipeline are modified.
