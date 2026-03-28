import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import {
  FolderSearch, Play, CheckCircle, AlertCircle, Loader2,
  RefreshCw, Clock, Image, Film, Package, Link2, Trash2,
  ChevronDown, ChevronUp, Settings, Zap
} from 'lucide-react';

export default function AutoPublish() {
  const navigate = useNavigate();

  // State
  const [driveConfig, setDriveConfig] = useState(null);
  const [driveToken, setDriveToken] = useState('');
  const [parentFolderId, setParentFolderId] = useState('1ozQ4Kz3QTgRkDJuKYvH5hqiz6WbAg0iV');
  const [monthFolders, setMonthFolders] = useState({});
  const [newMonthName, setNewMonthName] = useState('');
  const [newMonthId, setNewMonthId] = useState('');

  const [scanResults, setScanResults] = useState(null);
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [history, setHistory] = useState([]);

  const [metaConnected, setMetaConnected] = useState(false);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingToken, setTestingToken] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedFolder, setExpandedFolder] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  // Load everything on mount
  useEffect(() => {
    Promise.all([
      loadDriveConfig(),
      loadHistory(),
      checkMeta(),
      loadProducts()
    ]).finally(() => setLoading(false));
  }, []);

  const loadDriveConfig = async () => {
    try {
      const res = await client.get('/auto-publish/drive-config');
      if (res.data) {
        setDriveConfig(res.data);
        if (res.data.drive_token) setDriveToken(res.data.drive_token);
        if (res.data.parent_folder_id) setParentFolderId(res.data.parent_folder_id);
        try {
          const mf = typeof res.data.month_folders === 'string'
            ? JSON.parse(res.data.month_folders)
            : res.data.month_folders;
          setMonthFolders(mf || {});
        } catch (e) {}
      }
    } catch (e) {
      // Not configured yet
    }
  };

  const loadHistory = async () => {
    try {
      const res = await client.get('/auto-publish/history');
      setHistory(res.data || []);
    } catch (e) {}
  };

  const checkMeta = async () => {
    try {
      const res = await client.get('/meta/status');
      setMetaConnected(res.data.connected);
    } catch (e) {}
  };

  const loadProducts = async () => {
    try {
      const res = await client.get('/products');
      setProducts(res.data || []);
    } catch (e) {}
  };

  const saveDriveConfig = async () => {
    setSavingConfig(true);
    setError('');
    setSuccess('');
    try {
      await client.post('/auto-publish/drive-config', {
        drive_token: driveToken,
        parent_folder_id: parentFolderId,
        month_folders: monthFolders
      });
      await loadDriveConfig();
      setSuccess('Configuracion de Drive guardada');
      setShowConfig(false);
    } catch (e) {
      setError(e.response?.data?.error || 'Error guardando configuracion');
    } finally {
      setSavingConfig(false);
    }
  };

  const testDriveToken = async () => {
    setTestingToken(true);
    setError('');
    try {
      const res = await client.post('/auto-publish/drive-config/test', { drive_token: driveToken });
      setSuccess(res.data.message);
    } catch (e) {
      setError(e.response?.data?.error || 'Token invalido');
    } finally {
      setTestingToken(false);
    }
  };

  const addMonthFolder = () => {
    if (newMonthName && newMonthId) {
      setMonthFolders({ ...monthFolders, [newMonthName]: newMonthId });
      setNewMonthName('');
      setNewMonthId('');
    }
  };

  const removeMonthFolder = (name) => {
    const updated = { ...monthFolders };
    delete updated[name];
    setMonthFolders(updated);
  };

  const scanDrive = async () => {
    setScanning(true);
    setError('');
    setScanResults(null);
    setSelectedFolders([]);
    try {
      const res = await client.get('/auto-publish/scan');
      setScanResults(res.data);
      // Auto-select all pending
      const pendingIds = (res.data.folders || [])
        .filter(f => f.status === 'pending')
        .map(f => f.folder_id);
      setSelectedFolders(pendingIds);
    } catch (e) {
      setError(e.response?.data?.error || 'Error escaneando Drive');
    } finally {
      setScanning(false);
    }
  };

  const toggleFolder = (folderId) => {
    setSelectedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  const publishSelected = async (activate = false) => {
    if (selectedFolders.length === 0) {
      setError('Selecciona al menos una carpeta');
      return;
    }
    setPublishing(true);
    setError('');
    setSuccess('');
    try {
      const res = await client.post('/auto-publish/publish', {
        folder_ids: selectedFolders,
        activate
      });
      const data = res.data;
      setSuccess(
        `Publicacion completada: ${data.published} exitosas, ${data.errors} errores`
      );
      await loadHistory();
      // Re-scan to update statuses
      await scanDrive();
    } catch (e) {
      setError(e.response?.data?.error || 'Error publicando');
    } finally {
      setPublishing(false);
    }
  };

  const deleteHistoryEntry = async (id) => {
    try {
      await client.delete(`/auto-publish/history/${id}`);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-violet-600" size={32} />
      </div>
    );
  }

  const driveReady = driveConfig?.drive_token;
  const canPublish = metaConnected && driveReady && selectedFolders.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Auto Publicar</h1>
          <p className="text-gray-600 mt-1">
            Escanea Google Drive y publica campanas automaticamente
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            <Settings size={16} />
            <span>Configurar</span>
          </button>
          <button
            onClick={scanDrive}
            disabled={!driveReady || scanning}
            className="flex items-center space-x-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition disabled:opacity-50 text-sm font-semibold"
          >
            {scanning ? <Loader2 className="animate-spin" size={16} /> : <FolderSearch size={16} />}
            <span>{scanning ? 'Escaneando...' : 'Escanear Drive'}</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {!metaConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-yellow-800">Meta no conectado</p>
            <p className="text-sm text-yellow-700 mt-1">
              Conecta tu cuenta Meta en{' '}
              <button onClick={() => navigate('/dashboard/integration')} className="underline font-semibold">
                Integracion
              </button>{' '}
              para poder publicar.
            </p>
          </div>
        </div>
      )}

      {!driveReady && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
          <Link2 className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-blue-800">Google Drive no configurado</p>
            <p className="text-sm text-blue-700 mt-1">
              Configura el acceso a Google Drive para escanear carpetas de creativos.
            </p>
            <button
              onClick={() => setShowConfig(true)}
              className="mt-2 text-sm font-semibold text-blue-700 underline"
            >
              Configurar ahora
            </button>
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
          <Package className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-orange-800">Sin productos configurados</p>
            <p className="text-sm text-orange-700 mt-1">
              Agrega tus productos en{' '}
              <button onClick={() => navigate('/dashboard/settings')} className="underline font-semibold">
                Configuracion
              </button>{' '}
              para que el sistema detecte automaticamente que producto corresponde a cada carpeta.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-sm text-red-700 flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 text-sm text-green-700 flex items-center space-x-2">
          <CheckCircle size={16} />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-600">&times;</button>
        </div>
      )}

      {/* Drive Config Panel (collapsible) */}
      {showConfig && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuracion de Google Drive</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Token de Google Drive</label>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={driveToken}
                  onChange={(e) => setDriveToken(e.target.value)}
                  placeholder="Pega tu access_token de Google OAuth Playground"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none"
                />
                <button
                  onClick={testDriveToken}
                  disabled={!driveToken || testingToken}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  {testingToken ? <Loader2 className="animate-spin" size={14} /> : 'Probar'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Obtener en <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener" className="text-violet-600 underline">OAuth Playground</a> con scope Drive API v3
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Carpeta Principal</label>
              <input
                value={parentFolderId}
                onChange={(e) => setParentFolderId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none"
              />
            </div>

            {/* Month folders */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Carpetas por Mes</label>
              <div className="space-y-2 mb-2">
                {Object.entries(monthFolders).map(([name, id]) => (
                  <div key={name} className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-gray-800 flex-1">{name}</span>
                    <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">{id}</span>
                    <button onClick={() => removeMonthFolder(name)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  value={newMonthName}
                  onChange={(e) => setNewMonthName(e.target.value)}
                  placeholder="ej: abril-2026"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  value={newMonthId}
                  onChange={(e) => setNewMonthId(e.target.value)}
                  placeholder="ID de carpeta"
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={addMonthFolder}
                  disabled={!newMonthName || !newMonthId}
                  className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  Agregar
                </button>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={saveDriveConfig}
                disabled={savingConfig}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50"
              >
                {savingConfig ? 'Guardando...' : 'Guardar Configuracion'}
              </button>
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan Results */}
      {scanResults && (
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Carpetas Encontradas ({scanResults.total})
              </h2>
              <p className="text-sm text-gray-500">
                {scanResults.pending} pendientes · {scanResults.published} publicadas
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {selectedFolders.length > 0 && (
                <span className="text-sm text-violet-600 font-medium">
                  {selectedFolders.length} seleccionadas
                </span>
              )}
              <button
                onClick={() => publishSelected(false)}
                disabled={!canPublish || publishing}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 transition"
              >
                {publishing ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                <span>{publishing ? 'Publicando...' : 'Publicar (Pausadas)'}</span>
              </button>
              <button
                onClick={() => publishSelected(true)}
                disabled={!canPublish || publishing}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition"
              >
                <Zap size={14} />
                <span>Publicar y Activar</span>
              </button>
            </div>
          </div>

          {scanResults.folders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <FolderSearch className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="font-medium">No se encontraron carpetas con creativos</p>
              <p className="text-sm mt-1">Asegurate de que la estructura sea: mes/fecha/producto/archivos</p>
            </div>
          ) : (
            <div className="divide-y">
              {scanResults.folders.map((folder) => {
                const isPending = folder.status === 'pending';
                const isSelected = selectedFolders.includes(folder.folder_id);
                const isExpanded = expandedFolder === folder.folder_id;

                return (
                  <div key={folder.folder_id} className={`${isPending ? '' : 'bg-gray-50 opacity-70'}`}>
                    <div className="flex items-center px-4 py-3 hover:bg-gray-50">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFolder(folder.folder_id)}
                        disabled={!isPending}
                        className="mr-3 rounded text-violet-600 focus:ring-violet-500"
                      />

                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                          folder.creative_type === 'Videos'
                            ? 'bg-blue-100 text-blue-600'
                            : folder.creative_type === 'Mixto'
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-green-100 text-green-600'
                      }`}>
                        {folder.creative_type === 'Videos' ? <Film size={16} /> : <Image size={16} />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{folder.full_path}</p>
                          {folder.status === 'published' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Publicada
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 mt-0.5">
                          <span className="text-xs text-gray-500">
                            {folder.product?.name || 'Producto no detectado'}
                          </span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{folder.creative_type}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{folder.files_count} archivos</span>
                        </div>
                      </div>

                      {/* Expand */}
                      <button
                        onClick={() => setExpandedFolder(isExpanded ? null : folder.folder_id)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {/* Expanded file list */}
                    {isExpanded && (
                      <div className="px-4 pb-3 pl-16">
                        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                          {folder.files.map((file) => (
                            <div key={file.id} className="flex items-center space-x-2 text-xs">
                              {file.type === 'video' ? (
                                <Film size={12} className="text-blue-500" />
                              ) : (
                                <Image size={12} className="text-green-500" />
                              )}
                              <span className="text-gray-700 truncate">{file.name}</span>
                              <span className="text-gray-400">
                                {file.size ? `${(parseInt(file.size) / 1024 / 1024).toFixed(1)}MB` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                        {!folder.product && (
                          <p className="text-xs text-orange-600 mt-2">
                            No se detecto producto. Agrega "{folder.folder_name}" como producto en Configuracion.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Publishing History */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Historial de Publicaciones</h2>
          <button onClick={loadHistory} className="text-gray-400 hover:text-gray-600">
            <RefreshCw size={16} />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Clock className="mx-auto mb-3" size={32} />
            <p className="text-sm">Sin publicaciones aun</p>
          </div>
        ) : (
          <div className="divide-y">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center px-4 py-3">
                <div className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${
                  entry.status === 'published' ? 'bg-green-500' :
                  entry.status === 'error' ? 'bg-red-500' :
                  entry.status === 'publishing' ? 'bg-yellow-500' : 'bg-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {entry.campaign_name || entry.folder_name}
                  </p>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-xs text-gray-500">{entry.product}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{entry.creative_type}</span>
                    {entry.ads_count > 0 && (
                      <>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{entry.ads_count} ads</span>
                      </>
                    )}
                    {entry.meta_campaign_id && (
                      <>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500 font-mono">ID: {entry.meta_campaign_id}</span>
                      </>
                    )}
                  </div>
                  {entry.error_message && (
                    <p className="text-xs text-red-600 mt-1">{entry.error_message}</p>
                  )}
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {new Date(entry.created_at).toLocaleDateString('es-AR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                  <button
                    onClick={() => deleteHistoryEntry(entry.id)}
                    className="text-gray-300 hover:text-red-500 transition"
                    title="Eliminar (permite re-publicar)"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
