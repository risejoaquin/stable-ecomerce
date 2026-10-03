# Operational incident escalation

Escalate persistent `/api/health` HTTP 503 responses, repeated production 5xx errors, or suspected sensitive-data exposure in logs. HTTP 200 with `database: "connected"` confirms the existing Supabase database probe succeeded; HTTP 503 indicates unavailable or unconfigured database access. This probe does not assess payment or email providers.

1. Notify the **Technical / Release Authority (@risejoaquin)** for incident coordination and decisions about remediation or release actions.
2. For database connectivity incidents, involve the **Database Engineer**. For runtime, deployment or logging incidents, involve **DevOps / SRE**. These responsibility roles follow the engineering incident-response and CCP-30 execution documentation; no additional contact channel is assumed.
3. Escalate unresolved or security-sensitive findings to the Technical / Release Authority before changing production configuration or permissions.

Collect the UTC timestamp, affected environment, deployed commit SHA, health HTTP status and sanitized response, request IDs, impact and duration, and redacted error logs with stack frames. Never include Authorization headers, cookies, passwords, tokens, connection strings, payment-card details or customer PII in incident evidence. Do not paste raw error messages that may contain those values.

Reference: `docs/engineering/operations/INCIDENT_RESPONSE.md`.
