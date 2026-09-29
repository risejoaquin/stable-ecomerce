# Execution Pack: CCP-26 — Admin Dashboard — Multi-Channel Sales Metrics & Customer Overview Adaptation

## 1. Responsibility
- **Lead Domain**: Frontend Engineering / Admin Command Center
- **Assignee Lead**: Julian (Frontend / Admin Lead)
- **Secondary Reviewer**: Rogelio (Backend / Database Lead)

## 2. Objective
Adapt the existing Admin Dashboard (`AdminDashboard.tsx`) and Customer Management view (`AdminCustomersPage.tsx`) so that revenue metric cards and recent order tables clearly display omnichannel sales breakdowns by channel (`web_storefront` vs `pos_register`), indicate payment channel tags on recent orders, and list registered customer profiles with accurate lifetime order counts and spend figures performantly.

## 3. Why
Fulfills **DR-PAY-001** and omnichannel reporting requirements. With the launch of Client 01 Web POS, physical retail sales coexist with online ecommerce. Business owners and store operators need instant visibility into daily revenue split between online card purchases, in-store cash transactions, and in-store card terminal payments, allowing accurate end-of-day register reconciliation and retail performance tracking.

## 4. Owner Profile
Senior React / Frontend Engineer with expertise in dashboard data visualization, metric KPI card design, performant data aggregation, and responsive administrative layouts.

## 5. Preconditions
- `AdminDashboard.tsx` (177 lines) and `AdminCustomersPage.tsx` operational in repository.
- CCP-13 (Canonical Orders & Payment Ledger Schema with `channel` column) completed.
- Staff authentication context verifying admin access.

## 6. Dependencies
- **Preceding Tickets**: CCP-13 (Canonical Orders Schema).
- **Downstream Blocking**: Blocks CCP-35 (Feature Freeze Enforcement) and CCP-37 (Client UAT).

## 7. Authoritative Contracts
- **DR-PAY-001 (Payment Ledger & Multi-Channel Tender)**
- `docs/engineering/client-01/04_ORDER_CONTRACT.md`

## 8. Scope IN
- Adapting KPI cards in `src/pages/admin/AdminDashboard.tsx`:
  - Daily Total Revenue card displaying total, with sub-metrics: `Online ($...)` and `POS In-Store ($...)`.
  - Cash Tendered subtotal display to aid cash drawer reconciliation.
- Adapting Recent Orders table in `AdminDashboard.tsx`:
  - Adding a "Canal" tag column/badge (`Online` blue badge vs `POS` emerald badge).
  - Adding tender indicator (e.g. `Tarjeta`, `Efectivo`, `Terminal POS`).
- Enhancing `src/pages/admin/AdminCustomersPage.tsx`:
  - Listing registered customer accounts with aggregated lifetime order count and lifetime spend.
- Query optimization: ensuring dashboard statistics queries execute in under 300ms without blocking UI rendering.
- Component and unit tests in `tests/frontend/admin-dashboard-multichannel.test.tsx`.

## 9. Scope OUT
- Rebuilding `AdminDashboard.tsx` from scratch.
- Complex third-party BI / analytics export engine (Client 02 scope).
- Live WebSocket telemetry streams (polling / react-query standard for Client 01).

## 10. Required Behavior
1. Opening `/admin` loads the dashboard metrics card row.
2. The primary revenue card renders Total Sales, accompanied by two clear sub-counters:
   - "Online: $X,XXX.XX (N pedidos)"
   - "POS Tienda: $X,XXX.XX (N ventas)"
3. The recent orders table shows the latest 10 transactions across all channels with channel badges.
4. Clicking on a POS order opens the order details modal displaying cashier name and tender type.
5. In `AdminCustomersPage.tsx`, each customer row displays their email, name, join date, total completed orders count, and total lifetime spend.
6. If no orders exist in a channel for the day, display `$0.00` cleanly without errors.

## 11. Inputs
- Aggregated order statistics payload from `GET /api/admin/metrics/daily` or Supabase views.
- Orders list payload from `GET /api/admin/orders`.
- Customers list payload from `GET /api/admin/customers`.

## 12. Outputs
- Rendered multi-channel KPI metrics and order cards.
- Customer directory table.

## 13. Allowed Implementation Freedom
- Card visual layout (stacked vs side-by-side sub-metrics).
- Lucide icon selection for channel badges (e.g. `Globe` for online, `Store` for POS).

## 14. Forbidden Changes
- DO NOT rewrite existing chart components or table pagination logic from scratch.
- DO NOT hardcode channel names; use canonical enums `'web_storefront'` and `'pos_register'`.
- DO NOT perform expensive unindexed joins on the client side.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/pages/admin/AdminDashboard.tsx`
  - `src/pages/admin/AdminCustomersPage.tsx`
  - `src/components/admin/ChannelBadge.tsx`
  - `tests/frontend/admin-dashboard-multichannel.test.tsx`
- **Strictly Prohibited**:
  - Express server routes or database DDL (Rogelio domain).

## 16. Data Impact
- Read-only aggregation queries; zero database mutations.

## 17. API Impact
- Consumes `GET /api/admin/metrics/daily` and `GET /api/admin/customers`.

## 18. Security
- Protected by `requireAdmin` route guards; only accessible to staff.

## 19. Concurrency & Idempotency
- Safe idempotent read queries.

## 20. Migration Considerations
- Historical orders without explicit `channel` field default to `'web_storefront'`.

## 21. Edge Cases
- All sales in a day are POS cash: online displays `$0.00`, POS displays full total.
- Customer placed orders both online and at POS: customer record aggregates transactions from both channels correctly.

## 22. Observability
- Emits dashboard view performance telemetry: duration of query load in milliseconds.

## 23. Acceptance Criteria
- [ ] AdminDashboard displays daily total revenue with clear subtotal breakdown by Online vs POS.
- [ ] Recent orders list displays channel badge (`web_storefront` / `pos_register`, formatted for UI) for each transaction.
- [ ] Customer directory lists registered accounts with lifetime order count.
- [ ] Queries execute performantly without UI lag (< 500ms).
- [ ] Component tests in `tests/frontend/admin-dashboard-multichannel.test.tsx` pass 100%.

## 24. Test Strategy
- Vitest + React Testing Library tests verifying channel breakdown calculation, badge rendering, and zero-state handling.

## 25. Staging Validation
- Open Admin Dashboard on Railway staging, verify that both online orders and test POS orders are reflected in distinct metric sub-totals.

## 26. Evidence Requirements
- Component test execution transcript showing 100% assertions green.
- Screenshot of Admin Dashboard displaying multi-channel breakdown cards.

## 27. Definition of Done
- Multi-channel dashboard metrics integrated and verified.
- Code reviewed and approved by Backend Lead (Rogelio) and Technical Authority (Joaquin).
- Ready for inclusion in Feature Freeze candidate (CCP-35).

## 28. Escalation & Next Consumers
- **Escalate To**: Technical & Release Authority (@risejoaquin).
- **Next Consumer**: QA Lead (CCP-35 Feature Freeze & CCP-37 Client UAT).
