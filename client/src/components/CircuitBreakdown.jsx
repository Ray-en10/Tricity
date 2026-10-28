import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import CircuitHistory from './CircuitHistory';


// Répartition par disjoncteur (§2.3, §4.2) : charge les compteurs puis leurs
// circuits réels (3 mesurés + 1 calculé), avec objectif/% par circuit,
// cliquables pour ouvrir le drill-down historique.
// `userId` (optionnel) : consulter les compteurs d'un site précis (responsable
// réseau, installateur, back-office) ; par défaut, ceux du compte connecté.
export default function CircuitBreakdown({ userId = null }) {
  const [meters, setMeters] = useState([]);
  const [circuitsByMeter, setCircuitsByMeter] = useState({});
  const [selectedCircuit, setSelectedCircuit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API_URL}/meters`, { params: userId ? { userId } : {} }).then(async (res) => {
      setMeters(res.data);
      const entries = await Promise.all(
        res.data.map((meter) =>
          axios.get(`${API_URL}/circuits`, { params: { meterId: meter._id } }).then((r) => [meter._id, r.data])
        )
      );
      setCircuitsByMeter(Object.fromEntries(entries));
      setLoading(false);
    }).catch((err) => {
      console.error('Erreur chargement compteurs/circuits:', err);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <p className="text-muted">Chargement de la répartition par disjoncteur…</p>;

  if (meters.length === 0) {
    return <p className="text-muted">Aucun compteur configuré pour ce compte. Contactez votre installateur.</p>;
  }

  return (
    <div className="panel full-panel circuit-breakdown">
      <div className="panel-title">Répartition par disjoncteur</div>
      {meters.map((meter) => (
        <div key={meter._id} className="meter-block">
          <div className="meter-label">
            {meter.label} — <span className="text-muted">{meter.type === 'triphase' ? 'Triphasé' : 'Monophasé'}</span>
          </div>
          <div className="circuits-grid">
            {(circuitsByMeter[meter._id] || []).map((circuit) => (
              <button
                key={circuit._id}
                className="circuit-card"
                onClick={() => setSelectedCircuit(circuit)}
              >
                <div className="circuit-card-name">
                  {circuit.name}
                  {circuit.isCalculated && <span className="badge badge-muted">calculé</span>}
                </div>
                <div className="circuit-card-objective">
                  {circuit.objectiveKwh != null
                    ? `Objectif : ${circuit.objectiveKwh} kWh/cycle`
                    : 'Objectif non défini'}
                </div>
                <div className="circuit-card-hint text-muted">Cliquer pour voir l'historique</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {selectedCircuit && (
        <CircuitHistory circuit={selectedCircuit} onClose={() => setSelectedCircuit(null)} />
      )}
    </div>
  );
}
