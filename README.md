# Soil Agri

Blockchain-enabled IoT smart agriculture prototype built around an ESP32, Azure, Polygon, and a professional Next.js dashboard.

Live dashboard: `https://soil-agri-dashboard-617db570.azurewebsites.net` (Microsoft Entra sign-in)

## Implemented system

| Layer | Implementation | Status |
| --- | --- | --- |
| Sensors | DHT22 temperature/humidity on GPIO 4; analog soil sensor on GPIO 34 | Implemented and previously hardware-tested |
| Actuator | Active-low relay on GPIO 26 with 10-minute cutoff and 30-second restart protection | Implemented |
| Edge controller | ESP32 secure MQTT firmware, Wi-Fi reconnect, SAS authentication and DigiCert TLS | Implemented |
| Automatic irrigation | Configurable start/stop thresholds synchronized from dashboard to ESP32 | Implemented |
| Device cloud | Azure IoT Hub S1 telemetry and cloud-to-device commands | Deployed |
| Processing | Azure Functions validates readings, creates alerts, hashes telemetry and broadcasts updates | Deployed |
| Storage | Azure Cosmos DB serverless telemetry, device state, alerts, audit and settings containers | Deployed |
| Real time | Azure Web PubSub with dashboard polling fallback | Deployed |
| Dashboard | Next.js overview, sensors, irrigation, blockchain, devices, alerts, reports and settings | Deployed |
| Security | HTTPS/TLS, Key Vault, managed identities, encrypted app settings and Entra sign-in | Implemented |
| Weather | Azure Maps current weather using saved farm coordinates | Implemented |
| Reports | CSV telemetry export and generated PDF farm summary | Implemented |
| AI irrigation advice | Azure OpenAI `gpt-4.1-nano` with safety rules and supervised cycle suggestions | Implemented |
| Notifications | Browser alerts and Azure Communication Services email with a 30-minute cooldown | Implemented |
| SMS | ACS delivery code and environment configuration | Ready; requires an ACS sender number and recipient number |
| Blockchain | SHA-256 audit log plus tested Polygon `SensorAudit` contract | Wallet secured in Key Vault; needs free Amoy test POL for deployment |
| Monitoring | Application Insights and Log Analytics | Deployed |
| CI/CD | GitHub Actions build, test and Azure deployment using passwordless OIDC | Implemented |

## ESP32 wiring

| Component pin | ESP32 connection |
| --- | --- |
| DHT22 VCC | 3V3 |
| DHT22 DATA/OUT | GPIO 4 |
| DHT22 GND | GND |
| Soil module VCC | 3V3 |
| Soil module AO/SIG | GPIO 34 |
| Soil module GND | GND |
| Relay VCC | VIN/5V only if required by the relay module |
| Relay IN/S | GPIO 26 |
| Relay GND | ESP32 GND |

All supplies must share ground. Do not feed 5V into an ESP32 GPIO. The firmware assumes an active-low relay and always boots it OFF.

## Firmware

Install the ESP32 board package plus `ArduinoJson`, `DHT sensor library`, and `PubSubClient`. Copy `esp32_azure_firmware/config.example.h` to the ignored `config.h`, enter Wi-Fi/Azure values, then flash `esp32_azure_firmware.ino`.

The older Arduino Uno diagnostic sketches remain available for isolated DHT22, soil and relay tests.

## Local dashboard

```powershell
./infra/configure-local-env.ps1
cd smart-agri-dashboard
npm ci
npm run dev
```

The setup script creates an ignored `.env.local` containing the Azure API settings. Local development skips sign-in, auto-detects the serial port, supports USB relay commands, uploads readings to Azure history, and keeps AI, weather, email and blockchain services internet-connected.

## Azure deployment

```powershell
az login
.\infra\deploy.ps1
.\infra\deploy-code.ps1
```

See `infra/README.md` for secrets, firmware provisioning and Polygon settings. Azure resources use paid/serverless SKUs and may incur charges, especially IoT Hub S1 and App Service B1.

## Verification

```powershell
cd azure-functions; npm ci; npm test; npm run build
cd ..\blockchain; npm ci; npm test; npm run compile
cd ..\smart-agri-dashboard; npm ci; npm run lint; npm run build
```

The source presentation is retained as `Blockchain_IoT_Smart_Agriculture_Colorful_Review (1).pptx`.

<!-- beyond-marks-credit:start -->
---
### Built by Beyond Marks AI Academy

Developed by **Rakesh Kumar** at [Beyond Marks AI Academy](https://beyondmarks.ai).
<!-- beyond-marks-credit:end -->
