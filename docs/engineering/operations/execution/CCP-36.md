# Execution Pack: CCP-36 — Load Testing, Concurrency Benchmarks & Bottleneck Audit

**Ticket ID**: `CCP-36`
**Classification**: `DERIVED ENGINEERING DESIGN`
**Role / Owner Profile**: Performance Engineer / SRE / Senior Backend Engineer
**Target Delivery**: 04 Oct 2026 (Hardening Day)
**Parent Epic**: `CCP-40` (Engineering Foundation & Integration)

---

## 1. Objective, Context & Why

### Objective
Design and execute rigorous concurrency load testing, row-level inventory locking benchmarks, and latency audits on the Staging environment to prove that the Client 01 platform eliminates race conditions, prevents stock overselling, and maintains sub-800ms p95 POS transaction latencies under peak retail concurrency.

### Why This Matters
During high-traffic events (promotions or peak in-store hours), simultaneous checkout requests can cause database deadlocks or race conditions where inventory counts drop below zero. Verifying that PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) serialize inventory mutations deterministically is essential to maintaining business and financial integrity.

---

## 2. Decision Classifications

1. **FROZEN REQUIREMENT**:
   - Overselling inventory is strictly prohibited: stock count must never drop below 0.
   - High concurrent requests competing for limited stock must serialize safely without deadlocking.
   - All load and concurrency stress testing must be executed against Staging; NEVER against production.

2. **FROZEN CONTRACT**:
   - `DR-INV-001`: `SellableUnit` row-level locks must govern transactional inventory allocation.
   - `DR-ERR-001`: Requests failing due to depleted stock must receive HTTP 409 with code `INSUFFICIENT_STOCK`.

3. **DERIVED ENGINEERING DESIGN**:
   - Automated concurrency test harness (`scripts/qa/load/concurrency-oversell-test.mjs`).
   - Throughput targets: 10 concurrent POS registers operating sustained at 2 sales/sec.
   - P95 latency ceiling: < 800ms for POS sales; < 300ms for storefront PDP bootstrap.

4. **ENGINEER IMPLEMENTATION CHOICE**:
   - Load generation tool: Autocannon / k6 / custom Node.js Promise-pool harness.

---

## 3. Scope Boundaries

- **IN SCOPE**:
  - Stress testing inventory locking on `sellable_units` under 50 simultaneous parallel requests.
  - Simulating 10 concurrent POS registers submitting sales transactions over a 5-minute sustained window.
  - Storefront catalog read benchmarks under 50 virtual users (VUs).
  - PostgreSQL connection pool saturation and query latency monitoring.
- **EXPLICITLY OUT OF SCOPE**:
  - Load testing against live Stripe production endpoints (all gateway tests use Stripe Test mode or mocks).
  - Distributed multi-region DDoS simulations.

---

## 4. Dependencies & Preconditions

- **Preceding Dependencies**: `CCP-35` (Staging Deployment), `CCP-14` (Web POS Sales API), `CCP-12` (Inventory & SKU Schema).
- **Downstream Dependents**: `CCP-37` (Release Gate Sign-off), `CCP-38` (Production Release).
- **Preconditions**:
  - Staging environment online and verified healthy.
  - Test SKU `SKU-LOAD-LIMITED-05` seeded with exactly 5 units of stock.
  - Test SKU `SKU-LOAD-HIGH-1000` seeded with 1,000 units of stock.

---

## 5. Step-by-Step Implementation & Benchmark Guide

```
[Staging Verified Clean]
           │
           ▼
[Benchmark 1: Inventory Oversell Concurrency Stress]
 50 concurrent requests hit SKU with stock = 5
           │
           ├── Assert: Exactly 5 succeed (200/201)
           ├── Assert: Exactly 45 receive 409 INSUFFICIENT_STOCK
           ├── Assert: Final DB stock = exactly 0 (never negative)
           └── Assert: Zero database deadlocks (error code 40P01 = 0)
           │
           ▼
[Benchmark 2: POS Multi-Register Sustained Load]
 10 virtual cashiers submit sales over 5 minutes (target: 600 total sales)
           │
           ├── Measure: p50, p95, p99 transaction response time
           └── Assert: p95 latency < 800ms; error rate < 0.1%
           │
           ▼
[Benchmark 3: Storefront PDP Read Throughput]
 50 concurrent VUs query product pages
           │
           └── Assert: p95 latency < 300ms; server bootstrap cache hit rate > 90%
           │
           ▼
[Benchmark 4: Database Connection Pool Monitoring]
 Verify Supabase connection pool remains stable without connection timeouts
```

### Execution Commands:

1. **Execute Inventory Oversell Concurrency Harness**:
   ```bash
   node scripts/qa/load/concurrency-oversell-test.mjs \
     --baseUrl https://staging.selfcaresinners.com \
     --sku SKU-LOAD-LIMITED-05 \
     --concurrency 50
   ```

2. **Execute Sustained POS Register Throughput Benchmark**:
   ```bash
   npx autocannon -c 10 -d 300 -m POST \
     -H "Authorization: Bearer $STAGING_ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -b '{"clientRequestId":"dynamic","storeId":"test-store","items":[{"sellableUnitId":"su_high_1000","quantity":1}],"payment":{"channel":"cash","amountTenderedCents":5000}}' \
     https://staging.selfcaresinners.com/api/pos/sales
   ```

3. **Execute Storefront PDP Read Benchmark**:
   ```bash
   npx autocannon -c 50 -d 60 https://staging.selfcaresinners.com/products/test-product
   ```

---

## 6. Verification Commands & Expected Pass/Fail Thresholds

| Benchmark ID | Scenario | Pass Threshold | Fail Threshold |
| :--- | :--- | :--- | :--- |
| **BM-01: Oversell** | 50 concurrent requests for 5 stock | Exactly 5 succeed; 45 receive 409; final stock = 0 | Any stock < 0; > 5 succeed; deadlocks |
| **BM-02: POS Latency** | 10 POS registers sustained | p95 < 800ms; p99 < 1500ms; 0 unhandled 5xx | p95 > 1200ms or 5xx rate > 0.5% |
| **BM-03: PDP Latency** | 50 concurrent read VUs | p95 < 300ms; throughput > 150 req/sec | p95 > 600ms; connection drops |
| **BM-04: DB Pool** | Active connection check | Connections <= 80% pool limit; 0 timeout errors | "Connection pool exhausted" errors |

---

## 7. Required Verifiable Evidence

1. **Concurrency Oversell Test Log**:
   Output demonstrating 5 successful sales and 45 HTTP 409 responses, concluding with a database stock verification of 0.
2. **Autocannon Latency Histogram**:
   Persisted report at `artifacts/load/pos-throughput-benchmark.json` showing latency percentiles (p50, p95, p99).
3. **Pino Server Performance Metrics**:
   Log extraction showing average handler execution times during the test window.

---

## 8. Definition of Done (DoD) & Escalation

### Definition of Done:
- [ ] Concurrency oversell test passes without a single negative inventory event.
- [ ] Database locks proven to serialize safely under high concurrency.
- [ ] POS sales API maintains p95 latency < 800ms under 10 active registers.
- [ ] Zero database deadlock errors (`40P01`) logged in PostgreSQL.
- [ ] Performance benchmark report archived for Release Gate Sign-off (`CCP-37`).

### Escalation Pathway:
- If inventory drops below 0 or database deadlocks occur, escalate immediately to Rogelio (Backend Lead) as a **Sev-1 Release Blocker**.
- If p95 latency exceeds 1200ms, profile database query execution plans (`EXPLAIN ANALYZE`) with the DBRE.
