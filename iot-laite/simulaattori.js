const mqtt = require('mqtt');

const mqttServer = 'mqtt://broker.emqx.io';
const mqttTopic = 'iot/projekti/sensorit';

console.log("=== VIRTUAALINEN MQTT-ESP32 KÄYNNISTYY ===");
console.log(`Yhdistetään palvelimeen: ${mqttServer}`);
console.log(`Julkaistaan aiheeseen: ${mqttTopic}`);

const client = mqtt.connect(mqttServer);

let lampotila = 24.0;
let kosteus = 40.0;
let venttiili = 50.0;

client.on('connect', () => {
    console.log(' Yhteys MQTT-välittäjään muodostettu!');

    // Lähetetään dataa 2 sekunnin välein 
    setInterval(() => {
        // Simuloidaan pientä vaihtelua anturiarvoihin 
        lampotila += (Math.random() - 0.5) * 0.4;
        kosteus += (Math.random() - 0.5) * 0.5;
        venttiili += (Math.random() - 0.5) * 2.0;

        if (lampotila > 35 || lampotila < -5) lampotila = 24;
        if (venttiili < 0) venttiili = 0;
        if (venttiili > 100) venttiili = 100;

        const tarinaX = (Math.random() - 0.5) * 5;
        const tarinaY = (Math.random() - 0.5) * 5;

        let status = 0;
        if (Math.abs(tarinaX) > 15 || Math.abs(tarinaY) > 15) {
            status = 2;
        } else if (lampotila > 30.0 || lampotila <= 0.0) {
            status = 1;
        }

        // Rakennetaan täsmälleen samanlainen JSON-merkkijono kuin ESP32-koodissasi 
        const payload = JSON.stringify({
            temperature: parseFloat(lampotila.toFixed(1)),
            humidity: parseFloat(kosteus.toFixed(1)),
            valve_position: parseFloat(venttiili.toFixed(1)),
            vibration_x: parseFloat(tarinaX.toFixed(2)),
            vibration_y: parseFloat(tarinaY.toFixed(2)),
            status: status
        });

        // Julkaistaan viesti MQTT-verkkoon 
        client.publish(mqttTopic, payload);
        console.log(` MQTT Lähetys -> ${payload}`);
    }, 2000);
});

client.on('error', (err) => {
    console.error(' MQTT Virhe:', err);
});