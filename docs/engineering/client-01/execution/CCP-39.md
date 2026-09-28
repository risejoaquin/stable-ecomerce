# Execution Pack: CCP-39 — SellableUnit Domain Foundation

## 1. Responsibility
- **Lead Domain**: Data Architecture & Backend
- **Assignee Lead**: Julian (Backend / Data Lead)
- **Secondary Reviewer**: Rogelio (Frontend Lead)

## 2. Objective
Establish the foundational TypeScript domain interfaces, data access transfer objects (DTOs), and core repository accessors for `SellableUnit` across the backend codebase, decoupling the catalog product entity from atomic transactional inventory units.

## 3. Why
Currently, the codebase couples product catalog presentation (`products.stock` and variants JSONB) with transactional inventory authority. To support omnichannel inventory shared between Web Storefront and Web POS without race conditions or overselling, we must introduce `SellableUnit` as an independent, typed domain entity.

## 4. Owner Profile
Senior TypeScript / Backend Engineer with expertise in domain-driven design, SQL schema modeling, and strict type systems.

## 5. Preconditions
- Contract Freeze achieved under CCP-44.
- `docs/engineering/client-01/03_INVENTORY_CONTRACT.md` (DR-INV-001) reviewed and frozen.

## 6. Dependencies
- **Preceding Tickets**: CCP-41, CCP-42, CCP-44 (Contract Freeze).
- **Downstream Blocking**: Blocks CCP-12 (Database Migrations) and CCP-14 (POS Sales Backend API).

## 7. Authoritative Contracts
- **DR-INV-001 (Inventory Authority)**: `SellableUnit` is the exclusive transactional inventory authority.
- `docs/engineering/client-01/03_INVENTORY_CONTRACT.md`
- `docs/engineering/client-01/02_DOMAIN_MODEL.md`

## 8. Scope IN
- Definition of `SellableUnit` and `SellableUnitWithProduct` TypeScript types and interfaces.
- Creation of `src/types/inventory.ts` containing domain definitions and Zod schemas.
- Data access repository methods in `src/services/inventory-service.ts` for resolving units by ID, SKU, and barcode.
- Unit tests verifying SKU formatting and mapping between products and units.

## 9. Scope OUT
- Physical database DDL execution (handled in CCP-12).
- POS API endpoints implementation (handled in CCP-14/15).
- Frontend UI components (handled in CCP-22/25).

## 10. Required Behavior
1. Export complete domain model interfaces for `SellableUnit`.
2. Provide mapper function `mapProductToDefaultSellableUnit` for products without variants.
3. Provide mapper function `mapVariantToSellableUnit` for products with variant options.
4. Implement input validation schemas using Zod for creating and updating sellable units.

## 11. Inputs
- Product entity records with optional `variants` JSONB structures.
- SKU search query strings and barcode scanner input strings.

## 12. Outputs
- Fully typed TypeScript domain entities representing `SellableUnit`.
- Clean validation schemas ready for ingestion by Express route handlers.

## 13. Allowed Implementation Freedom
- Internal naming of helper transformation functions in `src/utils/sku-helpers.ts`.
- Structure and fixture layout of unit tests under `tests/unit/inventory/`.

## 14. Forbidden Changes
- DO NOT modify existing `products` database columns.
- DO NOT alter public storefront product response shapes (violates AUDIT-01A).
- DO NOT introduce multi-location warehouse fields.

## 15. Repository Boundaries
- **Permitted Additions/Modifications**:
  - `src/types/inventory.ts`
  - `src/services/inventory-service.ts`
  - `src/utils/sku-helpers.ts`
  - `tests/unit/inventory/sellable-unit.test.ts`
- **Strictly Prohibited**:
  - `src/routes/*`, `src/pages/*`, `server.ts`

## 16. Data Impact
- Prepares domain models for the `sellable_units` database table. No direct DDL migration in this ticket.

## 17. API Impact
- Internal TypeScript service interface only. No external HTTP API exposure.

## 18. Security
- Enforces strict input validation on SKU and barcode formats to prevent injection attacks.
- Prohibits serializing `costPrice` to public consumers.

## 19. Concurrency & Idempotency
- N/A for type definitions. Access patterns defined here will be utilized by atomic locking functions in CCP-12.

## 20. Migration Considerations
- Interfaces must support optional/nullable `priceOverride` and `costPrice` to handle legacy products during phased backfill.

## 21. Edge Cases
- Products with null or empty variant arrays must gracefully map to a single default unit.
- Products with special characters in slugs must generate valid, sanitized default SKUs.

## 22. Observability
- Include debug-level logging in repository accessors when resolving sellable units.

## 23. Acceptance Criteria
- [ ] `src/types/inventory.ts` created and exports `SellableUnit` and `SellableUnitInput` schemas.
- [ ] Zod schema rejects SKUs containing whitespace or invalid characters.
- [ ] Unit tests achieve 100% code coverage on mapper functions.
- [ ] `npm run typecheck` passes with zero errors.

## 24. Test Strategy
- Vitest unit tests covering valid/invalid SKU formats, standalone product mapping, and variant array extraction.

## 25. Staging Validation
- Automated unit test execution during CI build pipeline.

## 26. Evidence Requirements
- Passing Vitest execution output (`npm run test:unit tests/unit/inventory/sellable-unit.test.ts`).
- `git diff --stat` showing isolated additions under permitted boundaries.

## 27. Definition of Done
- Types and validation schemas fully reviewed by Rogelio (Frontend Lead).
- Zero TypeScript diagnostics.
- Branch merged into local integration stream.

## 28. Escalation & Next Consumers
- **Escalate To**: Architecture Lead (ChatGPT Web).
- **Next Consumer**: Julian (proceed to CCP-12 for DDL migration).
