# Teollisuusautomaation IoT-Valvontapaneeli

Tämä on Full-Stack IoT-järjestelmä, joka on suunniteltu teollisuuslaitteiden (kuten venttiilien ja moottoreiden) reaaliaikaiseen valvontaan, vikatilanteiden tunnistamiseen ja datan keräämiseen. 

Järjestelmä havaitsee dynaamisesti ylikuumenemiset ja jäätymisvaarat (DHT22) sekä kriittiset laitetärinät (MPU6050) ja hälyttää niistä paikallisesti LED-valolla sekä livenä React-dashboardilla.

## Järjestelmäarkkitehtuuri

Järjestelmä koostuu kolmesta pääkomponentista:
1. **`iot-laite` (ESP32 / Wokwi-simulaatio):** Lukee antureita (DHT22, MPU6050, Potentiometri) asynkronisesti ilman viiveitä (`millis()`). Laite kommunikoi langattomasti Wi-Fi-verkon yli ja julkaisee mittaustiedot JSON-muodossa MQTT-välittäjälle (`broker.emqx.io`).
2. **`iot-bakkari` (Node.js + Express):** Toimii MQTT-asiakkaana, joka tilaa laitteen datavirran, jäsentyy JSON-paketit ja tallentaa ne relaatiotietokantaan. Tarjoaa REST API -rajapinnan etupäälle.
3. **`iot-dashboard` (React + Vite):** Moderni käyttöliittymä, joka polling-menetelmällä päivittää anturiarvot ja mittaushistorian ruudulle 1 sekunnin välein.

## Tekniset pino (Tech Stack)
- **Embedded:** C++ (Arduino framework), ESP32, MQTT (PubSubClient), I2C, ADC, DHT22, MPU6050
- **Backend:** Node.js, Express.js, MQTT.js, SQLite/PostgreSQL, CORS
- **Frontend:** React (Hooks), Vite, JavaScript, CSS-in-JS

## Hälytyslogiikka
- `Tila 0 (Normal)`: Kaikki arvot viitealueella. Dashboard on vihreä.
- `Tila 1 (Varoitus)`: Lämpötila > 30 °C tai lämpötila laskee liian alas (jäätymisvaara). Dashboard muuttuu oranssiksi, laitteen LED vilkkuu hitaasti.- `Tila 2 (Kriittinen)`: Tärinä X/Y-akselilla > 15 m/s². Dashboard muuttuu punaiseksi, laitteen LED vilkkuu erittäin nopeasti.

## Miten järjestelmä käynnistetään paikallisesti

1. **Käynnistä tietokanta ja taustajärjestelmä:** 
```bash 
cd iot-bakkari 
npm install 
node server.js 
```

2. **Käynnistä React-käyttöliittymä:** 
```bash 
cd iot-dashboard 
npm install 
npm run dev 
```

3. **Käynnistä laitesimulaatio (kaksi vaihtoehtoa):
   * **Vaihtoehto A (Wokwi-simulaattori ESP32-laite):** Avaa `iot-laite`-kansion koodi Wokwi-simulaattorissa ja käynnistä simulaatio.
   * **Vaihtoehto B (Paikallinen Node-simulaattori):** Koska WokWi saattaa toisinaan pätkiä tai hidastella anturidatan pyörittämisessä, projektissa on mukana erillinen taustalla ajettava testisimulaattori. Se lähettää luotettavasti testidataa suoraan dashboardille:
   ```bash
   node simulaattori.js
   ```

---

## Jatkokehitysideat (Miten järjestelmää kehitetään)

Projektia voidaan laajentaa tulevaisuudessa seuraavilla ominaisuuksilla:
* **Automaattiset sähköposti-/tekstiviesthälytykset:** Integroidaan taustajärjestelmään palvelu (esim. SendGrid tai Twilio), joka lähettää automaattisen ilmoituksen ylläpidolle heti, kun kriittinen tila 2 (PUNAINEN) laukeaa.
* **Käyttäjänhallinta ja kirjautuminen:** Lisätään JWT-pohjainen (JSON Web Token) suojattu kirjautuminen dashboardille, jotta vain valtuutetut työntekijät voivst kuitata hälytyksiä tai muuttaa tehdasastuksia.
* **Historiadatan visualisointi:** Lisätään dashboardille interaktiiviset kuvaajat (esim. Chart.js tai Recharts), joista voidaan takastella lämpötilan ja tärinän kehitystä pitkältä aikaväliltä.
