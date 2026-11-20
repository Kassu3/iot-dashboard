# Industrial Automation IoT Monitoring Dashboard 

A full-stack IoT monitoring system designed for real-time condition tracking, fault detection, and data collection of industrial equipment (such as valves and motors). 

The system dynamically detects overheating and freezing hazards (**DHT22**) as well as critical equipment vibration (**MPU6050**), alerting operators both locally via an onboard status LED and remotely on a live **React** dashboard. 

--- 

## System Architecture 

The system consists of three main components: 

1. **`iot-laite` (ESP32 / Wokwi Simulation):** Reads sensors (DHT22, MPU6050, Potentiometer) asynchronously without blocking delays (`millis()`). The device communicates wirelessly over Wi-Fi and publishes telemetry in JSON format to an MQTT broker (`broker.emqx.io`). 
2. **`iot-bakkari` (Node.js + Express):** Acts as an MQTT client that subscribes to the device data stream, parses incoming JSON packets, and persists them into a relational database. Exposes a REST API for the frontend. 
3. **`iot-dashboard` (React + Vite):** A modern operator interface that updates sensor values and measurement history on screen every 1 second using polling. 

--- 

## Tech Stack 

* **Embedded:** C++ (Arduino framework), ESP32, MQTT (PubSubClient), I2C, ADC, DHT22, MPU6050 
* **Backend:** Node.js, Express.js, MQTT.js, SQLite / PostgreSQL, CORS 
* **Frontend:** React (Hooks), Vite, JavaScript, CSS-in-JS 

--- 

## Alert Logic 

* **State 0 (Normal):** All values within nominal operating limits. The dashboard is green. 
* **State 1 (Warning):** Temperature > 30 °C or temperature drops too low (freezing hazard). The dashboard turns orange, and the onboard LED blinks slowly. 
* **State 2 (Critical):** Vibration on X/Y-axis > 15 m/s². The dashboard turns red, and the onboard LED blinks rapidly. 

--- 

## Running the System Locally 

### 1. Start the Database and Backend Server 
```bash 
cd iot-bakkari 
npm install 
node server.js 
``` 

### 2. Start the React Frontend 
```bash 
cd iot-dashboard 
npm install 
npm run dev 
``` 

### 3. Start the Device Simulation (Two Options) 
* **Option A (Wokwi ESP32 Hardware Simulation):** Open the `iot-laite` code in the Wokwi simulator and start the simulation. 
* **Option B (Local Node.js Test Simulator):** Because browser-based Wokwi simulations can occasionally lag or throttle sensor execution, the project includes a standalone background test simulator. It reliably streams realistic test telemetry directly to the dashboard: 
```bash 
node simulaattori.js 
``` 

--- 

## Future Improvements 

The project can be expanded in the future with the following features: 

* **Automated Email/SMS Alerts:** Integrate a notification service (e.g., SendGrid or Twilio) into the backend to automatically alert maintenance personnel the moment critical **State 2 (RED)** is triggered. 
* **User Management & Authentication:** Add JWT-based (JSON Web Token) authentication to the dashboard so only authorized personnel can acknowledge alarms or modify factory thresholds. 
* **Historical Data Visualization:** Add interactive time-series charts (e.g., Chart.js or Recharts) to the dashboard to analyze temperature and vibration trends over extended periods.
