# Azure deployment

Run the idempotent Azure CLI provisioning script from the repository root:

```powershell
.\infra\deploy.ps1
```

The script creates the resource group, IoT Hub S1, serverless Cosmos DB, Web PubSub, Key Vault, Application Insights, Function App, dashboard App Service, Azure Maps, Communication Services, and Microsoft Entra sign-in. Secrets are stored in Key Vault; the required values are also applied as encrypted app settings to avoid Consumption-plan cold-start delays. Generated setting files are ignored by Git.

After provisioning, deploy application code with `deploy-code.ps1`. Retrieve the ESP32 device connection string only when preparing `esp32_azure_firmware/config.h`:

```powershell
.\infra\deploy-code.ps1
```

```powershell
az keyvault secret show --vault-name soilagrikv617db570 --name esp32-device-connection --query value -o tsv
```

Copy `esp32_azure_firmware/config.example.h` to the ignored `config.h`, then enter Wi-Fi and device connection values before flashing the ESP32.

## Optional Polygon Amoy anchoring

Deploy the contract from `blockchain/`, then configure these Function App settings (prefer values retrieved from Key Vault in automation):

- `BLOCKCHAIN_RPC_URL`
- `BLOCKCHAIN_PRIVATE_KEY`
- `BLOCKCHAIN_CONTRACT_ADDRESS`

Without them, every reading is still SHA-256 hashed and recorded in the Cosmos audit log with status `configured-later`.

## GitHub Actions OIDC

Run `./infra/setup-github-oidc.ps1`, then add its three non-secret identifiers as GitHub Actions secrets named `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID`. The workflow uses short-lived federated credentials; no Azure client secret is stored in GitHub.
