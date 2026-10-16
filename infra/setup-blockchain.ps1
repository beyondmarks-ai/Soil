param(
  [string]$ResourceGroup = "soil-agri-rg",
  [string]$FunctionName = "soil-agri-functions-617db570",
  [string]$VaultName = "soilagrikv617db570",
  [string]$RpcUrl = "https://polygon-amoy-bor-rpc.publicnode.com"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$secretCount = az keyvault secret list --vault-name $VaultName --query "[?name=='polygon-private-key'] | length(@)" -o tsv
if ([int]$secretCount -eq 0) {
  Push-Location (Join-Path $repoRoot "blockchain")
  try { $walletJson = node --input-type=module -e "import { Wallet } from 'ethers'; const wallet=Wallet.createRandom(); console.log(JSON.stringify({address:wallet.address,privateKey:wallet.privateKey}));" | ConvertFrom-Json }
  finally { Pop-Location }
  az keyvault secret set --vault-name $VaultName --name polygon-private-key --value $walletJson.privateKey --output none
  az keyvault secret set --vault-name $VaultName --name polygon-wallet-address --value $walletJson.address --output none
}
$privateKey = az keyvault secret show --vault-name $VaultName --name polygon-private-key --query value -o tsv
$walletAddress = az keyvault secret show --vault-name $VaultName --name polygon-wallet-address --query value -o tsv
$rpcBody = @{ jsonrpc = "2.0"; method = "eth_getBalance"; params = @($walletAddress, "latest"); id = 1 } | ConvertTo-Json
$balanceResult = Invoke-RestMethod -Uri $RpcUrl -Method Post -ContentType "application/json" -Body $rpcBody
$balance = [Convert]::ToUInt64($balanceResult.result.Substring(2), 16)
if ($balance -eq 0) {
  Write-Output "Polygon Amoy wallet: $walletAddress"
  Write-Output "Status: waiting for free Amoy test POL. Fund this address from https://faucet.polygon.technology/ and rerun this script."
  exit 0
}

$env:BLOCKCHAIN_RPC_URL = $RpcUrl
$env:BLOCKCHAIN_PRIVATE_KEY = $privateKey
Push-Location (Join-Path $repoRoot "blockchain")
try { $deployment = node scripts/deploy.mjs | ConvertFrom-Json }
finally { Pop-Location; Remove-Item Env:BLOCKCHAIN_PRIVATE_KEY -ErrorAction SilentlyContinue }
az keyvault secret set --vault-name $VaultName --name polygon-contract-address --value $deployment.contractAddress --output none
$settingsFile = Join-Path $PSScriptRoot ".settings-blockchain.json"
[ordered]@{ BLOCKCHAIN_RPC_URL = $RpcUrl; BLOCKCHAIN_PRIVATE_KEY = $privateKey; BLOCKCHAIN_CONTRACT_ADDRESS = $deployment.contractAddress } | ConvertTo-Json | Set-Content -Encoding utf8 $settingsFile
az functionapp config appsettings set -g $ResourceGroup -n $FunctionName --settings "@$settingsFile" --output none
Write-Output "SensorAudit deployed: $($deployment.contractAddress)"
