import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { COLOR_HEX, formatDeltaPercent } from '../utils/statusColor';


const TABS = [
  { key: 'hour', label: 'Jour (par heure)' },
  { key: 'day', label: 'Semaine (par jour)' },
  { key: 'week', label: 'Mois (par semaine)' },
];

// Drill-down par clic (§4.2) : jour → heure, semaine → jour, mois → semaine,
// barres colorées selon le prorata de l'objectif du circuit pour la période.
export default function CircuitHistory({ circuit, onClose }) {
  const [granularity, setGranularity] = useState('hour');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/circuits/${circuit._id}/history`, { params: { granularity } })
      .then((res) => setData(res.data))
      .catch((err) => console.error('Erreur historique circuit:', err))
      .finally(() => setLoading(false));
  }, [circuit._id, granularity]);

  const maxValue = data?.results?.length
    ? Math.max(...data.results.map((r) => r.valueKwh), 0.1)
    : 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card fade-in circuit-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Historique — {circuit.name}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="granularity-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`granularity-tab ${granularity === tab.key ? 'active' : ''}`}
              onClick={() => setGranularity(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-muted">Chargement…</p>}

        {!loading && data && (
          <div className="history-bars">
            {data.results.map((bucket, i) => (
              <div key={i} className="history-bar-col" title={`${bucket.label} : ${bucket.valueKwh} kWh (${formatDeltaPercent(bucket.deltaPercent)})`}>
                <div className="history-bar-track">
                  <div
                    className="history-bar-fill"
                    style={{
                      height: `${Math.min(100, (bucket.valueKwh / maxValue) * 100)}%`,
                      background: bucket.color ? COLOR_HEX[bucket.color] : 'var(--text-muted)',
                    }}
                  />
                </div>
                <span className="history-bar-label">{bucket.label}</span>
              </div>
            ))}
          </div>
        )}

        {!loading && data && !data.results.some((r) => r.objectiveKwh != null) && (
          <p className="text-muted" style={{ marginTop: '0.75rem' }}>
            Aucun objectif n'est encore défini pour ce circuit — les barres sont affichées sans code couleur.
            L'installateur ou le back-office peut définir un objectif par circuit.
          </p>
        )}
      </div>
    </div>
  );
}
