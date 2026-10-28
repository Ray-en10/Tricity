import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, IS_MOBILE, VARIANT_METER_TYPE, VARIANT_LABEL } from '../config';
import { useAuth } from '../context/AuthContext';
import NotificationsOnlyView from './NotificationsOnlyView';

const TYPE_LABEL = { monophase: 'monophasé', triphase: 'triphasé' };

// Garde de distribution (§9) :
//  - web : aucune restriction ;
//  - mobile, responsable réseau : écran de notifications uniquement ;
//  - mobile-mono / mobile-tri, client : l'app ne sert que SON type de
//    compteur — sinon on invite à installer l'autre application ;
//  - mobile, back-office / installateur : accès complet (usage terrain).
export default function VariantGuard({ children }) {
  const { user, logout } = useAuth();
  const [state, setState] = useState({ loading: true, meterType: null });

  const needsMeterCheck = IS_MOBILE && VARIANT_METER_TYPE && user.role === 'client';

  useEffect(() => {
    if (!needsMeterCheck) return;
    axios.get(`${API_URL}/meters`)
      .then((res) => setState({ loading: false, meterType: res.data[0]?.type || null }))
      .catch(() => setState({ loading: false, meterType: null }));
  }, [needsMeterCheck]);

  if (IS_MOBILE && user.role === 'responsable_reseau') return <NotificationsOnlyView />;

  if (needsMeterCheck) {
    if (state.loading) {
      return <div className="loading-screen"><div className="spinner"></div></div>;
    }
    // Pas encore de compteur installé : on laisse passer (écran d'attente de l'installateur).
    if (state.meterType && state.meterType !== VARIANT_METER_TYPE) {
      return (
        <div className="wrong-app">
          <h2>Mauvaise application</h2>
          <p>
            Votre compteur est <strong>{TYPE_LABEL[state.meterType]}</strong>, alors que cette application
            ({VARIANT_LABEL}) est dédiée aux compteurs <strong>{TYPE_LABEL[VARIANT_METER_TYPE]}</strong>.
          </p>
          <p>
            Installez l'application <strong>Tricity {state.meterType === 'triphase' ? 'Triphasé' : 'Monophasé'}</strong>{' '}
            pour accéder à votre tableau de bord.
          </p>
          <button className="save-btn" onClick={logout}>Se déconnecter</button>
        </div>
      );
    }
  }

  return children;
}
