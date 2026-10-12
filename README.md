# Soil

Blockchain-enabled IoT smart agriculture project with a live Next.js dashboard and Arduino/ESP32 sensor firmware.

## Included

- Responsive Next.js dashboard with overview, live sensors, irrigation, blockchain, devices, alerts, reports, and settings.
- Live Arduino serial bridge for DHT22, soil-moisture, and relay status.
- Arduino Uno diagnostic and integration sketches.
- ESP32 diagnostic sketch.
- Project review presentation.

## Hardware wiring

| Component | Arduino Uno pin |
| --- | --- |
| DHT22 DATA | D2 |
| Soil sensor AO | A0 |
| Relay IN | D7 |

The relay firmware assumes an active-low relay module and defaults it to OFF.

## Run the dashboard

```powershell
cd smart-agri-dashboard
npm install
npm run dev
```

Open `http://localhost:3000`. The development command starts both Next.js and the COM3 serial bridge. Override the port if needed:

```powershell
$env:SERIAL_PORT = "COM6"
npm run dev
```

## Build

```powershell
cd smart-agri-dashboard
npm run build
```

Live serial readings are written to `smart-agri-dashboard/data/live-sensors.json`, which is intentionally excluded from Git.
