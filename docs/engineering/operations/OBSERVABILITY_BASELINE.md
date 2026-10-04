# Observability, Structured Logging & Operational Metrics Baseline

**Document ID**: `OBS-BASE-001`
**Classification**: `DERIVED ENGINEERING DESIGN`
**Authority**: Mandatory Observability Standard for Client 01
**Target Release**: Client 01 v1.0
**Parent Epic**: `CCP-30` / `CCP-44`

---

## 1. Purpose & System Overview

The Observability Baseline establishes runtime telemetry, structured logging, performance metrics, and alerting to ensure complete visibility into the health and reliability of the storefront and Web POS operations.

The system combines:
1. **Pino / Pino-HTTP**: High-performance structured JSON logging with correlation IDs.
2. **Sentry**: Distributed application error tracking and exception grouping for server and client.
3. **Railway Runtime Telemetry**: Host CPU, memory utilization, container uptime, and process heartbeats.
4. **Health & Readiness Endpoints**: Automated health probe (`/api/health`) and dependency probe (`/api/readiness`).

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Every incoming HTTP request must be tagged with a unique request correlation ID (`x-request-id`).
   - Absolute prohibition against logging secrets, full card numbers (PAN), CVVs, passwords, or bearer tokens.
   - Sentry error monitoring must capture all unhandled 5xx exceptions with request correlation context.

2. **FROZEN CONTRACT**:
   - `DR-ERR-001`: Error log records must correlate with the emitted error envelope (`requestId`, `code`).
   - `DR-IDEM-001`: Repeated idempotency hits or conflicts must emit structured audit events.
   - `DR-PAY-001`: Payment lifecycle events must be logged with payment ID, channel, and status (never raw financial credentials).

3. **DERIVED ENGINEERING DESIGN**:
   - Canonical Pino JSON log schema definition.
   - Core operational metric definitions (SLOs/SLIs) and alert trigger thresholds.
   - Heartbeat polling interval (30s) and health failure tolerances.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Pino pretty-printing formatting in non-production local development.
   - Client-side Sentry sample rates for trace transactions.

---

## 3. Structured Logging Schema

All server-side application logs must be emitted as single-line JSON strings to `stdout` via Pino. Log aggregation systems (Railway logs, Datadog, or CloudWatch) parse these fields directly.

### 3.1 Canonical JSON Log Format

```json
{
  "level": 30,
  "time": 1789684601858,
  "pid": 25,
  "hostname": "74e2f1ebd1c9",
  "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "method": "POST",
  "url": "/api/pos/sales",
  "statusCode": 201,
  "responseTime": 142.6,
  "userId": "usr_admin_uuid_123",
  "storeId": "store_selfcare_uuid_456",
  "orderId": "ord_20261005_uuid_789",
  "paymentChannel": "cash",
  "msg": "POS sale completed successfully",
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Requested quantity exceeds available stock",
    "stack": "..."
  }
}
```

### 3.2 Schema Field Definitions

| Field Name | Type | Description | Mandatory | Example |
| :--- | :--- | :--- | :--- | :--- |
| `time` | integer | Unix epoch millisecond timestamp | Yes | `1789684601858` |
| `level` | integer | Pino numeric log level (10=trace, 20=debug, 30=info, 40=warn, 50=error, 60=fatal) | Yes | `30` |
| `requestId` | string | Unique UUID assigned by correlation middleware (`x-request-id`) | Yes | `"c7a1...8e"` |
| `method` | string | HTTP Verb | Conditional | `"POST"` |
| `url` | string | Normalized request path | Conditional | `"/api/pos/sales"` |
| `statusCode` | integer | HTTP status code returned to client | Conditional | `201` |
| `responseTime` | float | Elapsed handler processing time in milliseconds | Conditional | `142.6` |
| `userId` | string | Authenticated user ID (if available from JWT) | No | `"usr_123"` |
| `storeId` | string | Store context ID | No | `"store_456"` |
| `orderId` | string | Related order ID for transactional events | No | `"ord_789"` |
| `msg` | string | Human-readable log narrative | Yes | `"POS sale completed"` |
| `error` | object | Serialized error details adhering to `DR-ERR-001` | On Error | See above |

### 3.3 Strict Data Sanitization & Redaction Rules

> [!CAUTION]
> Under PCI DSS 4.0.1 and repository security rules, the logger must automatically mask or strip sensitive keys before serializing to stdout:
> - `password`, `password_hash`, `new_password` -> `[REDACTED]`
> - `authorization`, `token`, `jwt` -> `[REDACTED]`
> - `cardNumber`, `pan`, `cvv`, `card_number` -> `[REDACTED]`
> - `stripeSecretKey`, `webhookSecret`, `supabaseServiceRoleKey` -> `[REDACTED]`

---

## 4. Healthcheck & Readiness Endpoints

The application exposes two dedicated operational probe routes defined in `server.ts`:

### 4.1 Shallow Liveness Probe: `GET /api/health`
- **Purpose**: High-frequency container liveness check for Railway orchestrator and load balancers.
- **Overhead**: Minimal (< 2ms); does not query database.
- **Response Format**:
  ```json
  {
    "status": "ok",
    "service": "selfcare-sinners-web",
    "environment": "production",
    "version": "c7bd9e79e3da1d1b8cc3a8d10251e9405a3bd640",
    "uptimeSeconds": 14285,
    "timestamp": "2026-10-05T12:00:00.000Z",
    "requestId": "61d9a207-eef4-47c3-a3d8-5ecb8be3b8bf"
  }
  ```

### 4.2 Deep Readiness Probe: `GET /api/readiness`
- **Purpose**: Pre-flight verification and continuous dependency health audit.
- **Downstream Checks**:
  1. **Environment Variables**: Confirms all 11 required production secrets are configured.
  2. **Supabase Database**: Executes `SELECT id FROM stores LIMIT 1;` measuring query latency.
  3. **Stripe Client**: Confirms Stripe SDK initialized and webhook secret present.
  4. **Email Gateway**: Confirms Resend client initialized and `EMAIL_FROM` configured.
- **HTTP Status**: Returns `200 OK` when all dependencies pass; returns `503 Service Unavailable` if degraded.

---

## 5. Core Operational Metrics (SLIs / SLOs)

| Service Area | Metric / SLI | Target Objective (SLO) | Alert Trigger Threshold |
| :--- | :--- | :--- | :--- |
| **POS Sales API** | Transaction Latency (p95) | < 800 ms | p95 > 1500 ms over 5 min |
| **Storefront PDP** | Server Bootstrap Latency | < 300 ms | p95 > 600 ms over 5 min |
| **General Availability** | System Uptime | 99.9% availability | 3 consecutive failed healthchecks (90s) |
| **Payment Reliability** | Payment Failure Rate | < 2% of total attempts | Failure rate > 5% over 10 min |
| **Database Pool** | Query Execution Latency | p95 < 50 ms | Query latency > 250 ms over 5 min |
| **HTTP Error Rate** | 5xx Server Errors | < 0.1% of total requests | 5xx rate > 1.0% over 5 min |

---

## 6. Heartbeat Monitoring & Alerting Configuration

```
[Railway Service: stable-ecomerce]
         │
         ├── Polls GET /api/health every 30s
         │     ├── 200 OK -> Healthy
         │     └── Failed x3 -> Container Restart & Alert
         │
         ├── Pino Logger emits JSON stdout
         │     └── Streamed to Log Aggregator (Railway / Sentry)
         │
         └── Sentry Node / React
               ├── Error rate spikes (> 10/min) -> PagerDuty / Telegram Sev-1 Alert
               └── Unhandled rejections -> Instant Sev-2 Notification
```

### Alert Escalation Pathways
- **Liveness Failure**: Container restarted automatically by Railway; if container fails to restart within 3 minutes, escalates to On-Call Engineer.
- **Stripe Failure Alert**: Triggered if 3 consecutive Stripe webhook ingestion failures occur; escalates immediately to Payments On-Call.
- **Database Latency Alert**: Triggered if Supabase probe latency exceeds 500ms; alerts Database Administrator.
