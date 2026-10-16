param(
  [string]$Location = "centralindia",
  [string]$ResourceGroup = "soil-agri-rg",
  [string]$Suffix = "617db570",
  [bool]$EnableAuthentication = $true
)

$ErrorActionPreference = "Stop"
$tagArgs = @("project=soil-agri", "managed-by=azure-cli", "environment=demo")
$storageName = "soilagri$Suffix"
$iotHubName = "soil-agri-iot-$Suffix"
$cosmosName = "soil-agri-cosmos-$Suffix"
$webPubSubName = "soil-agri-live-$Suffix"
$vaultName = "soilagrikv$Suffix"
$functionName = "soil-agri-functions-$Suffix"
$webAppName = "soil-agri-dashboard-$Suffix"
$planName = "soil-agri-plan"
$mapsName = "soil-agri-maps-$Suffix"
$communicationName = "soil-agri-comms-$Suffix"
$emailServiceName = "soil-agri-email-$Suffix"
$aiName = "soil-agri-ai-$Suffix"
$workspaceName = "soil-agri-logs"
$insightsName = "soil-agri-insights"
$databaseName = "soil-agri"

function Test-AzureResource([string]$ResourceType, [string]$ResourceName) {
  $count = az resource list -g $ResourceGroup --resource-type $ResourceType --query "[?name=='$ResourceName'] | length(@)" -o tsv
  return [int]$count -gt 0
}

Write-Host "Creating the Soil Agri Azure foundation in $Location..."
az group create --name $ResourceGroup --location $Location --tags $tagArgs --output none

if (-not (Test-AzureResource "Microsoft.Storage/storageAccounts" $storageName)) {
  az storage account create -g $ResourceGroup -n $storageName -l $Location --sku Standard_LRS --kind StorageV2 --min-tls-version TLS1_2 --allow-blob-public-access false --tags $tagArgs --output none
}

if (-not (Test-AzureResource "Microsoft.KeyVault/vaults" $vaultName)) {
  az keyvault create -g $ResourceGroup -n $vaultName -l $Location --enable-rbac-authorization true --retention-days 7 --tags $tagArgs --output none
}
$vaultId = az keyvault show -g $ResourceGroup -n $vaultName --query id -o tsv
$signedInObjectId = az ad signed-in-user show --query id -o tsv
az role assignment create --assignee-object-id $signedInObjectId --assignee-principal-type User --role "Key Vault Secrets Officer" --scope $vaultId --output none 2>$null

if (-not (Test-AzureResource "Microsoft.DocumentDB/databaseAccounts" $cosmosName)) {
  az cosmosdb create -g $ResourceGroup -n $cosmosName --locations regionName=$Location failoverPriority=0 isZoneRedundant=False --capabilities EnableServerless --default-consistency-level Session --tags $tagArgs --output none
}
$databaseCount = az cosmosdb sql database list -g $ResourceGroup -a $cosmosName --query "[?name=='$databaseName'] | length(@)" -o tsv
if ([int]$databaseCount -eq 0) { az cosmosdb sql database create -g $ResourceGroup -a $cosmosName -n $databaseName --output none }
$existingContainers = az cosmosdb sql container list -g $ResourceGroup -a $cosmosName -d $databaseName --query "[].name" -o tsv
foreach ($containerName in @("telemetry", "alerts", "audit", "deviceState")) {
  if ($existingContainers -notcontains $containerName) { az cosmosdb sql container create -g $ResourceGroup -a $cosmosName -d $databaseName -n $containerName -p "/deviceId" --output none }
}
if ($existingContainers -notcontains "settings") { az cosmosdb sql container create -g $ResourceGroup -a $cosmosName -d $databaseName -n settings -p "/farmId" --output none }

if (-not (Test-AzureResource "Microsoft.Devices/IotHubs" $iotHubName)) {
  # Standard S1 is required for both telemetry and cloud-to-device relay control.
  az iot hub create -g $ResourceGroup -n $iotHubName -l $Location --sku S1 --partition-count 2 --tags $tagArgs --output none
}
$deviceCount = az iot hub device-identity list -g $ResourceGroup -n $iotHubName --query "[?deviceId=='esp32-greenfield-01'] | length(@)" -o tsv
if ([int]$deviceCount -eq 0) { az iot hub device-identity create -g $ResourceGroup -n $iotHubName -d esp32-greenfield-01 --output none }
$consumerCount = az iot hub consumer-group list -g $ResourceGroup --hub-name $iotHubName --query "[?name=='soil-functions'] | length(@)" -o tsv
if ([int]$consumerCount -eq 0) { az iot hub consumer-group create -g $ResourceGroup --hub-name $iotHubName --name soil-functions --output none }

if (-not (Test-AzureResource "Microsoft.SignalRService/WebPubSub" $webPubSubName)) {
  az webpubsub create -g $ResourceGroup -n $webPubSubName -l $Location --sku Free_F1 --unit-count 1 --tags $tagArgs --output none
}

if (-not (Test-AzureResource "Microsoft.OperationalInsights/workspaces" $workspaceName)) {
  az monitor log-analytics workspace create -g $ResourceGroup -n $workspaceName -l $Location --tags $tagArgs --output none
}
$workspaceId = az monitor log-analytics workspace show -g $ResourceGroup -n $workspaceName --query id -o tsv
if (-not (Test-AzureResource "Microsoft.Insights/components" $insightsName)) {
  az monitor app-insights component create -g $ResourceGroup -a $insightsName -l $Location --workspace $workspaceId --application-type web --kind web --tags $tagArgs --output none
}

if (-not (Test-AzureResource "Microsoft.Web/sites" $functionName)) {
  az functionapp create -g $ResourceGroup -n $functionName --storage-account $storageName --consumption-plan-location $Location --runtime node --runtime-version 22 --functions-version 4 --os-type Linux --app-insights $insightsName --assign-identity --tags $tagArgs --output none
}
if (-not (Test-AzureResource "Microsoft.Web/serverfarms" $planName)) {
  az appservice plan create -g $ResourceGroup -n $planName -l $Location --is-linux --sku B1 --tags $tagArgs --output none
}
if (-not (Test-AzureResource "Microsoft.Web/sites" $webAppName)) {
  az webapp create -g $ResourceGroup -p $planName -n $webAppName --runtime "NODE:22-lts" --assign-identity --https-only true --tags $tagArgs --output none
}
az webapp config set -g $ResourceGroup -n $webAppName --always-on true --http20-enabled true --min-tls-version 1.2 --startup-file "npm run start" --output none

if (-not (Test-AzureResource "Microsoft.Maps/accounts" $mapsName)) {
  az maps account create -g $ResourceGroup -n $mapsName -l global --kind Gen2 --sku G2 --disable-local-auth false --accept-tos --tags $tagArgs --output none
}
if (-not (Test-AzureResource "Microsoft.Communication/CommunicationServices" $communicationName)) {
  az communication create -g $ResourceGroup -n $communicationName -l global --data-location "Asia Pacific" --tags $tagArgs --output none
}
if (-not (Test-AzureResource "Microsoft.Communication/EmailServices" $emailServiceName)) {
  az communication email create -g $ResourceGroup -n $emailServiceName -l global --data-location "Asia Pacific" --tags $tagArgs --output none
}
$emailDomainCount = az communication email domain list -g $ResourceGroup --email-service-name $emailServiceName --query "[?name=='AzureManagedDomain'] | length(@)" -o tsv
if ([int]$emailDomainCount -eq 0) {
  az communication email domain create -g $ResourceGroup --email-service-name $emailServiceName -n AzureManagedDomain -l global --domain-management AzureManaged --user-engmnt-tracking Disabled --output none
}
az communication email domain wait -g $ResourceGroup --email-service-name $emailServiceName -n AzureManagedDomain --created --interval 10 --timeout 600
$emailDomainId = az communication email domain show -g $ResourceGroup --email-service-name $emailServiceName -n AzureManagedDomain --query id -o tsv
$emailSenderDomain = az communication email domain show -g $ResourceGroup --email-service-name $emailServiceName -n AzureManagedDomain --query fromSenderDomain -o tsv
az communication update -g $ResourceGroup -n $communicationName --linked-domains $emailDomainId --output none

if (-not (Test-AzureResource "Microsoft.CognitiveServices/accounts" $aiName)) {
  az cognitiveservices account create -g $ResourceGroup -n $aiName -l eastus2 --kind OpenAI --sku S0 --custom-domain $aiName --yes --tags $tagArgs --output none
}
$aiDeploymentCount = az cognitiveservices account deployment list -g $ResourceGroup -n $aiName --query "[?name=='gpt-4.1-nano'] | length(@)" -o tsv
if ([int]$aiDeploymentCount -eq 0) {
  az cognitiveservices account deployment create -g $ResourceGroup -n $aiName --deployment-name gpt-4.1-nano --model-name gpt-4.1-nano --model-version 2025-04-14 --model-format OpenAI --sku-name GlobalStandard --sku-capacity 1 --output none
}

$cosmosConnection = az cosmosdb keys list -g $ResourceGroup -n $cosmosName --type connection-strings --query "connectionStrings[0].connectionString" -o tsv
$iotEventConnection = az iot hub connection-string show -g $ResourceGroup -n $iotHubName --default-eventhub --query connectionString -o tsv
$iotServiceConnection = az iot hub connection-string show -g $ResourceGroup -n $iotHubName --policy-name service --query connectionString -o tsv
$iotEventHubName = az iot hub show -g $ResourceGroup -n $iotHubName --query properties.eventHubEndpoints.events.path -o tsv
$webPubSubConnection = az webpubsub key show -g $ResourceGroup -n $webPubSubName --query primaryConnectionString -o tsv
$mapsKey = az maps account keys list -g $ResourceGroup -n $mapsName --query primaryKey -o tsv
$communicationConnection = az communication list-key -g $ResourceGroup -n $communicationName --query primaryConnectionString -o tsv
$aiEndpoint = az cognitiveservices account show -g $ResourceGroup -n $aiName --query properties.endpoint -o tsv
$aiKey = az cognitiveservices account keys list -g $ResourceGroup -n $aiName --query key1 -o tsv

$secrets = @{
  "cosmos-connection" = $cosmosConnection
  "iot-eventhub-connection" = $iotEventConnection
  "iot-service-connection" = $iotServiceConnection
  "webpubsub-connection" = $webPubSubConnection
  "azure-maps-key" = $mapsKey
  "communication-connection" = $communicationConnection
  "email-sender" = "DoNotReply@$emailSenderDomain"
  "azure-openai-endpoint" = $aiEndpoint
  "azure-openai-key" = $aiKey
}
foreach ($entry in $secrets.GetEnumerator()) { az keyvault secret set --vault-name $vaultName --name $entry.Key --value $entry.Value --output none }

$functionPrincipal = az functionapp identity assign -g $ResourceGroup -n $functionName --query principalId -o tsv
$webPrincipal = az webapp identity assign -g $ResourceGroup -n $webAppName --query principalId -o tsv
foreach ($principal in @($functionPrincipal, $webPrincipal)) {
  az role assignment create --assignee-object-id $principal --assignee-principal-type ServicePrincipal --role "Key Vault Secrets User" --scope $vaultId --output none 2>$null
}

$vaultUri = az keyvault show -g $ResourceGroup -n $vaultName --query properties.vaultUri -o tsv
$functionSettings = [ordered]@{
  # App settings are encrypted at rest; Key Vault remains the canonical secret store.
  # Direct values avoid a Key Vault-reference cold-start penalty on the demo Consumption plan.
  COSMOS_CONNECTION_STRING = $cosmosConnection
  COSMOS_DATABASE = $databaseName
  IOT_HUB_EVENTHUB_CONNECTION = $iotEventConnection
  IOT_HUB_EVENTHUB_NAME = $iotEventHubName
  IOT_HUB_CONSUMER_GROUP = "soil-functions"
  IOT_HUB_SERVICE_CONNECTION = $iotServiceConnection
  WEB_PUBSUB_CONNECTION_STRING = $webPubSubConnection
  WEB_PUBSUB_HUB = "farm"
  AZURE_COMMUNICATION_CONNECTION_STRING = $communicationConnection
  ACS_EMAIL_SENDER = "DoNotReply@$emailSenderDomain"
  ALERT_EMAIL_TO = "contact@beyondmarks.ai"
  SCM_DO_BUILD_DURING_DEPLOYMENT = "true"
}
$functionSettingsFile = Join-Path $PSScriptRoot ".settings-functions.json"
$functionSettings | ConvertTo-Json | Set-Content -Encoding utf8 $functionSettingsFile
az functionapp config appsettings set -g $ResourceGroup -n $functionName --settings "@$functionSettingsFile" --output none

$webSettings = [ordered]@{
  COSMOS_CONNECTION_STRING = $cosmosConnection
  COSMOS_DATABASE = $databaseName
  AZURE_MAPS_KEY = $mapsKey
  SOIL_AZURE_OPENAI_ENDPOINT = $aiEndpoint
  SOIL_AZURE_OPENAI_API_KEY = $aiKey
  SOIL_AZURE_OPENAI_DEPLOYMENT = "gpt-4.1-nano"
  AZURE_COMMUNICATION_CONNECTION_STRING = $communicationConnection
  ACS_EMAIL_SENDER = "DoNotReply@$emailSenderDomain"
  ALERT_EMAIL_TO = "contact@beyondmarks.ai"
  AZURE_FUNCTION_BASE_URL = "https://$functionName.azurewebsites.net"
  SCM_DO_BUILD_DURING_DEPLOYMENT = "false"
  ENABLE_ORYX_BUILD = "false"
  NODE_ENV = "production"
  HOSTNAME = "0.0.0.0"
  PORT = "8080"
}
$webSettingsFile = Join-Path $PSScriptRoot ".settings-dashboard.json"
$webSettings | ConvertTo-Json | Set-Content -Encoding utf8 $webSettingsFile
az webapp config appsettings set -g $ResourceGroup -n $webAppName --settings "@$webSettingsFile" --output none

$deviceConnection = az iot hub device-identity connection-string show -g $ResourceGroup -n $iotHubName -d esp32-greenfield-01 --query connectionString -o tsv
az keyvault secret set --vault-name $vaultName --name "esp32-device-connection" --value $deviceConnection --output none

if ($EnableAuthentication) {
  $tenantId = az account show --query tenantId -o tsv
  $authDisplayName = "soil-agri-dashboard-$Suffix"
  $aadClientId = az ad app list --display-name $authDisplayName --query "[0].appId" -o tsv
  $redirectUrl = "https://$webAppName.azurewebsites.net/.auth/login/aad/callback"
  if (-not $aadClientId) {
    $aadClientId = az ad app create --display-name $authDisplayName --sign-in-audience AzureADMyOrg --web-redirect-uris $redirectUrl --query appId -o tsv
    az ad sp create --id $aadClientId --output none
  } else {
    az ad app update --id $aadClientId --web-redirect-uris $redirectUrl --output none
  }
  $aadSecret = az keyvault secret show --vault-name $vaultName --name "dashboard-aad-secret" --query value -o tsv 2>$null
  if (-not $aadSecret) {
    $aadSecret = az ad app credential reset --id $aadClientId --append --display-name "app-service" --years 1 --query password -o tsv
    az keyvault secret set --vault-name $vaultName --name "dashboard-aad-secret" --value $aadSecret --output none
  }
  $appRedirectUrl = "https://$webAppName.azurewebsites.net/api/auth/callback/microsoft-entra-id"
  az ad app update --id $aadClientId --web-redirect-uris $redirectUrl $appRedirectUrl --output none
  $authSecretBytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($authSecretBytes)
  $authSecret = [Convert]::ToBase64String($authSecretBytes)
  $authSettingsFile = Join-Path $PSScriptRoot ".settings-auth-app.json"
  [ordered]@{
    AUTH_SECRET = $authSecret
    AUTH_URL = "https://$webAppName.azurewebsites.net"
    AUTH_MICROSOFT_ENTRA_ID_ID = $aadClientId
    AUTH_MICROSOFT_ENTRA_ID_SECRET = $aadSecret
    AUTH_MICROSOFT_ENTRA_ID_TENANT_ID = $tenantId
  } | ConvertTo-Json | Set-Content -Encoding utf8 $authSettingsFile
  az webapp config appsettings set -g $ResourceGroup -n $webAppName --settings "@$authSettingsFile" --output none
}

$summary = [ordered]@{
  resourceGroup = $ResourceGroup
  location = $Location
  dashboardUrl = "https://$webAppName.azurewebsites.net"
  functionUrl = "https://$functionName.azurewebsites.net"
  iotHub = $iotHubName
  deviceId = "esp32-greenfield-01"
  cosmosAccount = $cosmosName
  keyVault = $vaultName
  mapsAccount = $mapsName
  aiAccount = $aiName
  emailService = $emailServiceName
}
$summary | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $PSScriptRoot "..\azure-deploy-output.json")
$summary | ConvertTo-Json
