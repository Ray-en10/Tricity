import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client',
    adminSecret: '',
    location: '',
    subscription: '6 kVA',
    usageType: 'domestic'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(`🚀 Formulaire soumis: ${isLogin ? 'Connexion' : 'Inscription'} pour ${formData.email}`);
    
    // Client-side validation
    if (!isLogin && formData.password.length < 6) {
        return setError('Le mot de passe doit faire au moins 6 caractères');
    }
    if (!isLogin && !formData.name) {
        return setError('Le nom est obligatoire');
    }

    const cleanEmail = formData.email.trim();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        const data = await login(cleanEmail, formData.password);
        console.log('✅ Connexion réussie:', data);
      } else {
        const data = await register({ ...formData, email: cleanEmail });
        console.log('✅ Inscription réussie:', data);
      }
    } catch (err) {
      console.error('❌ Erreur lors de l\'auth:', err);
      const msg = err.response?.data?.message || 'Une erreur réseau est survenue. Vérifiez que le serveur est lancé.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="login-container">
      <div className="login-card fade-in">
        <div className="login-logo">
          <Zap fill="#3CCF4E" color="#3CCF4E" size={48} />
          <h1>WATT+</h1>
        </div>
        <p className="login-subtitle">
          {isLogin ? 'Maîtrisez votre énergie, contrôlez votre budget.' : 'Créez votre compte en quelques secondes.'}
        </p>
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <User size={18} className="input-icon" />
              <input 
                type="text" 
                name="name"
                placeholder="Nom complet" 
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          )}
          
          <div className="form-group">
            <Mail size={18} className="input-icon" />
            <input 
              type="email" 
              name="email"
              placeholder="Email" 
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <Lock size={18} className="input-icon" />
            <input 
              type="password" 
              name="password"
              placeholder="Mot de passe" 
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group select-group">
                <ShieldCheck size={18} className="input-icon" />
                <select name="role" value={formData.role} onChange={handleChange}>
                  <option value="client">Client (Maison/Local)</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              {formData.role === 'client' && (
                <>
                  <div className="form-group">
                    <User size={18} className="input-icon" />
                    <input 
                      type="text" 
                      name="location"
                      placeholder="Adresse / Localisation" 
                      value={formData.location}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-grid" style={{marginBottom: '1rem'}}>
                    <div className="form-group select-group">
                      <select name="usageType" value={formData.usageType} onChange={handleChange}>
                        <option value="domestic">Usage Domestique</option>
                        <option value="office">Bureau</option>
                        <option value="commercial">Commerce</option>
                        <option value="industrial">Grand Consommateur</option>
                      </select>
                    </div>
                    <div className="form-group select-group">
                      <select name="subscription" value={formData.subscription} onChange={handleChange}>
                        <option value="2.5 kVA">2.5 kVA</option>
                        <option value="5 kVA">5 kVA</option>
                        <option value="6 kVA">6 kVA</option>
                        <option value="10 kVA">10 kVA</option>
                        <option value="15 kVA">15 kVA+</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {!isLogin && formData.role === 'admin' && (
            <div className="form-group">
              <Lock size={18} className="input-icon" />
              <input 
                type="password" 
                name="adminSecret"
                placeholder="Clé secrète Admin" 
                value={formData.adminSecret}
                onChange={handleChange}
                required
              />
            </div>
          )}
          
          {error && <p className="error-msg">{error}</p>}
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : 'Créer un compte')} 
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
        
        <div className="auth-toggle">
          <p>
            {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
            <span onClick={() => { 
              setIsLogin(!isLogin); 
              setError(''); 
              setFormData({ ...formData, email: '', password: '', name: '', adminSecret: '', location: '', subscription: '6 kVA', usageType: 'domestic' });
            }}>
              {isLogin ? ' Créer un compte' : ' Se connecter'}
            </span>
          </p>
        </div>

        {isLogin && (
          <div className="demo-info">
            <p style={{ fontWeight: 600, color: 'var(--text-color)', marginBottom: '0.25rem' }}>
              Identifiants de démonstration (cliquez pour remplir) :
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, email: 'admin@watt.tn', password: 'admin' }))}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'var(--text-color)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                <span>👑 <strong>Admin :</strong> admin@watt.tn</span>
                <span style={{ color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 600 }}>Remplir ➔</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, email: 'rayen@gmail.com', password: 'rayen' }))}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'var(--text-color)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                <span>👤 <strong>Client :</strong> rayen@gmail.com</span>
                <span style={{ color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 600 }}>Remplir ➔</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
