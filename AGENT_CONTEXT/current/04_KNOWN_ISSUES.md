# KNOWN ISSUES

- POST-LAUNCH 20: Existing endpoints contain static seeded assessment values (under active remediation in task PL20-01).
- Performance/Scale: Real high-volume load testing has not been executed (synthetic smoke checks validate functional health, not multi-thousand CCU concurrency).
- External Channels & AI: Structurally implemented with schemas and admin endpoints, but live third-party connectors (e.g., live TikTok shop, OpenAI live agent credentials) are pending dedicated operational rollout.
- Dependency Baseline: 2 moderate and 1 high vulnerability in npm audit pending controlled future upgrade window.
