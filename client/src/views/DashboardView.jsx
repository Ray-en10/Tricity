import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Zap, 
  Smartphone, 
  Scale, 
  Bell, 
  FileText, 
  Settings, 
  ArrowUpRight, 
  Plus,
  User,
  LogOut,
  Wind,
  Droplets,
  IceCream,
  WashingMachine,
  Trash2,
  Menu,
  X
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import ConsumptionChart from '../components/ConsumptionChart';
import UsageChart from '../components/UsageChart';
import CircuitBreakdown from '../components/CircuitBreakdown';
import HarmoniquesCard from '../components/HarmoniquesCard';
import NetworkView from './NetworkView';
import { COLOR_HEX, formatDeltaPercent } from '../utils/statusColor';


// Libellés des 4 rôles du cahier des charges (§3, §9bis) — 'admin' reste le
// nom technique du rôle back-office (voir Phase 1 du plan de remise à niveau).
const ROLE_LABELS = {
  admin: 'Back-office',
  installateur: 'Installateur',
  responsable_reseau: 'Responsable réseau',
  client: 'Propriétaire',
};

export default function DashboardView() {
  const { user, logout } = useAuth();
  const isNetworkManager = user.role === 'responsable_reseau';
  // Le responsable réseau arrive sur son dashboard multi-sites (§8bis).
  const [activeTab, setActiveTab] = useState(isNetworkManager ? 'network' : 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Nombre de notifications non lues, affiché en badge sur « Alertes » (§8).
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = React.useCallback(() => {
    axios.get(`${API_URL}/alerts/unread-count`)
      .then((res) => setUnreadCount(res.data.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshUnread();
    const timer = setInterval(refreshUnread, 60000);
    return () => clearInterval(timer);
  }, [refreshUnread, activeTab]);
  // Nouvelle forme de réponse de /api/stats/dashboard-stats (moteur de cycle
  // STEG, Phase 2) : { meterId, meterType, day: {...}, cycle: {...} }.
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (activeTab === 'dashboard' && !isNetworkManager) {
      const fetchStats = async () => {
        try {
          const res = await axios.get(`${API_URL}/stats/dashboard-stats`);
          setStats(res.data);
        } catch (err) {
          console.error('Error fetching stats:', err);
        }
      };
      fetchStats();
    }
  }, [activeTab, isNetworkManager]);

  const renderContent = () => {
    switch (activeTab) {
      case 'network': return <NetworkView />;
      case 'dashboard': return <Overview stats={stats} />;
      case 'consumption': return <Consommation />;
      case 'devices': return <Appareils />;
      case 'tiers': return <Paliers />;
      case 'alerts': return <Alertes onChange={refreshUnread} />;
      case 'settings': return <Parametres />;
      default: return isNetworkManager ? <NetworkView /> : <Overview stats={stats} />;
    }
  };

  return (
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Sidebar Overlay for mobile */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Zap fill="currentColor" size={28} />
            <span>WATT+</span>
          </div>
          <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="nav-links">
          {isNetworkManager ? (
            <>
              <NavItem active={activeTab === 'network'} onClick={() => { setActiveTab('network'); setIsSidebarOpen(false); }} icon={<LayoutDashboard size={20} />} label="Mon réseau" />
              <NavItem active={activeTab === 'alerts'} onClick={() => { setActiveTab('alerts'); setIsSidebarOpen(false); }} icon={<Bell size={20} />} label="Alertes" badge={unreadCount} />
              <NavItem active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} icon={<Settings size={20} />} label="Paramètres" />
            </>
          ) : (
            <>
              <NavItem active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} icon={<LayoutDashboard size={20} />} label="Tableau de bord" />
              <NavItem active={activeTab === 'consumption'} onClick={() => { setActiveTab('consumption'); setIsSidebarOpen(false); }} icon={<Zap size={20} />} label="Consommation" />
              <NavItem active={activeTab === 'devices'} onClick={() => { setActiveTab('devices'); setIsSidebarOpen(false); }} icon={<Smartphone size={20} />} label="Appareils" />
              <NavItem active={activeTab === 'tiers'} onClick={() => { setActiveTab('tiers'); setIsSidebarOpen(false); }} icon={<Scale size={20} />} label="Paliers & Tarifs" />
              <NavItem active={activeTab === 'alerts'} onClick={() => { setActiveTab('alerts'); setIsSidebarOpen(false); }} icon={<Bell size={20} />} label="Alertes" badge={unreadCount} />
              <NavItem active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} icon={<FileText size={20} />} label="Rapports" />
              <NavItem active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} icon={<Settings size={20} />} label="Paramètres" />
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="location-card">
            <p className="location-name">{user.location}</p>
            <p className="location-sub">Abonnement {user.subscription}</p>
            <button className="change-btn" onClick={logout}><LogOut size={14} /> Déconnexion</button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header>
          <div className="header-left">
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="header-info">
              <h1>{getTabTitle(activeTab)}</h1>
              <p className="text-muted">{getTabSubtitle(activeTab)}</p>
            </div>
          </div>
          
          <div className="header-actions">
            <div className="date-picker">
              <span>
                {stats?.cycle?.start && stats?.cycle?.end
                  ? `${new Date(stats.cycle.start).toLocaleDateString()} — ${new Date(stats.cycle.end).toLocaleDateString()}`
                  : 'Cycle STEG en cours'}
              </span>
            </div>
            <button className="export-btn">Exporter</button>
            <div className="user-profile">
              <div className="user-avatar">
                <User size={20} />
              </div>
              <div className="user-info">
                <p className="user-name">{user.name}</p>
                <p className="user-role">{ROLE_LABELS[user.role] || 'Propriétaire'}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="view-container fade-in">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, badge }) {
  return (
    <li className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {badge > 0 && <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>}
    </li>
  );
}

function getTabTitle(tab) {
  const titles = {
    dashboard: 'Tableau de bord',
    network: 'Mon réseau',
    consumption: 'Ma Consommation',
    devices: 'Mes Appareils',
    tiers: 'Paliers & Tarifs',
    alerts: 'Mes Alertes',
    settings: 'Paramètres',
    reports: 'Rapports'
  };
  return titles[tab] || 'Tableau de bord';
}

function getTabSubtitle(tab) {
    const subs = {
      dashboard: "Vue d'ensemble de votre consommation",
      network: "Supervision de tous les sites de votre réseau",
      consumption: "Analyse détaillée de vos dépenses énergétiques",
      devices: "Gérez vos équipements connectés",
      tiers: "Consultez et gérez les grilles tarifaires",
      alerts: "Historique de vos notifications intelligentes",
      settings: "Gérez votre compte et vos préférences",
      reports: "Générez des rapports d'activité"
    };
    return subs[tab] || '';
}

// Sub-components for views

function Overview({ stats }) {
  if (!stats) {
    return <p className="text-muted">Chargement des indicateurs…</p>;
  }

  const { day, cycle, meterId, meterType } = stats;
  const dayColorHex = day.color ? COLOR_HEX[day.color] : undefined;
  const cycleColorHex = cycle.color ? COLOR_HEX[cycle.color] : undefined;
  const cycleStart = cycle.start ? new Date(cycle.start) : null;
  const cycleEnd = cycle.end ? new Date(cycle.end) : null;

  const projectionMessage = {
    avance: 'En avance sur votre objectif — bon rythme, continuez ainsi.',
    retard: 'En retard sur votre objectif — la tendance actuelle dépasserait le palier visé en fin de cycle.',
    on_track: 'Conforme à votre objectif pour le moment.',
  };

  return (
    <div className="dashboard-view">
      <div className="dashboard-grid">
        <div className="main-charts">
          {/* Indicateur 1 — Journée en cours (§4.1) */}
          <div className="panel day-panel">
            <div className="panel-title">Journée en cours</div>
            <div className="day-indicator">
              <div className="day-circle" style={{ borderColor: dayColorHex || 'var(--text-muted)' }}>
                <span className="day-circle-value">{day.totalKwh}</span>
                <span className="day-circle-unit">kWh</span>
              </div>
              <div className="day-detail">
                <p>
                  Objectif journalier : {day.objectiveKwh != null ? `${day.objectiveKwh} kWh` : 'non défini'}
                </p>
                <p className={`delta-badge ${day.color ? `delta-${day.color}` : ''}`}>
                  {formatDeltaPercent(day.deltaPercent)} vs objectif
                </p>
              </div>
            </div>
          </div>

          {/* Indicateur 2 — Cumul du cycle STEG en cours (§6.2, §6.4) */}
          <div className="panel cycle-panel">
            <div className="panel-title">Cycle STEG en cours</div>
            {cycleStart && cycleEnd && (
              <p className="text-muted cycle-range">
                {cycleStart.toLocaleDateString()} — {cycleEnd.toLocaleDateString()}
              </p>
            )}
            <div className="cycle-content">
              <div className="cycle-gauge">
                <div className="gauge-value" style={{ borderColor: cycleColorHex || 'var(--text-muted)' }}>
                  <h3>{cycle.cumulKwh} kWh</h3>
                  <p>{cycle.cumulDT != null ? `${cycle.cumulDT.toFixed(3)} DT` : ''}</p>
                  {cycle.currentTierLabel && <span className="badge badge-yellow">{cycle.currentTierLabel}</span>}
                </div>
              </div>
              <div className="cycle-info">
                <p>
                  Objectif du cycle :{' '}
                  {cycle.objectiveKwh != null
                    ? `${cycle.objectiveKwh} kWh (${cycle.objectiveSource === 'manual' ? 'saisi manuellement' : 'calculé sur historique'})`
                    : 'non défini — saisissez un objectif manuel'}
                </p>
                <p className={`delta-badge ${cycle.color ? `delta-${cycle.color}` : ''}`}>
                  {formatDeltaPercent(cycle.deltaPercent)} vs attendu au prorata
                </p>
              </div>
            </div>
            {cycle.projection && (
              <div className="cycle-footer">
                <p>Projection fin de cycle : <strong>{cycle.projection.estimatedTotalKwh} kWh</strong></p>
                <p className={`text-${cycle.projection.status === 'retard' ? 'red' : cycle.projection.status === 'avance' ? 'green' : 'muted'}`}>
                  {projectionMessage[cycle.projection.status]}
                </p>
              </div>
            )}
          </div>

          {meterType === 'triphase' && <HarmoniquesCard meterId={meterId} />}
        </div>

        <div className="side-panels">
           <div className="panel">
              <div className="panel-title">Répartition par usage</div>
              <UsageChart />
           </div>

           <div className="panel">
              <div className="panel-title">Alertes récentes</div>
              <AlertList limit={2} />
           </div>
        </div>
      </div>

      <CircuitBreakdown />
    </div>
  );
}

function StatCard({ label, value, trend, icon, trendType }) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <div className="stat-icon-wrapper">{icon}</div>
        <div className={`stat-trend ${trendType === 'up' ? 'trend-up' : 'trend-down'}`}>
          {trend}
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// Module Views (Placeholders that we will expand)

function Consommation() {
    return (
        <div className="panel full-panel">
            <div className="panel-title">Historique de consommation</div>
            <ConsumptionChart height={400} />
            <div className="history-table">
                {/* Table implementation */}
                <p className="text-muted" style={{marginTop: '1rem'}}>Données détaillées pour le mois de Mai 2024</p>
            </div>
        </div>
    );
}

function Appareils() {
    const [devices, setDevices] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [users, setUsers] = useState([]);
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        type: 'Appliance',
        socketId: '',
        userId: '',
        brand: '',
        power: '',
        serialNumber: '',
        icon: 'Smartphone'
    });
    
    useEffect(() => {
        fetchDevices();
        if (user.role === 'admin') {
            axios.get(`${API_URL}/auth/users`).then(res => setUsers(res.data));
        }
    }, []);

    const fetchDevices = () => {
        axios.get(`${API_URL}/devices`).then(res => setDevices(res.data));
    };

    const toggleDevice = (id) => {
        axios.patch(`${API_URL}/devices/${id}/toggle`).then(res => {
            setDevices(devices.map(d => d._id === id ? res.data : d));
        });
    };

    const handleEditClick = (device) => {
        setEditingId(device._id);
        setFormData({
            name: device.name,
            type: device.type,
            socketId: device.socketId,
            userId: device.userId?._id || device.userId,
            brand: device.brand || '',
            power: device.power || '',
            serialNumber: device.serialNumber || '',
            icon: device.icon || 'Smartphone'
        });
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet appareil ?')) {
            axios.delete(`${API_URL}/devices/${id}`).then(() => {
                fetchDevices();
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const request = editingId 
            ? axios.patch(`${API_URL}/devices/${editingId}`, formData)
            : axios.post(`${API_URL}/devices`, formData);

        request.then(() => {
            setShowModal(false);
            setEditingId(null);
            fetchDevices();
            setFormData({ name: '', type: 'Appliance', socketId: '', userId: '', brand: '', power: '', serialNumber: '', icon: 'Smartphone' });
        });
    };

    return (
        <>
        <div className="devices-grid">
            {devices.map(device => (
                <div key={device._id} className="panel device-card">
                    <div className="device-header">
                        <div className="device-icon">
                            {getIcon(device.icon)}
                        </div>
                        <div className="device-actions">
                            {user.role === 'admin' && (
                                <>
                                    <button className="icon-btn edit" onClick={() => handleEditClick(device)}>
                                        <Settings size={16} />
                                    </button>
                                    <button className="icon-btn delete" onClick={() => handleDelete(device._id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            )}
                            <div className="toggle-switch" onClick={() => toggleDevice(device._id)}>
                                <div className={`switch ${device.status ? 'on' : 'off'}`}></div>
                            </div>
                        </div>
                    </div>
                    <div className="device-body">
                        <h3>{device.name}</h3>
                        <p className="device-subtitle">{device.brand} — {device.type}</p>
                        <div className="device-meta">
                            <span><Scale size={14} /> {device.socketId}</span>
                            {device.power && <span><Zap size={14} /> {device.power}W</span>}
                        </div>
                        {user.role === 'admin' && device.userId && (
                            <div className="user-badge">
                                <User size={12} /> {device.userId.name || 'Client'}
                            </div>
                        )}
                    </div>
                    <div className="device-footer">
                        <span className="consumption">{device.avgConsumption} kW</span>
                        <span className={`status-badge ${device.status ? 'active' : 'inactive'}`}>
                            {device.status ? 'Allumé' : 'Éteint'}
                        </span>
                    </div>
                </div>
            ))}
            <div className="panel add-device-card" onClick={() => {
                setEditingId(null);
                setFormData({ name: '', type: 'Appliance', socketId: '', userId: '', brand: '', power: '', serialNumber: '', icon: 'Smartphone' });
                setShowModal(true);
            }}>
                <Plus size={48} color="var(--text-muted)" />
                <p>Ajouter un appareil</p>
            </div>
        </div>

        {showModal && (
            <div className="modal-overlay">
                <div className="modal-card fade-in">
                    <div className="modal-header">
                        <h2>{editingId ? 'Modifier l\'appareil' : 'Nouvel Appareil'}</h2>
                        <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Nom de l'appareil</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Climatiseur Salon" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Marque</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Samsung, LG..." 
                                    value={formData.brand}
                                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>Type</label>
                                <select 
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                >
                                    <option value="Appliance">Appareil</option>
                                    <option value="HVAC">Climatisation</option>
                                    <option value="Lighting">Éclairage</option>
                                    <option value="Laundry">Lavage</option>
                                    <option value="Water">Eau</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Borne / Prise</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Prise A1" 
                                    value={formData.socketId}
                                    onChange={(e) => setFormData({...formData, socketId: e.target.value})}
                                    required 
                                />
                            </div>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>Puissance (Watts)</label>
                                <input 
                                    type="number" 
                                    placeholder="Ex: 2000" 
                                    value={formData.power}
                                    onChange={(e) => setFormData({...formData, power: e.target.value})}
                                />
                            </div>
                            <div className="form-group">
                                <label>N° de Série</label>
                                <input 
                                    type="text" 
                                    placeholder="Optionnel" 
                                    value={formData.serialNumber}
                                    onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                                />
                            </div>
                        </div>

                        {user.role === 'admin' && (
                            <div className="form-group">
                                <label>Affecter à un client</label>
                                <select 
                                    value={formData.userId}
                                    onChange={(e) => setFormData({...formData, userId: e.target.value})}
                                    required
                                >
                                    <option value="">Sélectionner un client</option>
                                    {users.map(u => (
                                        <option key={u._id} value={u._id}>{u.name} ({u.location})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button type="submit" className="save-btn">
                            {editingId ? 'Enregistrer les modifications' : 'Créer l\'appareil'}
                        </button>
                    </form>
                </div>
            </div>
        )}
        </>
    );
}

function getIcon(name) {
    switch(name) {
        case 'Wind': return <Wind />;
        case 'Droplets': return <Droplets />;
        case 'IceCream': return <IceCream />;
        case 'WashingMachine': return <WashingMachine />;
        default: return <Smartphone />;
    }
}

function Paliers() {
    const [tiers, setTiers] = useState([]);
    const [filters, setFilters] = useState({ usageType: 'domestic', counterPower: '6 kVA' });
    const [showModal, setShowModal] = useState(false);
    const [editingTier, setEditingTier] = useState(null);
    const { user } = useAuth();
    const [formData, setFormData] = useState({ label: '', min: 0, max: '', price: '', usageType: 'domestic', counterPower: '6 kVA' });
    
    useEffect(() => {
        fetchTiers();
    }, [filters, user]);

    const fetchTiers = () => {
        axios.get(`${API_URL}/tiers`).then(res => {
            // For admin, we show filtered results. For client, the backend already filtered.
            let filtered = res.data;
            if (user.role === 'admin') {
                filtered = res.data.filter(t => t.usageType === filters.usageType && t.counterPower === filters.counterPower);
            }
            setTiers(filtered);
        });
    };

    const handleEdit = (tier) => {
        setEditingTier(tier);
        setFormData({ ...tier, max: tier.max || '' });
        setShowModal(true);
    };

    const handleDeleteTier = (id) => {
        if (window.confirm('Supprimer ce palier ?')) {
            axios.delete(`${API_URL}/tiers/${id}`).then(() => fetchTiers());
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const request = editingTier 
            ? axios.patch(`${API_URL}/tiers/${editingTier._id}`, formData)
            : axios.post(`${API_URL}/tiers`, formData);
        
        request.then(() => {
            setShowModal(false);
            setEditingTier(null);
            fetchTiers();
        });
    };

    return (
        <>
        <div className="panel full-panel">
            <div className="panel-header-alt">
                <div className="panel-title">Configuration des Paliers & Tarifs</div>
                {user.role === 'admin' && (
                    <button className="add-btn" onClick={() => { setEditingTier(null); setFormData({...formData, usageType: filters.usageType, counterPower: filters.counterPower}); setShowModal(true); }}>
                        <Plus size={16} /> Ajouter un palier
                    </button>
                )}
            </div>

            {user.role === 'admin' && (
                <div className="filters-row">
                    <div className="filter-group">
                        <label>Usage</label>
                        <select value={filters.usageType} onChange={(e) => setFilters({...filters, usageType: e.target.value})}>
                            <option value="domestic">Domestique</option>
                            <option value="office">Bureau</option>
                            <option value="commercial">Commerce</option>
                            <option value="industrial">Grand Consommateur</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Puissance Compteur</label>
                        <select value={filters.counterPower} onChange={(e) => setFilters({...filters, counterPower: e.target.value})}>
                            <option value="2.5 kVA">2.5 kVA</option>
                            <option value="5 kVA">5 kVA</option>
                            <option value="6 kVA">6 kVA</option>
                            <option value="10 kVA">10 kVA</option>
                            <option value="15 kVA">15 kVA+</option>
                        </select>
                    </div>
                </div>
            )}

            <div className="tiers-list">
                {tiers.length > 0 ? tiers.map(tier => (
                    <div key={tier._id} className="tier-card-full">
                        <div className="tier-label-group">
                            <span className="tier-name">{tier.label}</span>
                            <span className="tier-range">{tier.min}{tier.max ? ` à ${tier.max}` : '+'} kWh</span>
                        </div>
                        <div className="tier-info-group">
                            <div className="tier-price">{tier.price.toFixed(3)} DT / kWh</div>
                            {user.role === 'admin' && (
                                <div className="device-actions">
                                    <button className="icon-btn edit" onClick={() => handleEdit(tier)}>
                                        <Settings size={14} />
                                    </button>
                                    <button className="icon-btn delete" onClick={() => handleDeleteTier(tier._id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="empty-state">Aucun palier configuré pour cette sélection.</div>
                )}
            </div>
        </div>

        {showModal && (
            <div className="modal-overlay">
                <div className="modal-card fade-in">
                    <div className="modal-header">
                        <h2>{editingTier ? 'Modifier le palier' : 'Nouveau Palier'}</h2>
                        <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Libellé (ex: Palier 1)</label>
                            <input type="text" value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})} required />
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Min (kWh)</label>
                                <input type="number" value={formData.min} onChange={(e) => setFormData({...formData, min: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Max (kWh)</label>
                                <input type="number" placeholder="Vide pour +" value={formData.max} onChange={(e) => setFormData({...formData, max: e.target.value})} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Prix (DT / kWh)</label>
                            <input type="number" step="0.001" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
                        </div>
                        <button type="submit" className="save-btn">{editingTier ? 'Mettre à jour' : 'Créer le palier'}</button>
                    </form>
                </div>
            </div>
        )}
        </>
    );
}

function AlertList({ limit, onChange }) {
    const [alerts, setAlerts] = useState([]);

    const load = React.useCallback(() => {
        axios.get(`${API_URL}/alerts`).then(res => {
            setAlerts(limit ? res.data.slice(0, limit) : res.data);
        });
    }, [limit]);

    useEffect(() => { load(); }, [load]);

    // Un clic sur une alerte non lue la marque comme lue (met à jour le badge).
    const markRead = (alert) => {
        if (alert.isRead) return;
        axios.patch(`${API_URL}/alerts/${alert._id}/read`).then(() => {
            load();
            if (onChange) onChange();
        });
    };

    return (
        <div className="alert-list">
            {alerts.length === 0 && <p className="text-muted">Aucune notification.</p>}
            {alerts.map(alert => (
                <div key={alert._id} className={`alert-item ${alert.type} ${alert.isRead ? '' : 'unread'}`} onClick={() => markRead(alert)}>
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
    );
}

function Alertes({ onChange }) {
    const [version, setVersion] = useState(0);

    const markAllRead = () => {
        axios.post(`${API_URL}/alerts/read-all`).then(() => {
            setVersion((v) => v + 1);
            if (onChange) onChange();
        });
    };

    return (
        <div className="panel full-panel">
            <div className="panel-header-alt">
                <div className="panel-title">Historique des alertes</div>
                <button className="add-btn" onClick={markAllRead}>Tout marquer comme lu</button>
            </div>
            <AlertList key={version} onChange={onChange} />
        </div>
    );
}

// Préférences de canaux de notification (§8) : chaque utilisateur choisit
// les canaux qu'il souhaite. Le SMS existe dans l'application mais est
// désactivé nativement côté serveur (pas de frais d'envoi) : la case est
// grisée tant que le serveur ne l'active pas.
function NotificationPreferences() {
    const [data, setData] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        axios.get(`${API_URL}/alerts/preferences`).then(res => setData(res.data));
    }, []);

    if (!data) return null;

    const save = (patch) => {
        setSaving(true);
        axios.patch(`${API_URL}/alerts/preferences`, patch)
            .then(res => setData(res.data))
            .finally(() => setSaving(false));
    };

    return (
        <div className="panel full-panel" style={{ marginTop: '1.5rem' }}>
            <div className="panel-title">Canaux de notification</div>
            <div className="profile-settings">
                <label className="setting-row">
                    <span>Notifications dans l'application (badge)</span>
                    <input type="checkbox" checked={data.prefs.inApp} disabled={saving}
                        onChange={(e) => save({ inApp: e.target.checked })} />
                </label>
                <label className="setting-row">
                    <span>E-mail</span>
                    <input type="checkbox" checked={data.prefs.email} disabled={saving}
                        onChange={(e) => save({ email: e.target.checked })} />
                </label>
                <label className="setting-row" title={data.smsAvailable ? '' : "Le canal SMS n'est pas activé sur ce serveur"}>
                    <span>
                        SMS {!data.smsAvailable && <span className="badge badge-muted">non activé</span>}
                    </span>
                    <input type="checkbox" checked={data.prefs.sms} disabled={saving || !data.smsAvailable}
                        onChange={(e) => save({ sms: e.target.checked })} />
                </label>
                <div className="setting-row">
                    <span>Téléphone (pour le SMS)</span>
                    <input type="tel" defaultValue={data.phone} placeholder="+216 …" disabled={!data.smsAvailable}
                        onBlur={(e) => e.target.value !== data.phone && save({ phone: e.target.value })} />
                </div>
            </div>
        </div>
    );
}

function Parametres() {
    const { user } = useAuth();
    return (
        <>
        <div className="panel full-panel">
            <div className="panel-title">Profil de l'utilisateur</div>
            <div className="profile-settings">
                <div className="setting-row">
                    <span>Nom complet</span>
                    <input type="text" defaultValue={user.name} />
                </div>
                <div className="setting-row">
                    <span>Email</span>
                    <input type="email" defaultValue={user.email} disabled />
                </div>
                <div className="setting-row">
                    <span>Type d'usage</span>
                    <input type="text" defaultValue={user.usageType} disabled />
                </div>
                <div className="setting-row">
                    <span>Puissance Compteur</span>
                    <input type="text" defaultValue={user.subscription} disabled />
                </div>
                <div className="setting-row">
                    <span>Localisation</span>
                    <input type="text" defaultValue={user.location} />
                </div>
                <button className="save-btn">Enregistrer les modifications</button>
            </div>
        </div>
        <NotificationPreferences />
        </>
    );
}
