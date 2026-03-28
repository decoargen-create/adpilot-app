import { useState, useEffect } from 'react';
import client from '../../api/client';
import { CheckCircle, AlertCircle, ExternalLink, Zap, RefreshCw, Key, ClipboardPaste } from 'lucide-react';

export default function Integration() {
  const [status, setStatus] = useState({
    connected: false,
    userName: null,
    adAccounts: [],
    tokenExpires: null
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    fetchStatus();

    // Check if we just came back from OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('meta_connected') === 'true') {
      setMessage({ type: 'success', text: 'Cuenta Meta conectada exitosamente!' });
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setMessage(''), 5000);
    }
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await client.get('/meta/status');
      setStatus(res.data);
    } catch (error) {
      // Fallback to old endpoint
      try {
        const res = await client.get('/integrations/meta/status');
        setStatus({
          connected: res.data.connected,
          userName: null,
          adAccounts: [],
          tokenExpires: null
        });
      } catch (e) {
        console.error('Error fetching status:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthConnect = async () => {
    try {
      const res = await client.get('/meta/auth');
      // Redirect to Meta OAuth
      window.location.href = res.data.authUrl;
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al iniciar conexion con Meta. Verifica que el servidor este configurado.' });
    }
  };

  const handleManualToken = async () => {
    if (!manualToken.trim()) {
      setMessage({ type: 'error', text: 'Pegá el token del Graph API Explorer' });
      return;
    }
    setSavingToken(true);
    try {
      const res = await client.post('/meta/manual-token', { access_token: manualToken.trim() });
      setStatus({
        connected: true,
        userName: res.data.userName,
        adAccounts: res.data.adAccounts,
        tokenExpires: res.data.tokenExpires
      });
      setManualToken('');
      setShowManualInput(false);
      setMessage({ type: 'success', text: `Conectado como ${res.data.userName}! Se detectaron ${res.data.adAccounts.length} cuenta(s) publicitaria(s).` });
      setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      const errMsg = error.response?.data?.error || 'Error al guardar el token';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setSavingToken(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Estas seguro de que deseas desconectar tu cuenta Meta?')) {
      try {
        await client.delete('/meta/disconnect');
        setStatus({ connected: false, userName: null, adAccounts: [], tokenExpires: null });
        setMessage({ type: 'success', text: 'Cuenta Meta desconectada' });
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage({ type: 'error', text: 'Error al desconectar' });
      }
    }
  };

  if (loading) {
    return <div className="text-center py-12">Cargando...</div>;
  }

  const tokenDate = status.tokenExpires ? new Date(status.tokenExpires) : null;
  const daysLeft = tokenDate ? Math.ceil((tokenDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Integración Meta Ads</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Connection Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 border-l-4 ${status.connected ? 'border-green-500' : 'border-yellow-500'}`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estado de Conexión</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {status.connected ? (
                  <>
                    <CheckCircle className="text-green-600" size={24} />
                    <div>
                      <p className="font-semibold text-green-600 dark:text-green-400">Conectado</p>
                      {status.userName && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">{status.userName}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="text-yellow-600" size={24} />
                    <div>
                      <p className="font-semibold text-yellow-600 dark:text-yellow-400">No conectado</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Conexión requerida</p>
                    </div>
                  </>
                )}
              </div>

              {status.connected && daysLeft !== null && (
                <div className={`p-3 rounded-lg ${daysLeft > 7 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Token expira en:</p>
                  <p className={`font-semibold text-sm ${daysLeft > 7 ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
                    {daysLeft} días
                  </p>
                </div>
              )}

              {status.connected && (
                <div className="space-y-2">
                  <button
                    onClick={handleOAuthConnect}
                    className="w-full flex items-center justify-center space-x-2 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-lg transition font-semibold"
                  >
                    <RefreshCw size={16} />
                    <span>Renovar Token</span>
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="w-full text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition font-semibold"
                  >
                    Desconectar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ad Accounts */}
          {status.connected && status.adAccounts.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cuentas Publicitarias</h3>
              <div className="space-y-2">
                {status.adAccounts.map((acc, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg">
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{acc.name || 'Sin nombre'}</p>
                    <p className="font-mono text-xs text-gray-600 dark:text-gray-300">{acc.id}</p>
                    {acc.currency && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{acc.currency} | {acc.timezone_name}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Connection */}
        <div className="lg:col-span-2">
          {message && (
            <div
              className={`p-4 rounded-lg mb-6 flex items-start space-x-3 ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
              ) : (
                <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
              )}
              <p className={message.type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                {message.text}
              </p>
            </div>
          )}

          {!status.connected && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8 mb-6 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Conecta tu cuenta de Meta</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                Al conectar tu cuenta, AdPilot podrá crear campañas, subir creativos y publicar
                anuncios automáticamente en tu nombre.
              </p>
              <button
                onClick={handleOAuthConnect}
                className="inline-flex items-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:shadow-lg transition"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Conectar con Meta</span>
              </button>
              <p className="text-xs text-gray-500 mt-4">
                Serás redirigido a Facebook para autorizar el acceso
              </p>

              {/* Divider */}
              <div className="flex items-center mt-6 mb-4">
                <div className="flex-1 border-t border-gray-300 dark:border-slate-600"></div>
                <span className="px-4 text-sm text-gray-500 dark:text-gray-400">o</span>
                <div className="flex-1 border-t border-gray-300 dark:border-slate-600"></div>
              </div>

              {/* Manual Token Option */}
              {!showManualInput ? (
                <button
                  onClick={() => setShowManualInput(true)}
                  className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 px-6 py-2 rounded-lg font-medium transition"
                >
                  <Key size={18} />
                  <span>Ingresar Token manualmente</span>
                </button>
              ) : (
                <div className="max-w-lg mx-auto text-left bg-gray-50 dark:bg-slate-700 p-4 rounded-lg border border-gray-200 dark:border-slate-600">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Token desde Graph API Explorer</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    1. Abrí{' '}
                    <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
                      Graph API Explorer
                    </a>
                    <br />
                    2. Seleccioná la app "AdPilot"<br />
                    3. Agregá permisos: <span className="font-mono text-xs">ads_management, ads_read, business_management, pages_read_engagement</span><br />
                    4. Hacé click en "Generate Access Token" y pegalo acá
                  </p>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Pegar access token aquí..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleManualToken}
                      disabled={savingToken}
                      className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 dark:bg-green-700 dark:hover:bg-green-600 dark:disabled:bg-green-800 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
                    >
                      <ClipboardPaste size={16} />
                      <span>{savingToken ? 'Verificando...' : 'Guardar'}</span>
                    </button>
                  </div>
                  <button
                    onClick={() => { setShowManualInput(false); setManualToken(''); }}
                    className="mt-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          {status.connected && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Conexión Activa</h2>
              {status.adAccounts.length > 0 ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-300">
                        Tu cuenta de Meta está conectada correctamente
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                        AdPilot puede crear y gestionar campañas en {status.adAccounts.length} cuenta(s) publicitaria(s).
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-3">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                      <p className="font-semibold text-green-800 dark:text-green-300">
                        Tu cuenta de Meta está conectada correctamente
                      </p>
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={22} />
                      <div>
                        <p className="font-semibold text-red-800 dark:text-red-200">
                          No se encontraron cuentas publicitarias
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          Para crear campañas necesitás al menos una cuenta publicitaria. Podés crearla desde{' '}
                          <a href="https://business.facebook.com/settings/ad-accounts" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Meta Business Suite</a>.
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                          Si ya tenés una, probá desconectar y volver a conectar para actualizar los permisos.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* How it works */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-sm p-6 border border-blue-200 dark:border-blue-700">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4">Como funciona</h3>
            <ol className="space-y-3 text-blue-800 dark:text-blue-300">
              <li className="flex space-x-3">
                <span className="font-bold flex-shrink-0 bg-blue-200 dark:bg-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                <span>Hace click en "Conectar con Meta" y autorizas el acceso</span>
              </li>
              <li className="flex space-x-3">
                <span className="font-bold flex-shrink-0 bg-blue-200 dark:bg-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                <span>AdPilot obtiene acceso a tus cuentas publicitarias</span>
              </li>
              <li className="flex space-x-3">
                <span className="font-bold flex-shrink-0 bg-blue-200 dark:bg-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                <span>Subis tus creativos y seleccionas una campana base</span>
              </li>
              <li className="flex space-x-3">
                <span className="font-bold flex-shrink-0 bg-blue-200 dark:bg-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                <span>AdPilot duplica la campana base, reemplaza los creativos y la publica automaticamente</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
