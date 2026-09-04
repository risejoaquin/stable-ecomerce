# POST-UX C — Lighthouse / Core Web Vitals

## Objective

Measure production performance before changing runtime behavior. POST-UX C must be driven by evidence, not by visual assumptions.

## Baseline protocol

Capture at least three PageSpeed Insights runs for each strategy:

- mobile
- desktop

Default routes:

- `/`
- `/?search=serum`

A real product detail path should also be measured once a stable public product URL/ID is selected.

## Metrics

Lab diagnostics:

- Performance score
- Accessibility score
- Best Practices score
- SEO score
- FCP
- LCP
- CLS
- TBT
- Speed Index

Field data when CrUX has enough data:

- LCP
- INP
- CLS

INP is primarily a field metric. TBT is retained as a lab diagnostic and must not be mislabeled as INP.

## Budgets

Targets live in `config/performance-budgets.json`.

Primary targets:

- LCP <= 2.5 s
- CLS <= 0.10
- INP <= 200 ms when field data is available
- mobile Performance >= 0.85
- Accessibility >= 0.95
- Best Practices >= 0.95
- SEO >= 0.95

These are closure targets, not assumptions about the current production baseline.

## Known candidates to investigate after baseline

Source review shows:

- Home hero product image has no explicit `fetchPriority`.
- Product detail primary image has no explicit `fetchPriority`.
- Product detail thumbnails do not explicitly lazy-load.

Those are candidates only. No optimization should be applied until baseline/opportunity data supports it.

## Reliability

PageSpeed Insights is an external service and may respond with quota, 429, 500, or 503 errors. A failed API request is not automatically a production performance regression. Keep successful raw JSON runs in `.tmp/post-ux-c/` for comparison.

## Closure

POST-UX C is not closed by this baseline harness alone. The next step is to run the measurements, identify the dominant opportunities, implement targeted changes, rebuild, regression-test, deploy, and remeasure.
