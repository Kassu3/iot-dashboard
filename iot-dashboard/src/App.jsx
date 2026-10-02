import { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [virhe, setVirhe] = useState(null);

  // Käynnistetään automaattinen päivitys 1 sekunnin välein 
  useEffect(() => {
    // Tehdään haku turvallisesti efektin sisällä, Funktio datan hakemiseen bakkarista 
    const haeData = async () => {
      try {
        // 1. Hae uusin yksittäinen mittaus 
        const uusinRes = await fetch('http://localhost:5000/api/measurements/latest');
        if (!uusinRes.ok) throw new Error('Yhteys taustajärjestelmään epäonnistui');
        const uusinData = await uusinRes.json();

        if (!uusinData.message) {
          setData(uusinData);
          setVirhe(null);
        }

        // 2. Hae historiatiedot taulukkoa varten 
        const historiaRes = await fetch('http://localhost:5000/api/measurements');
        if (historiaRes.ok) {
          const historiaData = await historiaRes.json();
          setHistory(historiaData);
        }

      } catch (err) {
        setVirhe('Virhe haettaessa dataa palvelimelta. Varmista että iot-bakkari on päällä.');
        console.error(err);
      }
    };

    haeData(); // Haetaan heti käynnistyksessä 
    const interval = setInterval(haeData, 1000);

    return () => clearInterval(interval);
  }, []);

  // Hälytystilan muotoilu tekstiksi ja väriksi 
  const getStatusInfo = (status) => {
    switch (status) {
      case 2: return { teksti: '🚨 KRIITTINEN TÄRINÄ', vari: '#ff4d4d' };
      case 1: return { teksti: '⚠️ LÄMPÖTILAHÄLYTYS', vari: '#ffa500' };
      default: return { teksti: '✅ NORMAALITILA', vari: '#2ecc71' };
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', backgroundColor: '#f5f6fa', minHeight: '100vh' }}>
      <header style={{
        borderBottom: '2px solid #333',
        paddingBottom: '15px',
        marginBottom: '25px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '2.2rem', lineHeight: '1.2' }}>
          Teollisuusautomaation Valvontapaneeli
        </h1>
        <p style={{ margin: 0, color: '#7f8c8d', fontSize: '1.1rem' }}>
          Reaaliaikainen ESP32-anturiseuranta
        </p>
      </header>

      {virhe && (
        <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
          {virhe}
        </div>
      )}

      {/* --- REAALIAIKAINEN TILANÄKYMÄ --- */}
      {data ? (
        <div>
          <div style={{
            backgroundColor: getStatusInfo(data.status).vari,
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            JÄRJESTELMÄN TILA: {getStatusInfo(data.status).teksti}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div style={cardStyle}>
              <h3>Lämpötila</h3>
              <p style={valueStyle}>{data.temperature} °C</p>
            </div>
            <div style={cardStyle}>
              <h3>Kosteus</h3>
              <p style={valueStyle}>{data.humidity} %</p>
            </div>
            <div style={cardStyle}>
              <h3>Venttiilin asento</h3>
              <p style={valueStyle}>{data.valve_position} %</p>
            </div>
            <div style={cardStyle}>
              <h3>Tärinä (X / Y)</h3>
              <p style={{ ...valueStyle, fontSize: '1.5rem' }}>X: {data.vibration_x} | Y: {data.vibration_y}</p> <span style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>m/s²</span>
            </div>
          </div>
        </div>
      ) : (
        <p>Odotetaan dataa... Käynnistä ESP32-simulaatio ja iot-bakkari.</p>
      )}

      {/* --- HISTORIATAULUKKO --- */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0 }}>Mittausshistoria (Viimeisimmät)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f2f6', borderBottom: '2px solid #ddd' }}>
                <th style={thStyle}>Aikaleima (UTC)</th>
                <th style={thStyle}>Temp (°C)</th>
                <th style={thStyle}>Kosteus (%)</th>
                <th style={thStyle}>Venttiili (%)</th>
                <th style={thStyle}>Tärinä X</th>
                <th style={thStyle}>Tärinä Y</th>
                <th style={thStyle}>Tila-koodi</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={tdStyle}>{row.timestamp}</td>
                  <td style={tdStyle}>{row.temperature}</td>
                  <td style={tdStyle}>{row.humidity}</td>
                  <td style={tdStyle}>{row.valve_position}</td>
                  <td style={tdStyle}>{row.vibration_x}</td>
                  <td style={tdStyle}>{row.vibration_y}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', color: getStatusInfo(row.status).vari }}>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Yksinkertaiset tyylit komponenteille
const cardStyle = {
  backgroundColor: 'white',
  padding: '20px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  textAlign: 'center'
};

const valueStyle = {
  fontSize: '2rem',
  fontWeight: 'bold',
  margin: '10px 0 0 0',
  color: '#2c3e50'
};

const thStyle = { padding: '12px', borderBottom: '1px solid #ddd' };
const tdStyle = { padding: '12px', borderBottom: '1px solid #ddd' };

export default App;