import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Eye, EyeOff, UserPlus } from 'lucide-react';
import axios from 'axios';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    const fetchGoogleClientId = async () => {
      try {
        const response = await axios.get('/api/auth/google-client-id');
        if (response.data.clientId) setGoogleClientId(response.data.clientId);
      } catch (err) { console.error('Failed to fetch Google Client ID:', err); }
    };
    fetchGoogleClientId();
  }, []);

  useEffect(() => {
    if (!googleClientId || scriptLoadedRef.current) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && googleButtonRef.current) {
        scriptLoadedRef.current = true;
        window.google.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleResponse });
        window.google.accounts.id.renderButton(googleButtonRef.current, { theme: 'filled_black', size: 'large', width: 360, text: 'signup_with', shape: 'pill' });
      }
    };
    document.head.appendChild(script);
  }, [googleClientId]);

  const handleGoogleResponse = async (response) => {
    if (!response.credential) { setError('Error al obtener credenciales de Google'); return; }
    setError('');
    setGoogleLoading(true);
    try { await loginWithGoogle(response.credential); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.error || 'Error al registrarse con Google'); }
    finally { setGoogleLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try { await register(email, password, name); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.error || 'Error al registrarse'); }
    finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', color: 'white',
    fontSize: '14px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', fontSize: '11px', fontWeight: '500', color: '#9ca3af',
    marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a1a', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '16px', position: 'relative', overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <style>{`
        @keyframes floatP { 0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; } 25% { transform: translateY(-30px) translateX(15px); opacity: 0.7; } 50% { transform: translateY(-15px) translateX(-10px); opacity: 0.4; } 75% { transform: translateY(-40px) translateX(20px); opacity: 0.6; } }
        @keyframes glowPulse { 0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.15), 0 4px 30px rgba(0,0,0,0.3); } 50% { box-shadow: 0 0 40px rgba(139,92,246,0.25), 0 4px 30px rgba(0,0,0,0.3); } }
        @keyframes gradShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .reg-input:focus { border-color: rgba(139,92,246,0.5) !important; box-shadow: 0 0 0 2px rgba(139,92,246,0.2), 0 0 15px rgba(139,92,246,0.08); }
        .reg-submit:hover:not(:disabled) { box-shadow: 0 8px 25px rgba(139,92,246,0.3); transform: translateY(-1px); }
        .reg-submit:active:not(:disabled) { transform: translateY(0); }
        ::placeholder { color: #4b5563 !important; }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '600px', background: 'radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.05) 40%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Particles */}
      {[...Array(18)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', width: `${Math.random()*4+2}px`, height: `${Math.random()*4+2}px`, borderRadius: '50%', left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, background: i%2===0 ? 'rgba(139,92,246,0.2)' : 'rgba(99,102,241,0.15)', animation: `floatP ${Math.random()*8+6}s ease-in-out infinite`, animationDelay: `${Math.random()*5}s`, pointerEvents: 'none' }} />
      ))}

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '410px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', boxShadow: '0 8px 24px rgba(139,92,246,0.3)', marginBottom: '14px' }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '22px' }}>AP</span>
          </div>
          <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '700', margin: '0 0 4px 0' }}>Crear cuenta</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Empezá a automatizar tus campañas</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(18,18,42,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '32px', animation: 'glowPulse 3s ease-in-out infinite' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px 14px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: '1px' }} />
              <span style={{ color: '#fca5a5', fontSize: '13px' }}>{error}</span>
            </div>
          )}

          {/* Google Sign-Up (only when configured) */}
          {googleClientId && (
            <>
              <div ref={googleButtonRef} style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}></div>
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}><div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.06)' }}></div></div>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}><span style={{ padding: '0 12px', background: 'rgba(18,18,42,1)', color: '#6b7280', fontSize: '12px' }}>o registrate con email</span></div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Nombre completo</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="reg-input" style={inputStyle} placeholder="Tu nombre" required />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Correo electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="reg-input" style={inputStyle} placeholder="tu@email.com" required />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="reg-input" style={{ ...inputStyle, paddingRight: '40px' }} placeholder="Mínimo 6 caracteres" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#6b7280', display: 'flex' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Confirmar contraseña</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="reg-input" style={inputStyle} placeholder="Repetí tu contraseña" required />
            </div>
            <button type="submit" disabled={loading} className="reg-submit" style={{
              width: '100%', padding: '11px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1, #8b5cf6)', backgroundSize: '200% 200%',
              animation: 'gradShift 4s ease infinite', color: 'white', fontSize: '14px', fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
              transition: 'box-shadow 0.3s, transform 0.15s, opacity 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {loading ? (
                <><div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /><span>Creando cuenta...</span></>
              ) : (
                <><UserPlus size={16} /><span>Crear cuenta</span></>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '24px', fontSize: '14px' }}>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: '#a78bfa', fontWeight: '500', textDecoration: 'none' }}>Iniciar sesión</Link>
        </p>
      </div>

      {googleLoading && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#12122a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(139,92,246,0.3)', borderTop: '3px solid #8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#d1d5db', fontSize: '14px' }}>Registrando con Google...</span>
          </div>
        </div>
      )}
    </div>
  );
}
