# Execution Pack: CCP-15 — POS Search & Catalog Read Endpoints

## 1. Responsibility
- **Lead Domain**: Backend API Engineering
- **Assignee Lead**: Julian (Backend Lead)
- **Secondary Reviewer**: Rogelio (Frontend Lead)

## 2. Objective
Implement optimized, fast-read catalog search and lookup endpoints (`GET /api/pos/catalog/search` and `GET /api/pos/units/:id`) designed specifically for POS cashier autocompletion and barcode scanner lookup.

## 3. Why
Cashiers in a physical retail setting require sub-100ms item lookups by text keyword, SKU, or barcode scan. The standard public storefront `/api/products` endpoint returns nested, heavier representations not tailored for rapid cashier register operations.

## 4. Owner Profile
Node.js / Express Backend Engineer with expertise in database indexing, query optimization, and REST API caching.

## 5. Preconditions
- CCP-12 (Inventory & SKU Schema Migrations) completed.
- `docs/engineering/client-01/09_POS_API_CONTRACT.md` Section 3.2 reviewed and approved.

## 6. Dependencies
- **Preceding Tickets**: CCP-12.
- **Downstream Blocking**: Blocks CCP-22 (Web POS Terminal UI).

## 7. Authoritative Contracts
- **DR-AUTH-001 (Authorization Model)**
- **DR-ERR-001 (Standard Error Envelope)**
- `docs/engineering/client-01/09_POS_API_CONTRACT.md`

## 8. Scope IN
- Implementation of `GET /api/pos/catalog/search` with query param `q` and pagination `limit`.
- Implementation of `GET /api/pos/units/:id` for direct unit retrieval.
- SQL query joining `sellable_units` with parent `products` to return flat, cashier-optimized DTOs.
- Integration with `requirePosOperator` authorization middleware.
- Data projection whitelisting preventing leakage of internal cost prices.

## 9. Scope OUT
- Web POS frontend search bar UI (handled in CCP-22).
- Public storefront product search (maintained in existing routes).
- Full-text search engine migration (Elastic/MeiliSearch is out of scope).

## 10. Required Behavior
1. Enforce `requirePosOperator` (`owner` or `admin` only).
2. If `q` matches an exact barcode or SKU, return that unit as the top result.
3. Case-insensitive matching across `sku`, `barcode`, and parent `products.name`.
4. Return current atomic `stock` count and resolved price (`price_override` or `products.price`).
5. Exclude archived or discontinued units (`status = 'active'` only).

## 11. Inputs
- HTTP GET query string: `q` (string, 1-100 chars), `limit` (int, default 20, max 50).

## 12. Outputs
- HTTP 200 OK: JSON object `{ results: [...], totalMatches: int }`.
- Line items include: `sellableUnitId`, `productId`, `productName`, `unitTitle`, `sku`, `barcode`, `price`, `availableStock`, `thumbnailUrl`.

## 13. Allowed Implementation Freedom
- Utilization of PostgreSQL `ILIKE` or `pg_trgm` similarity index for fuzzy matching.
- In-memory response caching headers (e.g. `Cache-Control: private, max-age=5`).

## 14. Forbidden Changes
- DO NOT expose internal `cost_price` to the response.
- DO NOT make endpoints accessible to unauthenticated callers or regular customers.
- DO NOT modify the public `/api/products` contract.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/controllers/pos-catalog-controller.ts`
  - `src/services/pos-catalog-service.ts`
  - `src/routes/pos-routes.ts`
  - `tests/api/pos-catalog-search.test.ts`
- **Strictly Prohibited**:
  - Frontend components under `src/pages/*`.

## 16. Data Impact
- Read-only operations. Leverages existing indexes on `sellable_units(sku)`, `sellable_units(barcode)`, and `products(name)`.

## 17. API Impact
- Exposes `GET /api/pos/catalog/search` and `GET /api/pos/units/:id`.

## 18. Security
- Staff-only access (`requirePosOperator`).
- Projection whitelisting: `cost_price` and supplier IDs explicitly omitted.
- Parameterized search query prevents SQL injection.

## 19. Concurrency & Idempotency
- Read-only idempotent GET endpoints.

## 20. Migration Considerations
- Operates seamlessly on backfilled `sellable_units` data from CCP-12.

## 21. Edge Cases
- Query string containing special characters (e.g. `%`, `_`, `'`) must be safely escaped.
- Search with 0 matches returns HTTP 200 with empty array `{ results: [], totalMatches: 0 }`.

## 22. Observability
- Log search query execution duration to monitor sub-100ms performance target.

## 23. Acceptance Criteria
- [ ] Unauthorized requests return `401 AUTH_REQUIRED`.
- [ ] Non-staff roles return `403 FORBIDDEN`.
- [ ] Barcode scan matches exact unit with `100%` accuracy.
- [ ] Sub-100ms response time on staging catalog dataset.
- [ ] `cost_price` is absent from all JSON responses.

## 24. Test Strategy
- Vitest/Supertest test suite testing keyword search, barcode search, empty results, and role authorization.

## 25. Staging Validation
- Perform manual search queries via curl on staging dataset; verify response time and result ranking.

## 26. Evidence Requirements
- Test suite execution output (`npm test tests/api/pos-catalog-search.test.ts`).
- Response payload snapshot verifying field projections.

## 27. Definition of Done
- Endpoints functional and covered by contract tests.
- Reviewed by Frontend Lead (Rogelio) for UI payload compatibility.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: Rogelio (wire search bar in CCP-22).
