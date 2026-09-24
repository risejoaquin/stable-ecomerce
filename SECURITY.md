# Security Policy & Responsible Disclosure

## Scope & Supported Versions

This security policy applies directly to the production branch and active deployment of the platform:

| Target Environment | Production URL | Supported Branch | Status |
| :--- | :--- | :--- | :--- |
| Production Storefront | `https://selfcaresinners.com` | `main` | Active Security Support |
| Local Development | `http://localhost:3000` | Current Feature Branches | Active Development |

Historical feature branches, archived proof-of-concept scripts, and superseded release tags do not receive security backports.

---

## Reporting a Vulnerability

The engineering team welcomes responsible vulnerability disclosures from developers and security researchers.

### Private Disclosure Process
If you identify a potential security vulnerability, credential exposure, or authorization bypass:

1. **Do NOT disclose the issue publicly** through GitHub Issues, public discussions, or social media.
2. Use GitHub Private Vulnerability Reporting if enabled for this repository.
3. If GitHub Private Vulnerability Reporting is not enabled or unavailable, coordinate disclosure directly with the designated repository maintainers via approved private communication channels.

### What to Include
To help us triage and remediate the issue effectively, please include:
- A clear description of the vulnerability, including affected endpoints, components, or files.
- Factual step-by-step reproduction instructions or a minimal proof-of-concept.
- The potential security impact (e.g., data exposure, privilege escalation, denial of service).
- Any proposed remediation or code modifications.

### Team Expectations
We operate as an agile, 3-person engineering team. We commit to:
- Provide **best-effort acknowledgement** of private vulnerability reports without a guaranteed turnaround timeframe.
- Validate the vulnerability and coordinate remediation across scheduled sprint intervals.
- Ensure fixes are deployed to production before details are made public.
- Credit researchers who adhere to responsible disclosure principles.

---

## Active Security Architecture & Safeguards

The following safeguards represent **verified current** operational controls in the codebase today:

1. **Database Row Level Security (RLS) [VERIFIED_CURRENT for configured tables]**:
   - Managed PostgreSQL on Supabase Cloud enforces RLS policies across configured core tables. Direct mutations from client applications are restricted without appropriate authentication or service role context. Comprehensive audit across 100% of production tables remains an ongoing verification item.

2. **Public API Data Minimization (AUDIT-01A) [VERIFIED_CURRENT]**:
   - Public customer-facing endpoints (`/api/products`, `/api/products/:id`) strictly whitelist public product attributes. Internal administrative attributes, cost structures, and warehouse metadata are quarantined from public responses.

3. **Stripe Webhook Cryptographic Verification [VERIFIED_CURRENT]**:
   - Incoming `/api/stripe/webhook` requests are cryptographically validated against `STRIPE_WEBHOOK_SECRET` using raw request buffers.

4. **HTTP Header Hardening & Transport Security [VERIFIED_CURRENT]**:
   - Helmet middleware enforces strict HTTP security headers: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and baseline Content Security Policies.

5. **Automated Secret Scanning [VERIFIED_CURRENT]**:
   - Automated secret scanning (`.\scripts\qa\security\scan-local-secrets.ps1`) executes as a mandatory gate in CI and local QA test suites.

---

## Planned Security Enhancements

The following security controls are tracked in the delivery backlog and are **not yet active** in production:

1. **Resend Webhook Cryptographic Verification [PLANNED]**:
   - Implementation of HMAC signature verification for incoming Resend email event webhooks.
2. **Storage & Upload Authorization [PLANNED]**:
   - Explicit storage bucket authorization policies for media uploads.
3. **CSP Inline Script Elimination (ADR-009 / AUDIT-01G) [PLANNED]**:
   - Static extraction of inline discovery scripts from `index.html` to eliminate `'unsafe-inline'` from CSP.
