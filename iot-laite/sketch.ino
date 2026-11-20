#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <Wire.h>
#include <WiFi.h>
#include <PubSubClient.h>

// --- Pinnimääritykset ---
#define DHTPIN 15
#define DHTTYPE DHT22
#define POT_PIN 34
#define LED_PIN 2

// --- Wi-Fi ja MQTT Asetukset ---
const char *ssid = "Wokwi-GUEST";
const char *password = "";
const char *mqtt_server = "broker.emqx.io"; // Vaihdettu vakaaseen palvelimeen
const int mqtt_port = 1883;
const char *mqtt_topic = "iot/projekti/sensorit";

// --- Ajastusvakiot ---
const unsigned long ANTURI_VALI = 2000;
unsigned long edellinenLuku = 0;
unsigned long edellinenVilkku = 0;
unsigned long vilkkuVali = 0;
bool ledTila = false;

// --- Hälytysrajat ---
const float RAJA_LAMPOTILA_YLA = 30.0;
const float RAJA_LAMPOTILA_ALA = 0.0;
const float RAJA_TARINA = 15.0;

// --- Olioiden alustukset ---
DHT dht(DHTPIN, DHTTYPE);
Adafruit_MPU6050 mpu;
WiFiClient espClient;
PubSubClient client(espClient);

enum HalytysTaso
{
    NORMAL,
    VAROITUS_LAMPOTILA,
    KRIITTINEN_TARINA
};
HalytysTaso nykyinenTila = NORMAL;

void AlustaWiFi()
{
    Serial.print("\nYhdistetään Wi-Fi: ");
    Serial.println(ssid);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWi-Fi yhdistetty! IP: " + WiFi.localIP().toString());
}

void reconnect()
{
    while (!client.connected())
    {
        Serial.print("Yritetään MQTT-yhteyttä...");
        String clientId = "ESP32Client-" + String(random(0, 9999));
        if (client.connect(clientId.c_str()))
        {
            Serial.println("Yhdistetty MQTT-välittäjään!");
        }
        else
        {
            Serial.print("Epäonnistui, virhekoodi: ");
            Serial.print(client.state());
            Serial.println(" Yritetään uudelleen 5s kuluttua.");
            delay(5000);
        }
    }
}

void setup()
{
    Serial.begin(115200);
    pinMode(LED_PIN, OUTPUT);
    pinMode(POT_PIN, INPUT);
    dht.begin();

    if (!mpu.begin())
    {
        while (1)
        {
            digitalWrite(LED_PIN, !digitalRead(LED_PIN));
            delay(100);
        }
    }

    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

    AlustaWiFi();
    client.setServer(mqtt_server, mqtt_port);
}

void loop()
{
    if (!client.connected())
    {
        reconnect();
    }
    client.loop();

    unsigned long nykyhetki = millis();

    if (nykyhetki - edellinenLuku >= ANTURI_VALI)
    {
        edellinenLuku = nykyhetki;
        LueAnturitJaTarkistaRajat();
        LahetaMqttData();
    }

    KasitteleLedHalytys(nykyhetki);
}

void LueAnturitJaTarkistaRajat()
{
    float lampotila = dht.readTemperature();
    float kosteus = dht.readHumidity();
    int potArvo = analogRead(POT_PIN);
    float avausProsentti = (potArvo / 4095.0) * 100.0;

    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    if (abs(a.acceleration.x) > RAJA_TARINA || abs(a.acceleration.y) > RAJA_TARINA)
    {
        nykyinenTila = KRIITTINEN_TARINA;
        vilkkuVali = 150;
    }
    else if (!isnan(lampotila) && (lampotila > RAJA_LAMPOTILA_YLA || lampotila < RAJA_LAMPOTILA_ALA))
    {
        nykyinenTila = VAROITUS_LAMPOTILA;
        vilkkuVali = 600;
    }
    else
    {
        nykyinenTila = NORMAL;
        vilkkuVali = 0;
    }
}

void KasitteleLedHalytys(unsigned long nykyhetki)
{
    if (nykyinenTila == NORMAL)
    {
        digitalWrite(LED_PIN, LOW);
        return;
    }
    if (nykyhetki - edellinenVilkku >= vilkkuVali)
    {
        edellinenVilkku = nykyhetki;
        ledTila = !ledTila;
        digitalWrite(LED_PIN, ledTila);
    }
}

void LahetaMqttData()
{
    float lampotila = dht.readTemperature();
    float kosteus = dht.readHumidity();
    float avausProsentti = (analogRead(POT_PIN) / 4095.0) * 100.0;
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    String jsonPayload = "{";
    jsonPayload += "\"temperature\":" + String(isnan(lampotila) ? 24.0 : lampotila, 1) + ",";
    jsonPayload += "\"humidity\":" + String(isnan(kosteus) ? 40.0 : kosteus, 1) + ",";
    jsonPayload += "\"valve_position\":" + String(avausProsentti, 1) + ",";
    jsonPayload += "\"vibration_x\":" + String(a.acceleration.x, 2) + ",";
    jsonPayload += "\"vibration_y\":" + String(a.acceleration.y, 2) + ",";
    jsonPayload += "\"status\":" + String(nykyinenTila);
    jsonPayload += "}";

    Serial.print("MQTT Lähetys -> ");
    Serial.println(jsonPayload);
    client.publish(mqtt_topic, jsonPayload.c_str());
}
