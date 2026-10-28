import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bell, ExternalLink, LogOut } from 'lucide-react';
import { API_URL, WEB_APP_URL, VARIANT_LABEL } from '../config';
import { useAuth } from '../context/AuthContext';

// Écran mobile du responsable réseau (§9) : pas de dashboard multi-sites sur
// mobile (usage de pilotage = web), uniquement les notifications — avec un
// lien pour ouvrir le tableau de bord complet sur le site web applicatif.
export default function NotificationsOnlyView() {
  const { user, logout } = useAuth();
  const [alerts, setAlerts] = useState([]);

  const load = useCallback(() => {
    axios.get(`${API_URL}/alerts`).then((res) => setAlerts(res.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAllRead = () => axios.post(`${API_URL}/alerts/read-all`).then(load);
  const unread = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="notif-only">
      <header className="notif-only-header">
        <div>
          <h1>{VARIANT_LABEL}</h1>
          <p className="text-muted">{user.name} — Responsable réseau</p>
        </div>
        <button className="icon-btn" onClick={logout} aria-label="Déconnexion"><LogOut size={18} /></button>
      </header>

      <a className="save-btn open-web-btn" href={WEB_APP_URL} target="_blank" rel="noreferrer">
        <ExternalLink size={16} /> Ouvrir le tableau de bord réseau (web)
      </a>

      <div className="panel">
        <div className="panel-header-alt">
          <div className="panel-title"><Bell size={16} /> Notifications {unread > 0 && <span className="nav-badge">{unread}</span>}</div>
          {unread > 0 && <button className="add-btn" onClick={markAllRead}>Tout marquer comme lu</button>}
        </div>
        <div className="alert-list">
          {alerts.length === 0 && <p className="text-muted">Aucune notification.</p>}
          {alerts.map((alert) => (
            <div key={alert._id} className={`alert-item ${alert.type} ${alert.isRead ? '' : 'unread'}`}>
              <div className="alert-dot"></div>
              <div className="alert-body">
                <div className="alert-header">
                  <span className="alert-title">{alert.title}</span>
                  <span className="alert-time">{new Date(alert.timestamp).toLocaleString()}</span>
                </div>
                <p className="alert-msg">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
