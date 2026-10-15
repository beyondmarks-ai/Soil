param(
  [string]$ResourceGroup = "soil-agri-rg",
  [string]$FunctionName = "soil-agri-functions-617db570",
  [string]$WebAppName = "soil-agri-dashboard-617db570",
  [string]$VaultName = "soilagrikv617db570"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$stamp = Get-Date -Format "yyyyMMddHHmmss"
$deployRoot = Join-Path $repoRoot ".deploy\$stamp"
$functionStage = Join-Path $deployRoot "functions"
$dashboardStage = Join-Path $deployRoot "dashboard"
New-Item -ItemType Directory -Force -Path $functionStage, $dashboardStage | Out-Null

Push-Location (Join-Path $repoRoot "azure-functions")
npm ci
npm run build
Pop-Location

Copy-Item -LiteralPath (Join-Path $repoRoot "azure-functions\host.json") -Destination $functionStage
Copy-Item -LiteralPath (Join-Path $repoRoot "azure-functions\package.json") -Destination $functionStage
Copy-Item -LiteralPath (Join-Path $repoRoot "azure-functions\package-lock.json") -Destination $functionStage
Copy-Item -LiteralPath (Join-Path $repoRoot "azure-functions\dist") -Destination $functionStage -Recurse
Push-Location $functionStage
npm ci --omit=dev
Pop-Location
$functionZip = Join-Path $deployRoot "functions.zip"
tar.exe -a -c -f $functionZip -C $functionStage dist host.json node_modules package-lock.json package.json
az functionapp deployment source config-zip -g $ResourceGroup -n $FunctionName --src $functionZip --build-remote false --output none

Push-Location (Join-Path $repoRoot "smart-agri-dashboard")
npm ci
npm run build
Pop-Location
Copy-Item -Path (Join-Path $repoRoot "smart-agri-dashboard\.next\standalone\*") -Destination $dashboardStage -Recurse
New-Item -ItemType Directory -Force -Path (Join-Path $dashboardStage ".next\static") | Out-Null
Copy-Item -Path (Join-Path $repoRoot "smart-agri-dashboard\.next\static\*") -Destination (Join-Path $dashboardStage ".next\static") -Recurse
$dashboardZip = Join-Path $deployRoot "dashboard.zip"
tar.exe -a -c -f $dashboardZip -C $dashboardStage .next data node_modules package.json server.js
az webapp config appsettings set -g $ResourceGroup -n $WebAppName --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false ENABLE_ORYX_BUILD=false --output none
az webapp config set -g $ResourceGroup -n $WebAppName --startup-file "node server.js" --output none
az webapp deploy -g $ResourceGroup -n $WebAppName --src-path $dashboardZip --type zip --clean true --restart true --output none

$functionKey = az functionapp keys list -g $ResourceGroup -n $FunctionName --query functionKeys.default -o tsv
if (-not $functionKey) { throw "The Function App default key was not available after deployment." }
az keyvault secret set --vault-name $VaultName --name "function-key" --value $functionKey --output none
$settingsFile = Join-Path $PSScriptRoot ".settings-function-key.json"
@{ AZURE_FUNCTION_KEY = $functionKey; HOSTNAME = "0.0.0.0"; PORT = "8080" } | ConvertTo-Json | Set-Content -Encoding utf8 $settingsFile
az webapp config appsettings set -g $ResourceGroup -n $WebAppName --settings "@$settingsFile" --output none
az webapp restart -g $ResourceGroup -n $WebAppName --output none

Write-Output "Functions: https://$FunctionName.azurewebsites.net/api/health"
Write-Output "Dashboard: https://$WebAppName.azurewebsites.net"
