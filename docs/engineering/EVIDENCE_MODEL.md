# Engineering Evidence Model & Verification Lifecycle

**Document ID**: `GOV-ENG-005`  
**Classification**: Authoritative Engineering Governance  
**Status**: ACTIVE / ENFORCED  
**Applies To**: All human engineers, autonomous agents, QA leads, and release authorities  
**Authority**: Technical & Release Authority (`@risejoaquin`)  

---

## 1. Principle & Purpose

In the Client Commerce Platform engineering culture, **claims without evidence are non-existent**. 

> **"Code existing is not proof. A script existing is not proof. A build passing does not prove runtime behavior. Local passing does not prove production."**  
> *(Reference: `AGENTS.md` - Evidence Standard)*

Every defect remediation, architectural implementation, quality gate passage, and production release must produce verifiable, deterministic, and auditable proof-of-work.

---

## 2. The 7-Step Evidence Cycle

Whenever a defect is investigated, a bug is fixed, or an engineering verification is conducted, the engineer must execute and document the full **7-Step Evidence Cycle**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ THE 7-STEP EVIDENCE CYCLE                                              │
├────────────────────────────────────────────────────────────────────────┤
│ 1. EXPECTED        → Precise expected behavior based on contracts      │
│ 2. TEST            → Deterministic, reproducible command or harness    │
│ 3. OBSERVED        → Raw captured terminal output, stack trace, exit   │
│ 4. CAUSE           → Root cause analysis to line number & state logic  │
│ 5. SAFE REMEDY     → Minimal, surgical code fix (smallest delta)       │
│ 6. RETEST          → Re-running exact test + full regression suite     │
│ 7. EVIDENCE        → Persisted proof artifact, git diff, clean exit 0  │
└────────────────────────────────────────────────────────────────────────┘
```

### Detailed Step-by-Step Specifications

#### Step 1: EXPECTED
- **Definition**: The authoritative baseline behavior defined by frozen requirements, specifications, or contracts.
- **Requirement**: State what should happen under nominal and edge-case conditions.
- **Example**: *"Calling `POST /api/pos/sale` with valid items must atomically decrement `products.stock_quantity`, create an `orders` record with status `completed`, and return HTTP 200 with receipt DTO."*

#### Step 2: TEST
- **Definition**: The exact, automated, repeatable command or test file used to trigger and observe the behavior.
- **Requirement**: Provide the full command line with working directory and arguments.
- **Example**: `npm test -- tests/pos/sale-atomic-decrement.test.ts` or `.\scripts\qa\validate-fast.ps1`.

#### Step 3: OBSERVED
- **Definition**: The unvarnished, raw runtime output produced by the test before remediation.
- **Requirement**: Never summarize away critical error messages, stack traces, or exit codes. Include exact timestamps, line numbers, and error payloads.
- **Example**:
  ```text
  FAIL tests/pos/sale-atomic-decrement.test.ts > atomic stock decrement on checkout
  AssertionError: expected 5 to equal 4
    at tests/pos/sale-atomic-decrement.test.ts:42:25
  Exit Code: 1
  ```

#### Step 4: CAUSE
- **Definition**: Deep root cause analysis isolating the exact technical mechanism causing the discrepancy.
- **Requirement**: Identify the file path, line number, asynchronous race condition, missing transaction boundary, or logic inversion.
- **Example**: *"In `src/server/pos/sale.ts:78`, stock was read via `SELECT` and written via separate `UPDATE` outside a PostgreSQL transaction block, allowing race conditions under concurrent requests."*

#### Step 5: SAFE REMEDIATION
- **Definition**: The minimal, targeted code modification addressing the root cause without collateral damage.
- **Requirement**: Adhere to the "Smallest Correct Change" rule. Do not perform opportunistic refactoring, rewrite unrelated functions, or change global styling in the same commit.
- **Example**: *"Replaced two-step read/update with Supabase RPC `decrement_stock_atomic` executing `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1 RETURNING stock_quantity;`."*

#### Step 6: RETEST
- **Definition**: Re-execution of the original failing test harness PLUS the entire regression suite.
- **Requirement**: Run both targeted test and broad gates to confirm the fix succeeded and introduced zero regressions:
  ```powershell
  # Targeted test re-run
  npm test -- tests/pos/sale-atomic-decrement.test.ts
  # Broad quality gate
  npm run qa:fast
  ```

#### Step 7: EVIDENCE
- **Definition**: Final verifiable record demonstrating that the system now satisfies the expected condition.
- **Requirement**: Capture:
  1. Full command executed.
  2. Clean exit code (Exit Code 0).
  3. Git status showing modified files (`git status --short`).
  4. Git diff stats (`git diff --stat`).
  5. Saved test log or artifact path under `artifacts/` (if long-running or release-related).

---

## 3. Evidence Artifact Storage & Naming Conventions

### 3.1 Artifact Storage Location
All persistent evidence files must be saved under the repository artifact tree:
- **Active Sprint Artifacts**: `artifacts/<sprint-or-epic-id>/` (e.g., `artifacts/ccp-pos-sprint/`)
- **Security Audit Evidence**: `artifacts/audit-01/`
- **Release Qualification Artifacts**: `artifacts/release-gates/`

### 3.2 Prohibited Artifact Locations
- **NEVER** save evidence files in `node_modules/`, `/tmp`, or root directory.
- **NEVER** commit temporary, local-only scratch scripts to Git.

### 3.3 Zero Deletion Policy
- Evidence is permanent. Historical test runs, audit logs, and release certificates must never be overwritten, modified, or deleted.
- If a subsequent test supersedes an earlier test, record it as a new dated artifact (e.g., `audit-01a-verification-2026-09-28.log`) rather than mutating historical records.

---

## 4. Evidence Sanitization & Security Standard

Evidence logs and screenshots frequently capture runtime outputs. Implementers must guarantee:

1. **NO Secrets or Credentials**:
   - Webhook signing secrets (Stripe, Resend) must be masked (e.g. `whsec_...[REDACTED]`).
   - Database connection strings with passwords must never appear in test output.
   - JWT tokens or bearer headers must be truncated (e.g., `Bearer eyJ...[REDACTED]`).
2. **NO Cardholder or Payment Data (PCI DSS Readiness)**:
   - Primary Account Numbers (PAN) and CVV codes must NEVER appear in logs, test suites, or evidence artifacts.
3. **No Unsanitized Customer PII**:
   - Customer email addresses and physical billing addresses should use synthetic test fixtures (e.g., `qa-test-customer@example.com`).

---

## 5. Evidence Requirements for Autonomous Agents

Autonomous agents (Codex, Antigravity, LLM pair programmers) must adhere to these evidence protocols upon completing any instruction:

1. **Exact Commands Executed**: Detail the exact shell or CLI invocation.
2. **Exit Codes**: Provide the numeric exit status of each command.
3. **PASS / FAIL Verdict**: Explicit boolean outcome for each step.
4. **Git State Verification**:
   - `git status --short`
   - `git diff --stat`
5. **Exact Error Context**: If an operation fails, provide the raw stdout/stderr block without conversational paraphrasing or truncation of stack traces.
