# POST-UX C HOTFIX 11.1 — Smoke parser repair

This patch replaces only:

- `scripts/qa/smoke-post-ux-c-hotfix-11.ps1`

The HOTFIX 11 source changes already applied to `index.html` and `ProductDetailPage.tsx` are not reverted or reapplied.

## Root cause

The original smoke used JavaScript template-literal/backtick text inside PowerShell double-quoted strings. In Windows PowerShell, the backtick is the escape character, so the parser treated the following content incorrectly and produced cascading syntax errors around:

- `credentials:`
- `promise.catch(() => {})`
- `||`
- the final quote/parenthesis

This was a smoke-script parser defect, not evidence that the HOTFIX 11 application failed.

## Validation

```powershell
Unblock-File .\scripts\qa\smoke-post-ux-c-hotfix-11.ps1
.\scripts\qa\smoke-post-ux-c-hotfix-11.ps1
npm run build
```
