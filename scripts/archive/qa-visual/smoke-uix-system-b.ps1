$ErrorActionPreference = "Stop"

function Assert-Contains($Path, $Pattern, $Message) {
  if (!(Test-Path $Path)) { throw "Missing file: $Path" }
  $content = Get-Content $Path -Raw
  if ($content -notmatch $Pattern) { throw "FAIL $Message" }
  Write-Host "PASS $Message" -ForegroundColor Green
}

Assert-Contains "src/components/admin/uix/AdminCommandNav.tsx" "AdminCommandNav" "admin command navigation exists"
Assert-Contains "src/components/admin/uix/AdminCommandAlert.tsx" "AdminCommandAlert" "admin command alert component exists"
Assert-Contains "src/components/admin/uix/AdminCommandSection.tsx" "AdminCommandSection" "admin command section component exists"
Assert-Contains "src/components/admin/uix/AdminCommandMetric.tsx" "AdminCommandMetric" "admin command metric component exists"
Assert-Contains "src/components/admin/uix/AdminCommandPanel.tsx" "AdminCommandPanel" "admin command panel component exists"
Assert-Contains "src/components/admin/uix/AdminCommandList.tsx" "AdminCommandListRow" "admin command list row component exists"
Assert-Contains "src/App.tsx" "AdminCommandNav" "admin layout uses centralized command nav"
Assert-Contains "src/App.tsx" "uix-admin-shell" "admin layout uses UIX admin shell"
Assert-Contains "src/pages/admin/AdminDashboard.tsx" "Prioridades críticas" "admin dashboard has critical priority section"
Assert-Contains "src/pages/admin/AdminDashboard.tsx" "Indicadores comerciales" "admin dashboard has business KPI section"
Assert-Contains "src/pages/admin/AdminDashboard.tsx" "Fulfillment, pagos y catálogo" "admin dashboard has operations section"
Assert-Contains "src/pages/admin/AdminDashboard.tsx" "Catálogo, promociones y clientes" "admin dashboard has growth section"
Assert-Contains "src/pages/admin/AdminDashboard.tsx" "AdminCommandAlert" "admin dashboard uses alert surface"
Assert-Contains "src/styles/uix-soft-premium-system.css" "UIX SYSTEM B" "UIX System B CSS marker exists"
Assert-Contains "docs/design/UIX_SYSTEM_B_ADMIN_COMMAND_CENTER_ARCHITECTURE.md" "Command Center" "UIX System B documentation exists"

Write-Host "PASS uix system b admin command center checks" -ForegroundColor Green
