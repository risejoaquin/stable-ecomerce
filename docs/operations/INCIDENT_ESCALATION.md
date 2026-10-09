# Operational incident escalation

`/api/health` is the shallow liveness probe: HTTP 200 means the HTTP process is responding; it does not query Supabase or assess providers. `/api/readiness` is the existing dependency/configuration probe: HTTP 200 requires all existing environment, Supabase, Stripe and email checks to pass; otherwise HTTP 503. Stripe/email checks verify configuration, not live provider connectivity. The read-only Supabase probe has a 2000 ms deadline and abort signal; failure, missing configuration or timeout makes readiness HTTP 503 with `checks.supabase.ok: false`. Database diagnostics stay in server logs.

Escalate persistent `/api/readiness` HTTP 503 responses, unavailable liveness, repeated production 5xx errors, or suspected sensitive-data exposure in logs.

1. Notify the **Technical / Release Authority (@risejoaquin)** for incident coordination and decisions about remediation or release actions.
2. For database connectivity incidents, involve the **Database Engineer**. For runtime, deployment or logging incidents, involve **DevOps / SRE**. These responsibility roles follow the engineering incident-response and CCP-30 execution documentation; no additional contact channel is assumed.
3. Escalate unresolved or security-sensitive findings to the Technical / Release Authority before changing production configuration or permissions.

Collect the UTC timestamp, affected environment, deployed commit SHA, health HTTP status and sanitized response, request IDs, impact and duration, and redacted error logs with stack frames. Never include Authorization headers, cookies, passwords, tokens, connection strings, payment-card details or customer PII in incident evidence. Do not paste raw error messages that may contain those values.

Reference: `docs/engineering/operations/INCIDENT_RESPONSE.md`.
