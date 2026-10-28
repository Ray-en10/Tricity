import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { Activity } from 'lucide-react';


// Carte "Harmoniques" (§2.3) — qualité du signal + déphasage entre phases,
// affichée uniquement pour un compteur triphasé. Tant que le capteur réel
// n'a pas remonté de relevé, affiche un état neutre "en attente de données"
// plutôt qu'un chiffre inventé (voir server/models/PhaseReading.js).
export default function HarmoniquesCard({ meterId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meterId) return;
    axios.get(`${API_URL}/harmoniques/${meterId}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [meterId]);

  if (!meterId || loading) return null;
  if (!data) return null;

  const statusLabel = {
    correct: 'Correct',
    a_corriger: 'À corriger',
    inconnu: 'Indéterminé',
    en_attente_donnees: 'En attente de données',
  };
  const statusClass = {
    correct: 'badge-green',
    a_corriger: 'badge-red',
    inconnu: 'badge-muted',
    en_attente_donnees: 'badge-muted',
  };

  const status = data.available ? data.status : 'en_attente_donnees';

  return (
    <div className="panel harmoniques-card">
      <div className="panel-title">
        <Activity size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        Harmoniques
      </div>

      <div className="harmoniques-badge-row">
        <span className={`badge ${statusClass[status] || 'badge-muted'}`}>{statusLabel[status] || status}</span>
        {data.available && data.dephasageDegrees != null && (
          <span className="text-muted">Déphasage : {data.dephasageDegrees.toFixed(1)}°</span>
        )}
      </div>

      {data.available ? (
        <div className="phases-grid">
          {['L1', 'L2', 'L3'].map((phase) => {
            const p = data.phases?.[phase];
            if (!p) return null;
            return (
              <div key={phase} className="phase-col">
                <div className="phase-name">{phase}</div>
                <div className="phase-load">{p.loadKw != null ? `${p.loadKw} kW` : '—'}</div>
                <div className="phase-thd text-muted">{p.thdPercent != null ? `THD ${p.thdPercent}%` : ''}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted">
          Aucun relevé Harmoniques disponible pour ce compteur pour le moment.
        </p>
      )}
    </div>
  );
}
