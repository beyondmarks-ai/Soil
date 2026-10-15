# Polygon telemetry audit

`SensorAudit.sol` anchors SHA-256 telemetry hashes on Polygon without publishing farm readings. Duplicate hashes are rejected and only the deployment wallet can submit anchors.

```powershell
cd blockchain
npm ci
npm test
$env:BLOCKCHAIN_PRIVATE_KEY = "<funded Polygon Amoy wallet private key>"
npm run deploy:amoy
```

After deployment, store the RPC URL, wallet key, and returned contract address in Key Vault and configure the Function App settings described in `infra/README.md`.
