import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');

console.log('[PL20-03M] Fetching production JWT_SECRET from Railway heroic-solace...');
const rawVars = execFileSync('railway.cmd', [
  'variable', 'list',
  '--project', '2ee53291-c0b1-4859-9ae6-8e331d1f6435',
  '--service', '262ce4a4-ea70-4b0a-886d-511eb13d5d27',
  '--environment', 'production',
  '--json'
], { encoding: 'utf8', shell: true });

const parsedVars = JSON.parse(rawVars);
const jwtSecret = parsedVars.JWT_SECRET;

if (!jwtSecret) {
  console.error('[PL20-03M] JWT_SECRET not found in production Railway variables.');
  process.exit(1);
}

const token = jwt.sign(
  { userId: 'audit-pl20-03m-admin', role: 'admin' },
  jwtSecret,
  { expiresIn: '5m' }
);

console.log('[PL20-03M] Querying live production endpoint: GET https://selfcaresinners.com/api/admin/final-scale/summary...');

async function main() {
  const res = await fetch('https://selfcaresinners.com/api/admin/final-scale/summary', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[PL20-03M] HTTP ${res.status} ${res.statusText}:`, text);
    process.exit(1);
  }

  const data = await res.json();
  console.log('[PL20-03M] Live Production Final Scale Summary Result:');
  console.log(JSON.stringify(data, null, 2));

  const s = data.summary;
  const rules = s.evaluationRules;

  console.log('\n==================================================');
  console.log('LIVE PRODUCTION FINAL SCALE RE-EVALUATION VERDICT');
  console.log('==================================================');
  console.log('operatingCostSummaries count:', s.operatingCostSummaries);
  console.log('isCostEvidenceMeasured:', rules.isCostEvidenceMeasured);
  console.log('technicalRequiredPass:', rules.technicalRequiredPass);
  console.log('isSecurityBlockersSatisfied:', rules.isSecurityBlockersSatisfied);
  console.log('hasCriticalRisk:', rules.hasCriticalRisk);
  console.log('hasCriticalDebt:', rules.hasCriticalDebt);
  console.log('isCommercialMeasured:', rules.isCommercialMeasured);
  console.log('isCapacityLoadMeasured:', rules.isCapacityLoadMeasured);
  console.log('finalScaleReady:', s.finalScaleReady);
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('[PL20-03M] Failed to check final scale summary:', err);
  process.exit(1);
});
