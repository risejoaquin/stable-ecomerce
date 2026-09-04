# POST-UX C - Iteration 07: Exact Unused JavaScript Attribution

## Why

Iteration 06 produced a real Product Detail improvement:

- unused JS: about 162 KiB -> about 82 KiB
- mobile Performance median: about 0.89
- mobile LCP median: about 3.10 s

Home/Search still report about 129 KiB unused JS, but the latest Home/Search
measurement set is incomplete and some JSON files are stale.

Before another runtime change, the exact Lighthouse `unused-javascript` detail
items must be attributed to script URLs/chunks.

## Tool

`scripts/qa/analyze-post-ux-c-unused-js.ps1`

It extracts per Lighthouse report:

- script URL
- total script bytes
- wasted bytes
- wasted percentage
- route/report
- Performance score

It also aggregates average/max waste by script URL.

## Output

`.tmp/post-ux-c-js-waste/post-ux-c-unused-js-detail.csv`

## Important validation rule

First regenerate fresh Home/Search AND Product reports after the current
production deploy. Do not compare stale JSON from earlier iterations.

## Dependencies

None. Do not run `npm install`.
