import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useCurrency } from '../../context/CurrencyContext';
import {
  BarChart3,
  Zap,
  DollarSign,
  Trash2,
  RefreshCw,
  TrendingUp,
  ShoppingCart,
  Plus,
  ExternalLink,
  Archive,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [metricsMap, setMetricsMap] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [archiving, setArchiving] = useState(null);
  const navigate = useNavigate();
  const { formatPrice, currencySymbol } = useCurrency();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const campaignsRes = await client.get('/campaigns');
      setCampaigns(campaignsRes.data);
      await fetchMetrics(campaignsRes.data);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async (campaignsList = campaigns) => {
    setMetricsLoading(true);
    try {
      const metricsRes = await client.get('/campaigns/metrics');
      const metricsById = {};
      metricsRes.data.forEach((campaign) => {
        metricsById[campaign.id] = campaign;
      });
      setMetricsMap(metricsById);
      calculateStats(campaignsList, metricsById);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  const calculateStats = (campaignsList, metricsData) => {
    // Only count non-archived campaigns in stats
    const nonArchivedCampaigns = campaignsList.filter(c => !c.archived);

    if (!nonArchivedCampaigns.length) {
      setStats({
        total: 0,
        active: 0,
        totalSpend: 0,
        totalPurchases: 0,
        avgCPA: 0,
        avgROAS: 0,
      });
      return;
    }

    let totalSpend = 0;
    let totalPurchases = 0;
    let activeCPA = [];
    let activeROAS = [];
    let activeCount = 0;

    nonArchivedCampaigns.forEach((campaign) => {
      const metrics = metricsData[campaign.id];
      if (metrics && metrics.metrics) {
        totalSpend += metrics.metrics.spend || 0;
        totalPurchases += metrics.metrics.purchases || 0;
        if (metrics.metrics.costPerPurchase) {
          activeCPA.push(metrics.metrics.costPerPurchase);
        }
        if (metrics.metrics.purchaseRoas) {
          activeROAS.push(metrics.metrics.purchaseRoas);
        }
        if (metrics.meta_status === 'ACTIVE') {
          activeCount++;
        }
      }
    });

    const avgCPA = activeCPA.length > 0 ? activeCPA.reduce((a, b) => a + b, 0) / activeCPA.length : 0;
    const avgROAS = activeROAS.length > 0 ? activeROAS.reduce((a, b) => a + b, 0) / activeROAS.length : 0;

    setStats({
      total: nonArchivedCampaigns.length,
      active: activeCount,
      totalSpend,
      totalPurchases,
      avgCPA,
      avgROAS,
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const syncRes = await client.post('/campaigns/sync');
      const deletedCount = syncRes.data.deletedCount || 0;
      const updatedCount = syncRes.data.updatedCount || 0;
      setSyncMessage({
        type: 'success',
        text: `Sincronización completada. ${deletedCount} campaña${deletedCount !== 1 ? 's' : ''} eliminada${deletedCount !== 1 ? 's' : ''} en Meta detectada${deletedCount !== 1 ? 's' : ''}, ${updatedCount} estado${updatedCount !== 1 ? 's' : ''} actualizado${updatedCount !== 1 ? 's' : ''}.`,
      });
      await fetchData();
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (error) {
      console.error('Error syncing campaigns:', error);
      setSyncMessage({
        type: 'error',
        text: 'Error al sincronizar. Por favor intenta de nuevo.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta campaña?')) {
      try {
        await client.delete(`/campaigns/${id}`);
        setCampaigns(campaigns.filter((c) => c.id !== id));
        const newMetrics = { ...metricsMap };
        delete newMetrics[id];
        setMetricsMap(newMetrics);
        calculateStats(campaigns.filter((c) => c.id !== id), newMetrics);
      } catch (error) {
        alert('Error al eliminar la campaña');
      }
    }
  };

  const handleArchive = async (id) => {
    setArchiving(id);
    try {
      await client.post(`/campaigns/${id}/archive`);
      setCampaigns(
        campaigns.map((c) =>
          c.id === id ? { ...c, archived: 1 } : c
        )
      );
      calculateStats(
        campaigns.map((c) =>
          c.id === id ? { ...c, archived: 1 } : c
        ),
        metricsMap
      );
    } catch (error) {
      console.error('Error archiving campaign:', error);
      alert('Error al archivar la campaña');
    } finally {
      setArchiving(null);
    }
  };

  const handleUnarchive = async (id) => {
    setArchiving(id);
    try {
      await client.post(`/campaigns/${id}/unarchive`);
      setCampaigns(
        campaigns.map((c) =>
          c.id === id ? { ...c, archived: 0 } : c
        )
      );
      calculateStats(
        campaigns.map((c) =>
          c.id === id ? { ...c, archived: 0 } : c
        ),
        metricsMap
      );
    } catch (error) {
      console.error('Error unarchiving campaign:', error);
      alert('Error al desarchiver la campaña');
    } finally {
      setArchiving(null);
    }
  };

  const getMetaStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      case 'DELETED':
        return 'bg-red-100 text-red-800';
      case 'deleted_in_meta':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMetaStatusLabel = (status) => {
    const labels = {
      ACTIVE: 'Activa',
      PAUSED: 'Pausada',
      ARCHIVED: 'Archivada',
      DELETED: 'Eliminada',
      deleted_in_meta: 'Eliminada en Meta',
    };
    return labels[status] || status;
  };

  const calculateDaysActive = (startTime) => {
    if (!startTime) return '-';
    const start = new Date(startTime);
    const now = new Date();
    const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hoy';
    if (days === 1) return '1 día';
    return `${days} días`;
  };

  const openInAdsManager = (metaCampaignId) => {
    window.open(
      `https://www.facebook.com/adsmanager/manage/campaigns?act=1081340700530914&selected_campaign_ids=${metaCampaignId}`,
      '_blank'
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin">
          <RefreshCw className="text-violet-600" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campañas</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center space-x-2 bg-white dark:bg-slate-800 border border-violet-600 text-violet-600 px-4 py-2 rounded-lg hover:bg-violet-50 dark:hover:bg-slate-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
              <span>Sincronizar con Meta</span>
            </button>
            <button
              onClick={() => navigate('/dashboard/upload')}
              className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-indigo-700 text-white px-6 py-2 rounded-lg hover:shadow-lg transition font-semibold"
            >
              <Plus size={20} />
              <span>Nueva campaña</span>
            </button>
          </div>
        </div>

        {/* Sync Message */}
        {syncMessage && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${
              syncMessage.type === 'success'
                ? 'bg-green-50 dark:bg-slate-900 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-900'
                : 'bg-red-50 dark:bg-slate-900 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {syncMessage.type === 'success' ? (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  ✓
                </div>
              ) : (
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  !
                </div>
              )}
            </div>
            <p className="text-sm font-medium">{syncMessage.text}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 border-l-4 border-violet-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Total de Campañas</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.total || 0}</p>
              </div>
              <BarChart3 className="text-violet-500" size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Campañas Activas</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.active || 0}</p>
              </div>
              <Zap className="text-green-500" size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Gasto Total</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(stats?.totalSpend || 0)}
                </p>
              </div>
              <DollarSign className="text-orange-500" size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Compras Totales</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{Math.round(stats?.totalPurchases || 0)}</p>
              </div>
              <ShoppingCart className="text-blue-500" size={24} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 border-l-4 border-indigo-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">ROAS Promedio</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{(stats?.avgROAS || 0).toFixed(2)}x</p>
              </div>
              <TrendingUp className="text-indigo-500" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Active Campaigns Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden mb-6">
        {metricsLoading && (
          <div className="absolute inset-0 bg-white dark:bg-slate-800 bg-opacity-50 flex justify-center items-center rounded-lg z-10">
            <div className="animate-spin">
              <RefreshCw className="text-violet-600" size={24} />
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Campaña</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Producto</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Fecha</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Estado</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Gasto</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Compras</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">CPA</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">ROAS</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Tiempo Activo</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {campaigns.filter(c => !c.archived).map((campaign) => {
                const metrics = metricsMap[campaign.id];
                const metaStatus = campaign.meta_status || metrics?.meta_status || 'UNKNOWN';
                const isDeletedInMeta = metaStatus === 'deleted_in_meta' || campaign.status === 'deleted_in_meta';
                const spend = metrics?.metrics?.spend || 0;
                const purchases = metrics?.metrics?.purchases || 0;
                const cpa = metrics?.metrics?.costPerPurchase || 0;
                const roas = metrics?.metrics?.purchaseRoas || 0;
                const daysActive = calculateDaysActive(metrics?.meta_start_time);

                return (
                  <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                      {campaign.meta_campaign_id && (
                        <button
                          onClick={() => openInAdsManager(campaign.meta_campaign_id)}
                          className="text-xs text-violet-500 hover:text-violet-700 flex items-center space-x-1 mt-0.5"
                        >
                          <ExternalLink size={12} />
                          <span>Ver en Ads Manager</span>
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{campaign.product || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{campaign.date || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getMetaStatusColor(
                          metaStatus
                        )}`}
                      >
                        {getMetaStatusLabel(metaStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {metricsLoading ? (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      ) : (
                        formatPrice(spend)
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {metricsLoading ? (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      ) : (
                        Math.round(purchases)
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {metricsLoading ? (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      ) : cpa > 0 ? (
                        formatPrice(cpa)
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {metricsLoading ? (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      ) : roas > 0 ? (
                        `${roas.toFixed(2)}x`
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {metricsLoading ? (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      ) : (
                        daysActive
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center space-x-2">
                        {isDeletedInMeta && (
                          <button
                            onClick={() => handleArchive(campaign.id)}
                            disabled={archiving === campaign.id}
                            className="text-gray-400 dark:text-gray-500 hover:text-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Archivar"
                          >
                            <Archive size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(campaign.id)}
                          className="text-gray-400 dark:text-gray-500 hover:text-red-600 transition"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {campaigns.filter(c => !c.archived).length === 0 && (
          <div className="text-center py-12">
            <BarChart3 size={48} className="text-gray-300 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300">No tienes campañas activas aún</p>
            <button
              onClick={() => navigate('/dashboard/upload')}
              className="mt-4 text-violet-600 hover:text-violet-800 font-semibold"
            >
              Crea tu primera campaña
            </button>
          </div>
        )}
      </div>

      {/* Archived Campaigns Section */}
      {campaigns.filter(c => c.archived).length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <button
            onClick={() => setArchivedExpanded(!archivedExpanded)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition border-b border-gray-200 dark:border-slate-700"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Campañas archivadas</h2>
            <span className="text-gray-600 dark:text-gray-300">
              {archivedExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </span>
          </button>

          {archivedExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Campaña</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Producto</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Fecha</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Estado</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Gasto</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Compras</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">CPA</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">ROAS</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Tiempo Activo</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {campaigns.filter(c => c.archived).map((campaign) => {
                    const metrics = metricsMap[campaign.id];
                    const metaStatus = campaign.meta_status || metrics?.meta_status || 'UNKNOWN';
                    const spend = metrics?.metrics?.spend || 0;
                    const purchases = metrics?.metrics?.purchases || 0;
                    const cpa = metrics?.metrics?.costPerPurchase || 0;
                    const roas = metrics?.metrics?.purchaseRoas || 0;
                    const daysActive = calculateDaysActive(metrics?.meta_start_time);

                    return (
                      <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                          {campaign.meta_campaign_id && (
                            <button
                              onClick={() => openInAdsManager(campaign.meta_campaign_id)}
                              className="text-xs text-violet-500 hover:text-violet-700 flex items-center space-x-1 mt-0.5"
                            >
                              <ExternalLink size={12} />
                              <span>Ver en Ads Manager</span>
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{campaign.product || '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{campaign.date || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getMetaStatusColor(
                              metaStatus
                            )}`}
                          >
                            {getMetaStatusLabel(metaStatus)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          {metricsLoading ? (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          ) : (
                            formatPrice(spend)
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {metricsLoading ? (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          ) : (
                            Math.round(purchases)
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {metricsLoading ? (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          ) : cpa > 0 ? (
                            formatPrice(cpa)
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {metricsLoading ? (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          ) : roas > 0 ? (
                            `${roas.toFixed(2)}x`
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {metricsLoading ? (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          ) : (
                            daysActive
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUnarchive(campaign.id)}
                              disabled={archiving === campaign.id}
                              className="text-gray-400 dark:text-gray-500 hover:text-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Desarchivar"
                            >
                              <Archive size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(campaign.id)}
                              className="text-gray-400 dark:text-gray-500 hover:text-red-600 transition"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
