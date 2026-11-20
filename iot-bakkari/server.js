const express = require('express');
const mqtt = require('mqtt');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 5000;

// Otetaan CORS käyttöön, jotta React voi tehdä hakuja tähän porttiin
app.use(cors());
app.use(express.json());

// --- 1. SQLite-Tietokannan alustus ---
const db = new sqlite3.Database('./sensor_data.db', (err) => {
    if (err) {
        console.error('Virhe tietokannan avaamisessa:', err.message);
    } else {
        console.log('Yhdistetty SQLite-tietokantaan.');
        // Luodaan taulu, jos sitä ei ole olemassa 
        db.run(`CREATE TABLE IF NOT EXISTS mittaukset ( 
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, 
            temperature REAL, 
            humidity REAL, 
            valve_position REAL, 
            vibration_x REAL, 
            vibration_y REAL, 
            status INTEGER 
        )`);
    }
});

// --- 2. MQTT-Asiakkaan alustus ja datan tallennus ---
const mqttClient = mqtt.connect('mqtt://broker.emqx.io '); //--hivemq.com');--
const mqttTopic = 'iot/projekti/sensorit';

mqttClient.on('connect', () => {
    console.log('Yhdistetty MQTT-välittäjään (broker.emqx.io)'); //--hivemq.com)');
    mqttClient.subscribe(mqttTopic, (err) => {
        if (!err) {
            console.log(`Tilattu aihe: ${mqttTopic}`);
        }
    });
});

mqttClient.on('message', (topic, message) => {
    try {
        // Jäsennetään ESP32:lta tullut JSON-paketti 
        const data = JSON.parse(message.toString());
        console.log('Uutta dataa vastaanotettu:', data);

        // Tallennetaan SQL-tietokantaan 
        const query = `INSERT INTO mittaukset 
            (temperature, humidity, valve_position, vibration_x, vibration_y, status) 
            VALUES (?, ?, ?, ?, ?, ?)`;

        const values = [
            data.temperature,
            data.humidity,
            data.valve_position,
            data.vibration_x,
            data.vibration_y,
            data.status
        ];

        db.run(query, values, function (err) {
            if (err) {
                console.error('Virhe tietokantaan tallennettaessa:', err.message);
            } else {
                console.log(`Data tallennettu riville ID: ${this.lastID}`);
            }
        });

    } catch (e) {
        console.error('Virheellinen JSON-data vastaanotettu:', message.toString());
    }
});

// --- 3. REST API -Rajapinnat React-etupäälle ---

// Hae kaikki mittaukset (rajataan varmuuden vuoksi viimeisimpään 100 tulokseen)
app.get('/api/measurements', (req, res) => {
    const query = `SELECT * FROM mittaukset ORDER BY timestamp DESC LIMIT 100`;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Hae vain kaikkein tuorein mittaus (reaaliaikaista näkymää varten)
app.get('/api/measurements/latest', (req, res) => {
    const query = `SELECT * FROM mittaukset ORDER BY timestamp DESC LIMIT 1`;
    db.get(query, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row || { message: "Ei dataa saatavilla" });
    });
});

// --- 4. Palvelimen käynnistys ---
app.listen(PORT, () => {
    console.log(`IoT-bakkari pyörii portissa: http://localhost:${PORT}`);
});
