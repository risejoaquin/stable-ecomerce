# POST-UX C HOTFIX 13.1 — Font loader anchor repair

## Cause
HOTFIX 13 successfully removed the blocking Archivo Black/Inter Google Fonts `@import`, then failed because its `index.html` insertion anchor was stricter than the current document markup.

## Repair
- Preserve the already-removed CSS import when HOTFIX 13 partially ran.
- Insert the non-blocking font loader after the existing `fonts.gstatic.com` preconnect using a whitespace/CRLF-tolerant regex.
- Fall back to insertion before `<title>` if the preconnect markup changes.
- Keep the patch idempotent.
- Keep Archivo Black and Inter declarations unchanged.
- Preserve HOTFIX 10, 11 and 12 protected behavior.

## Validation
```powershell
.\scripts\qa\apply-post-ux-c-hotfix-13-1.ps1
.\scripts\qa\smoke-post-ux-c-hotfix-13-1.ps1
```

If PASS, continue with `npm run build` and the established regression suite.
