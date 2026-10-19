[CmdletBinding()]
param(
  [int]$HostPort = 55439,
  [string]$ContainerName = 'black-relic-sales-p0-postgres',
  [string]$Database = 'relic_sales_test',
  [string]$User = 'relic_sales_test',
  [string]$Password = 'relic_sales_test_only'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$baseSchema = Join-Path $root 'scripts/db/001_selfcare_sinners_production_schema.sql'
$schema = Join-Path $root 'scripts/db/relic-messaging-local-schema.sql'
$container = $null
$reportPath = Join-Path $env:TEMP 'black-relic-sales-p0-vitest.json'

try {
  docker info | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'DOCKER_ENGINE_UNAVAILABLE' }
  if (-not (Test-Path -LiteralPath $baseSchema)) { throw 'BASE_SCHEMA_NOT_FOUND' }
  if (-not (Test-Path -LiteralPath $schema)) { throw 'LOCAL_SCHEMA_NOT_FOUND' }

  $existing = docker ps -aq --filter "name=^/$ContainerName$"
  if ($existing) { docker rm -f $ContainerName | Out-Null }
  $container = docker run -d --name $ContainerName -e "POSTGRES_DB=$Database" -e "POSTGRES_USER=$User" -e "POSTGRES_PASSWORD=$Password" -p "${HostPort}:5432" postgres:16-alpine
  if ($LASTEXITCODE -ne 0) { throw 'POSTGRES_CONTAINER_START_FAILED' }

  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    docker exec $ContainerName pg_isready -U $User -d $Database | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
  }
  if (-not $ready) { throw 'POSTGRES_READINESS_TIMEOUT' }

  Get-Content -LiteralPath $baseSchema -Raw | docker exec -i $ContainerName psql -v ON_ERROR_STOP=1 -U $User -d $Database | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'BASE_SCHEMA_APPLY_FAILED' }
  Get-Content -LiteralPath $schema -Raw | docker exec -i $ContainerName psql -v ON_ERROR_STOP=1 -U $User -d $Database | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'LOCAL_SCHEMA_APPLY_FAILED' }

  $seed = @'
  BEGIN;
  INSERT INTO public.stores (id,name,slug,config,status)
  VALUES ('00000000-0000-4000-8000-000000000001','BLACK RELIC TEST','black-relic-test',
    '{"salesAutomation":{"deliveryOptions":[{"id":"shipping","name":"Envio","estimatedDays":"3-5","cost":99,"enabled":true},{"id":"pickup","name":"Pickup","estimatedDays":"0","cost":0,"enabled":true}],"paymentOptions":[{"id":"transfer","name":"Transferencia","description":"Transferencia bancaria","secureRedirectOnly":true,"enabled":true}]}}'::jsonb,'active')
  ON CONFLICT (id) DO UPDATE SET config=EXCLUDED.config,status='active';
  INSERT INTO public.products (id,store_id,name,slug,description,price,stock,brand,category,categories,variants,status,images,sku)
  VALUES ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','Playera RELIC Negra','playera-relic-negra','Fixture comercial local',499,20,'BLACK RELIC','Staging Category','["Staging Category"]'::jsonb,
    '[{"id":"00000000-0000-4000-8000-000000000011","name":"M / negro","sku":"RELIC-M-NEGRO","price":499,"stock":10},{"id":"00000000-0000-4000-8000-000000000012","name":"L / negro","sku":"RELIC-L-NEGRO","price":499,"stock":10}]'::jsonb,'active','[]'::jsonb,'RELIC-NEGRA')
  ON CONFLICT (id) DO UPDATE SET variants=EXCLUDED.variants,price=EXCLUDED.price,stock=EXCLUDED.stock,status='active';
  INSERT INTO relic_messaging.channel_bindings (channel,recipient_id,store_id,enabled)
  VALUES ('instagram','test_ig_black_relic','00000000-0000-4000-8000-000000000001',true),('messenger','test_fb_black_relic','00000000-0000-4000-8000-000000000001',true)
  ON CONFLICT (channel,recipient_id) DO UPDATE SET store_id=EXCLUDED.store_id,enabled=true;
  COMMIT;
'@
  $seed | docker exec -i $ContainerName psql -v ON_ERROR_STOP=1 -U $User -d $Database | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'COMMERCIAL_SEED_FAILED' }

  $env:SALES_AUTOMATION_TEST_DATABASE_URL = "postgresql://${User}:${Password}@127.0.0.1:${HostPort}/${Database}"
  Remove-Item -LiteralPath $reportPath -Force -ErrorAction SilentlyContinue
  npx vitest run tests/unit/ai/durable-sales-state.test.ts tests/unit/meta-outbound tests/integration/black-relic-dm-to-order.test.ts --reporter=json --outputFile="$reportPath"
  if ($LASTEXITCODE -ne 0) { throw 'SALES_POSTGRES_TESTS_FAILED' }
  $report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
  $assertions = @($report.testResults | ForEach-Object { $_.assertionResults })
  $gateMap = [ordered]@{
    'DM_TO_ORDER_E2E' = 'runs signed Instagram DM through DB-backed commerce'
    'DUPLICATE_EVENT_TEST' = 'does not create a second order on duplicate confirmation'
    'DISTINCT_EVENT_DOUBLE_CONFIRM_TEST' = 'coalesces concurrent confirmations from distinct events'
    'OUTBOUND_CONCURRENCY_TEST' = 'claims one PostgreSQL outbound row across two workers'
    'RESTART_RECOVERY' = 'recovers the commercial conversation across fresh runtimes'
    'FAIL_CLOSED_STOCK' = 'fails closed when stock is exhausted'
    'FAIL_CLOSED_PRICE' = 'requires reconfirmation when price changes'
    'FAIL_CLOSED_OUTBOUND_FAILURE' = 'keeps the order durable when outbound delivery fails'
    'FAIL_CLOSED_VARIANT' = 'fails closed when the selected variant becomes unavailable'
    'FAIL_CLOSED_DB_FAILURE' = 'fails closed on a controlled database error'
    'POST_COMMIT_RETRY_TEST' = 'recovers a post-commit retry in a fresh runtime'
    'FAIL_CLOSED_CUSTOMER_CONTEXT' = 'does not create an order without complete customer context'
  }
  foreach ($gate in $gateMap.GetEnumerator()) {
    $match = @($assertions | Where-Object { $_.title -like "*$($gate.Value)*" })
    if ($match.Count -ne 1 -or $match[0].status -ne 'passed') { throw "E2E_GATE_NOT_PROVEN_$($gate.Key)" }
    Write-Host "$($gate.Key)=PASS"
  }
  Write-Host 'DUPLICATE_ORDER_TEST=PASS'
  Write-Host 'CONCURRENT_CONFIRM_TEST=PASS'
  Write-Host 'E2E_RUNNER_READY=PASS'
  $summary = @'
SELECT 'CONVERSATION_COUNT=' || count(*) FROM relic_messaging.conversations;
SELECT 'CART_COUNT=' || count(*) FROM relic_messaging.carts;
SELECT 'ORDER_DRAFT_COUNT=' || count(*) FROM relic_messaging.order_links;
'@
  $summary | docker exec -i $ContainerName psql -At -v ON_ERROR_STOP=1 -U $User -d $Database
  if ($LASTEXITCODE -ne 0) { throw 'E2E_SQL_SUMMARY_FAILED' }
  Write-Host 'POSTGRES_E2E_RUNNER=COMMERCIAL_E2E_PASS'
}
finally {
  Remove-Item Env:SALES_AUTOMATION_TEST_DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $reportPath -Force -ErrorAction SilentlyContinue
  if ($container) { docker rm -f $ContainerName | Out-Null }
}
