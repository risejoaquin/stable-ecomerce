# POST-UX C HOTFIX 11.2 — Lighthouse cleanup EPERM harness repair

## Problem
On Windows, Lighthouse can complete and write a valid JSON report, then `chrome-launcher` can fail while deleting its temporary profile with `EPERM` in `Launcher.destroyTmp`.

The previous harness treated every non-zero Lighthouse exit as a failed run, so valid reports were discarded.

## Fix
`measure-post-ux-c-local.ps1` now accepts a non-zero exit **only** when all of the following are true:

- stderr/output contains `EPERM` or `Permission denied`;
- the stack identifies `Launcher.destroyTmp`, `Launcher.kill`, or `rmSync`;
- the JSON output file exists and parses;
- `runtimeError` is absent;
- `finalUrl` resolves to the same host/path requested;
- performance, accessibility, best-practices, and SEO scores exist;
- LCP has a numeric value.

All other non-zero exits remain failures.

This is QA tooling only. It does not change storefront, server, bundles, product image pipeline, or HOTFIX 11 behavior.
