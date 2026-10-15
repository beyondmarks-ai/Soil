param(
  [string]$ResourceGroup = "soil-agri-rg",
  [string]$GitHubOwner = "beyondmarks-ai",
  [string]$GitHubRepository = "Soil"
)

$ErrorActionPreference = "Stop"
$displayName = "soil-agri-github-actions"
$clientId = az ad app list --display-name $displayName --query "[0].appId" -o tsv
if (-not $clientId) {
  $clientId = az ad app create --display-name $displayName --sign-in-audience AzureADMyOrg --query appId -o tsv
  az ad sp create --id $clientId --output none
}
$appObjectId = az ad app show --id $clientId --query id -o tsv
$credentialName = "github-main"
$credentialCount = az ad app federated-credential list --id $appObjectId --query "[?name=='$credentialName'] | length(@)" -o tsv
if ([int]$credentialCount -eq 0) {
  $credentialFile = Join-Path $PSScriptRoot ".github-oidc.json"
  [ordered]@{
    name = $credentialName
    issuer = "https://token.actions.githubusercontent.com"
    subject = "repo:$GitHubOwner/$GitHubRepository`:ref:refs/heads/main"
    description = "Deploy Soil Agri from the main branch"
    audiences = @("api://AzureADTokenExchange")
  } | ConvertTo-Json | Set-Content -Encoding utf8 $credentialFile
  az ad app federated-credential create --id $appObjectId --parameters "@$credentialFile" --output none
}
$principalId = az ad sp show --id $clientId --query id -o tsv
$scope = az group show -n $ResourceGroup --query id -o tsv
az role assignment create --assignee-object-id $principalId --assignee-principal-type ServicePrincipal --role Contributor --scope $scope --output none 2>$null

[ordered]@{
  AZURE_CLIENT_ID = $clientId
  AZURE_TENANT_ID = (az account show --query tenantId -o tsv)
  AZURE_SUBSCRIPTION_ID = (az account show --query id -o tsv)
} | ConvertTo-Json
