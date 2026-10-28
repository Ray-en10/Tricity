import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { COLOR_HEX, formatDeltaPercent } from '../utils/statusColor';
import CircuitBreakdown from '../components/CircuitBreakdown';

const PROJECTION_LABEL = { avance: 'En avance', retard: 'En retard', on_track: 'Conforme' };

// Dashboard web du responsable réseau (§8bis) : vue d'ensemble de tous les
// sites, agrégation des objectifs, sites défaillants mis en avant, et accès
// au dashboard indépendant de chaque site.
export default function NetworkView() {
  const [networks, setNetworks] = useState([]);
  const [networkId, setNetworkId] = useState(null);
  const [overview, setOverview] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [siteStats, setSiteStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/networks`)
      .then((res) => {
        setNetworks(res.data);
        if (res.data[0]) setNetworkId(res.data[0]._id);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  useEffect(() => {
    if (!networkId) return;
    setOverview(null);
    axios.get(`${API_URL}/networks/${networkId}/overview`)
      .then((res) => setOverview(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [networkId]);

  useEffect(() => {
    if (!selectedSite || !networkId) { setSiteStats(null); return; }
    axios.get(`${API_URL}/networks/${networkId}/sites/${selectedSite.siteId}/stats`)
      .then((res) => setSiteStats(res.data))
      .catch(() => setSiteStats(null));
  }, [selectedSite, networkId]);

  if (error) return <div className="panel"><p className="text-red">{error}</p></div>;
  if (networks.length === 0) {
    return <div className="panel"><p className="text-muted">Aucun réseau ne vous est rattaché pour le moment. Contactez le back-office.</p></div>;
  }
  if (!overview) return <p className="text-muted">Chargement du réseau…</p>;

  const { totals, sites, failingSiteIds } = overview;
  const failing = new Set(failingSiteIds.map(String));

  return (
    <div className="dashboard-view network-view">
      {networks.length > 1 && (
        <select value={networkId} onChange={(e) => { setSelectedSite(null); setNetworkId(e.target.value); }}>
          {networks.map((n) => <option key={n._id} value={n._id}>{n.name}</option>)}
        </select>
      )}

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{totals.sites}</div><div className="stat-label">Sites équipés</div></div>
        <div className="stat-card"><div className="stat-value text-green">{totals.sitesOk}</div><div className="stat-label">Sites conformes</div></div>
        <div className="stat-card"><div className="stat-value text-red">{totals.sitesFailing}</div><div className="stat-label">Sites en alerte</div></div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: totals.color ? COLOR_HEX[totals.color] : undefined }}>
            {totals.cumulKwh} kWh
          </div>
          <div className="stat-label">
            Cumul réseau — {formatDeltaPercent(totals.deltaPercent)} vs attendu · {totals.cumulDT} DT
          </div>
        </div>
      </div>

      <div className="panel full-panel">
        <div className="panel-title">Sites du réseau — {overview.network.name}</div>
        <table className="sites-table">
          <thead>
            <tr><th>Site</th><th>Compteur</th><th>Cumul cycle</th><th>Objectif</th><th>Écart</th><th>Projection</th></tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr
                key={s.siteId}
                className={`${failing.has(String(s.siteId)) ? 'site-failing' : ''} ${selectedSite?.siteId === s.siteId ? 'selected' : ''}`}
                onClick={() => setSelectedSite(s)}
              >
                <td>{s.location || s.name}</td>
                <td>{s.meterType === 'triphase' ? 'Tri' : s.meterType === 'monophase' ? 'Mono' : '—'}</td>
                <td>{s.cycle.cumulKwh} kWh</td>
                <td>{s.cycle.objectiveKwh != null ? `${s.cycle.objectiveKwh} kWh` : '—'}</td>
                <td style={{ color: s.cycle.color ? COLOR_HEX[s.cycle.color] : undefined, fontWeight: 600 }}>
                  {formatDeltaPercent(s.cycle.deltaPercent)}
                </td>
                <td>{PROJECTION_LABEL[s.cycle.projectionStatus] || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSite && (
        <div className="panel full-panel site-detail">
          <div className="panel-header-alt">
            <div className="panel-title">Dashboard du site — {selectedSite.location || selectedSite.name}</div>
            <button className="add-btn" onClick={() => setSelectedSite(null)}>Fermer</button>
          </div>
          {siteStats ? (
            <div className="site-detail-grid">
              <p>Journée : <strong>{siteStats.day.totalKwh} kWh</strong> ({formatDeltaPercent(siteStats.day.deltaPercent)} vs objectif journalier)</p>
              <p>Cycle : <strong>{siteStats.cycle.cumulKwh} kWh</strong>
                {siteStats.cycle.cumulDT != null && ` — ${siteStats.cycle.cumulDT} DT`}
                {siteStats.cycle.currentTierLabel && ` — ${siteStats.cycle.currentTierLabel}`}</p>
              {siteStats.cycle.projection && (
                <p>Projection fin de cycle : <strong>{siteStats.cycle.projection.estimatedTotalKwh} kWh</strong> ({PROJECTION_LABEL[siteStats.cycle.projection.status]})</p>
              )}
            </div>
          ) : <p className="text-muted">Chargement…</p>}
          <CircuitBreakdown userId={selectedSite.siteId} />
        </div>
      )}
    </div>
  );
}
