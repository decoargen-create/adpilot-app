import { useState, useEffect } from 'react';
import client from '../../api/client';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../context/LanguageContext';
import { CheckCircle, AlertCircle, Clock, DollarSign, Bell, Type, Save, Loader2, Plug, ChevronDown, ChevronRight, MessageCircle, Send } from 'lucide-react';

// Get currency symbol from ISO code
function getCurrencySymbol(currencyCode) {
  if (!currencyCode) return '$';
  const code = String(currencyCode).toUpperCase();
  const symbolMap = {
    USD: '$',
    ARS: '$',
    BRL: 'R$',
    EUR: '€'
  };
  return symbolMap[code] || code;
}

// SECTIONS is now defined inside the component to access t() function

export default function Settings() {
  const { currencySymbol, currency } = useCurrency();
  const { t } = useLanguage();
  const [settings, setSettings] = useState({
    naming_template: '{producto} {fecha} [CBO Testeo {tipo}]',
    start_date_mode: 'next_day',
    start_day_offset: 1,
    campaign_hour: 9,
    default_budget: 50,
    notifications_email: '',
    notifications_whatsapp: '',
    default_ad_account: '',
  });
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adAccounts, setAdAccounts] = useState([]);
  const [metaConnected, setMetaConnected] = useState(false);
  const [expanded, setExpanded] = useState({ naming: true, scheduling: false, budget: false, account: false, notifications: false });
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const variables = [
    { name: 'producto', label: t('settings.variables'), example: 'iPhone 15' },
    { name: 'fecha', label: t('settings.variables'), example: '2024-03-25' },
    { name: 'tipo', label: t('settings.variables'), example: 'Video' },
    { name: 'presupuesto', label: t('settings.variables'), example: '50' },
    { name: 'tanda', label: t('settings.variables'), example: '1' }
  ];

  useEffect(() => {
    fetchSettings();
    fetchMetaStatus();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await client.get('/settings');
      if (res.data) {
        setSettings(prev => ({ ...prev, ...res.data }));
        updatePreview(res.data.naming_template || settings.naming_template);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetaStatus = async () => {
    try {
      const res = await client.get('/meta/status');
      if (res.data?.connected && res.data?.adAccounts) {
        setAdAccounts(res.data.adAccounts);
        setMetaConnected(true);
      }
    } catch (error) {
      console.error('Error fetching Meta status:', error);
    }
  };

  const updatePreview = (template) => {
    let pre = template
      .replace('{producto}', 'iPhone 15')
      .replace('{fecha}', '2024-03-25')
      .replace('{tipo}', 'Video')
      .replace('{presupuesto}', '50')
      .replace('{tanda}', '1');
    setPreview(pre);
  };

  const handleTemplateChange = (e) => {
    const newTemplate = e.target.value;
    setSettings({ ...settings, naming_template: newTemplate });
    updatePreview(newTemplate);
  };

  const addVariable = (variable) => {
    const newTemplate = settings.naming_template + ` {${variable}}`;
    setSettings({ ...settings, naming_template: newTemplate });
    updatePreview(newTemplate);
  };

  const toggleSection = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTestWhatsapp = async () => {
    if (!settings.notifications_whatsapp) {
      setTestResult({ type: 'error', text: t('settings.testFailed') });
      return;
    }
    setTestingWhatsapp(true);
    try {
      await client.post('/settings/test-whatsapp', { number: settings.notifications_whatsapp });
      setTestResult({ type: 'success', text: t('settings.testSent') });
      setTimeout(() => setTestResult(null), 4000);
    } catch (error) {
      setTestResult({ type: 'error', text: t('settings.testFailed') + ': ' + (error.response?.data?.error || error.message) });
      setTimeout(() => setTestResult(null), 5000);
    } finally {
      setTestingWhatsapp(false);
    }
  };

  const handleTestEmail = async () => {
    if (!settings.notifications_email) {
      setTestResult({ type: 'error', text: t('settings.testFailed') });
      return;
    }
    setTestingEmail(true);
    try {
      await client.post('/settings/test-email', { email: settings.notifications_email });
      setTestResult({ type: 'success', text: t('settings.testSent') });
      setTimeout(() => setTestResult(null), 4000);
    } catch (error) {
      setTestResult({ type: 'error', text: t('settings.testFailed') + ': ' + (error.response?.data?.error || error.message) });
      setTimeout(() => setTestResult(null), 5000);
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await client.post('/settings', {
        naming_template: settings.naming_template,
        start_date_mode: settings.start_date_mode,
        start_day_offset: settings.start_day_offset,
        campaign_hour: settings.campaign_hour,
        default_budget: settings.default_budget,
        notifications_email: settings.notifications_email,
        notifications_whatsapp: settings.notifications_whatsapp,
        default_ad_account: settings.default_ad_account
      });
      setMessage({ type: 'success', text: t('settings.saved') });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: t('common.error') + ': ' + (error.response?.data?.error || error.message) });
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-violet-500 mr-2" size={24} />
        <span className="text-gray-500">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            max-height: 500px;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .section-content {
          overflow: hidden;
          transition: all 300ms ease-out;
          max-height: 500px;
        }
        .section-content.collapsed {
          max-height: 0;
          opacity: 0;
        }
        .chevron-icon {
          transition: transform 300ms ease-out;
        }
        .chevron-icon.rotated {
          transform: rotate(180deg);
        }
        .settings-container {
          animation: fadeInUp 600ms ease-out;
          animation-fill-mode: both;
        }
        .settings-container:nth-child(1) { animation-delay: 0ms; }
        .settings-container:nth-child(2) { animation-delay: 100ms; }
        .settings-container:nth-child(3) { animation-delay: 200ms; }
        .settings-container:nth-child(4) { animation-delay: 300ms; }
        .settings-container:nth-child(5) { animation-delay: 400ms; }
        .section-button {
          transition: background-color 200ms ease-out;
        }
        .test-button {
          transition: all 200ms ease-out;
        }
        .test-button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(124, 58, 202, 0.2);
        }
        .test-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .variable-button {
          transition: all 200ms ease-out;
        }
        .variable-button:hover {
          transform: translateY(-2px);
        }
        /* Icon animations when section is open */
        @keyframes iconTyping {
          0%, 100% { transform: translateX(0) scale(1.15); }
          20% { transform: translateX(-2px) scale(1.15); }
          40% { transform: translateX(2px) scale(1.15); }
          60% { transform: translateX(-1px) scale(1.15); }
          80% { transform: translateX(1px) scale(1.15); }
        }
        @keyframes iconClockTick {
          0% { transform: rotate(0deg) scale(1.15); }
          10% { transform: rotate(12deg) scale(1.15); }
          20% { transform: rotate(0deg) scale(1.15); }
          30% { transform: rotate(12deg) scale(1.15); }
          40% { transform: rotate(0deg) scale(1.15); }
          100% { transform: rotate(0deg) scale(1.15); }
        }
        @keyframes iconCoinBounce {
          0%, 100% { transform: translateY(0) scale(1.15); }
          15% { transform: translateY(-6px) scale(1.15); }
          30% { transform: translateY(0) scale(1.15); }
          45% { transform: translateY(-3px) scale(1.15); }
          60% { transform: translateY(0) scale(1.15); }
        }
        @keyframes iconBellRing {
          0% { transform: rotate(0deg) scale(1.15); }
          10% { transform: rotate(14deg) scale(1.15); }
          20% { transform: rotate(-14deg) scale(1.15); }
          30% { transform: rotate(10deg) scale(1.15); }
          40% { transform: rotate(-10deg) scale(1.15); }
          50% { transform: rotate(6deg) scale(1.15); }
          60% { transform: rotate(-4deg) scale(1.15); }
          70% { transform: rotate(0deg) scale(1.15); }
          100% { transform: rotate(0deg) scale(1.15); }
        }
        .section-icon {
          transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .icon-typing { animation: iconTyping 0.8s ease-in-out infinite; }
        .icon-clock { animation: iconClockTick 2s ease-in-out infinite; }
        .icon-coin { animation: iconCoinBounce 1.5s ease-in-out infinite; }
        .icon-bell { animation: iconBellRing 1s ease-in-out; animation-iteration-count: 1; }
        .icon-glow { filter: drop-shadow(0 0 6px currentColor); transition: filter 300ms; }
        /* Hover lift on section cards */
        .settings-card {
          transition: all 300ms ease-out;
        }
        .settings-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .settings-card.expanded {
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.1);
          border-color: rgba(124, 58, 237, 0.3);
        }
        /* Input focus animations */
        .animated-input {
          transition: all 200ms ease-out;
        }
        .animated-input:focus {
          transform: scale(1.01);
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }
        /* Save button pulse */
        @keyframes savePulse {
          0%, 100% { box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3); }
          50% { box-shadow: 0 4px 24px rgba(124, 58, 237, 0.5); }
        }
        .save-button-pulse {
          animation: savePulse 2s ease-in-out infinite;
        }
        .save-button-pulse:hover {
          animation: none;
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(124, 58, 237, 0.4);
        }
      `}</style>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('nav.tooltip.settings')}</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-5 p-4 rounded-lg flex items-center space-x-2 text-sm transition-all ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="text-green-500 flex-shrink-0" size={16} />
          ) : (
            <AlertCircle className="text-red-500 flex-shrink-0" size={16} />
          )}
          <p className={message.type === 'success' ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200'}>
            {message.text}
          </p>
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-3">
        {/* Nombres de Campaña */}
        <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden settings-container settings-card ${expanded.naming ? 'expanded' : ''}`}>
          <button
            onClick={() => toggleSection('naming')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 section-button"
          >
            <div className="flex items-center space-x-3">
              <Type size={16} className={`text-violet-600 dark:text-violet-400 flex-shrink-0 section-icon ${expanded.naming ? 'icon-typing icon-glow' : ''}`} />
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.campaignNames')}</h3>
              </div>
            </div>
            <ChevronDown size={16} className={`text-gray-400 chevron-icon ${!expanded.naming ? 'rotated' : ''}`} />
          </button>
          <div className={`section-content ${!expanded.naming ? 'collapsed' : ''}`}>
            <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3 space-y-3">
              <textarea
                value={settings.naming_template}
                onChange={handleTemplateChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded text-sm resize-none focus:ring-1 focus:ring-violet-500 focus:border-transparent outline-none"
                rows="2"
              />
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {variables.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => addVariable(v.name)}
                      className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-xs font-medium hover:bg-violet-200 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800 variable-button"
                      title={`${v.label} — ej: ${v.example}`}
                    >
                      {'{' + v.name + '}'}
                    </button>
                  ))}
                </div>
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 p-3 rounded border border-violet-100 dark:border-violet-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{t('settings.preview')}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">
                    {preview || settings.naming_template}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Programación */}
        <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden settings-container settings-card ${expanded.scheduling ? 'expanded' : ''}`}>
          <button
            onClick={() => toggleSection('scheduling')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 section-button"
          >
            <div className="flex items-center space-x-3">
              <Clock size={16} className={`text-blue-600 dark:text-blue-400 flex-shrink-0 section-icon ${expanded.scheduling ? 'icon-clock icon-glow' : ''}`} />
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.scheduling')}</h3>
              </div>
            </div>
            <ChevronDown size={16} className={`text-gray-400 chevron-icon ${!expanded.scheduling ? 'rotated' : ''}`} />
          </button>
          <div className={`section-content ${!expanded.scheduling ? 'collapsed' : ''}`}>
            <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{t('settings.startDate')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'next_day', label: t('settings.tomorrow') },
                    { value: 'same_day', label: t('settings.today') },
                    { value: 'custom', label: t('settings.custom') }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSettings({ ...settings, start_date_mode: opt.value })}
                      className={`px-2 py-2 rounded text-xs font-medium transition-all ${
                        settings.start_date_mode === opt.value
                          ? 'bg-violet-600 dark:bg-violet-500 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {settings.start_date_mode === 'custom' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('settings.day_offset')}</label>
                  <input
                    type="number"
                    value={settings.start_day_offset}
                    onChange={(e) => setSettings({ ...settings, start_day_offset: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded text-sm focus:ring-1 focus:ring-violet-500 focus:border-transparent outline-none"
                    min="0"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('settings.publishTime')}</label>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={settings.campaign_hour}
                      onChange={(e) => setSettings({ ...settings, campaign_hour: Math.max(0, Math.min(23, parseInt(e.target.value))) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded text-sm text-center font-semibold focus:ring-1 focus:ring-violet-500 focus:border-transparent outline-none"
                      min="0"
                      max="23"
                    />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">:00 hs</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Formato 24hs (ej: 9 = 9am, 21 = 9pm)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Presupuesto */}
        <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden settings-container settings-card ${expanded.budget ? 'expanded' : ''}`}>
          <button
            onClick={() => toggleSection('budget')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 section-button"
          >
            <div className="flex items-center space-x-3">
              <DollarSign size={16} className={`text-green-600 dark:text-green-400 flex-shrink-0 section-icon ${expanded.budget ? 'icon-coin icon-glow' : ''}`} />
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.budget')}</h3>
              </div>
            </div>
            <ChevronDown size={16} className={`text-gray-400 chevron-icon ${!expanded.budget ? 'rotated' : ''}`} />
          </button>
          <div className={`section-content ${!expanded.budget ? 'collapsed' : ''}`}>
            <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                {t('settings.budget')} ({currencySymbol})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400 font-semibold">{currencySymbol}</span>
                <input
                  type="number"
                  value={settings.default_budget}
                  onChange={(e) => setSettings({ ...settings, default_budget: parseFloat(e.target.value) })}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded text-sm font-semibold focus:ring-1 focus:ring-green-500 focus:border-transparent outline-none"
                  min="1"
                  step="0.01"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">/ día</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notificaciones */}
        <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden settings-container settings-card ${expanded.notifications ? 'expanded' : ''}`}>
          <button
            onClick={() => toggleSection('notifications')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 section-button"
          >
            <div className="flex items-center space-x-3">
              <Bell size={16} className={`text-amber-600 dark:text-amber-400 flex-shrink-0 section-icon ${expanded.notifications ? 'icon-bell icon-glow' : ''}`} />
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('settings.notifications')}</h3>
              </div>
            </div>
            <ChevronDown size={16} className={`text-gray-400 chevron-icon ${!expanded.notifications ? 'rotated' : ''}`} />
          </button>
          <div className={`section-content ${!expanded.notifications ? 'collapsed' : ''}`}>
            <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3 space-y-3">
              {testResult && (
                <div className={`p-3 rounded-lg flex items-center space-x-2 text-sm transition-all ${
                  testResult.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  {testResult.type === 'success' ? (
                    <CheckCircle className="text-green-500 flex-shrink-0" size={16} />
                  ) : (
                    <AlertCircle className="text-red-500 flex-shrink-0" size={16} />
                  )}
                  <p className={testResult.type === 'success' ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200'}>
                    {testResult.text}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t('settings.email')}</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={settings.notifications_email}
                    onChange={(e) => setSettings({ ...settings, notifications_email: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded text-sm focus:ring-1 focus:ring-amber-500 focus:border-transparent outline-none"
                    placeholder="tu@email.com"
                  />
                  <button
                    onClick={handleTestEmail}
                    disabled={testingEmail || !settings.notifications_email}
                    className="test-button px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-sm font-medium border border-amber-200 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center space-x-1.5"
                  >
                    {testingEmail ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>{t('settings.sending')}</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>{t('common.test')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block flex items-center space-x-1.5">
                  <MessageCircle size={14} className="text-green-600 dark:text-green-400" />
                  <span>{t('settings.whatsapp')}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={settings.notifications_whatsapp}
                    onChange={(e) => setSettings({ ...settings, notifications_whatsapp: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-transparent outline-none"
                    placeholder="+54 9 11 1234-5678"
                  />
                  <button
                    onClick={handleTestWhatsapp}
                    disabled={testingWhatsapp || !settings.notifications_whatsapp}
                    className="test-button px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm font-medium border border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-60 disabled:cursor-not-allowed flex items-center space-x-1.5"
                  >
                    {testingWhatsapp ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>{t('settings.sending')}</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>{t('common.test')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full mt-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 dark:from-violet-500 dark:to-indigo-500 text-white py-2.5 rounded-lg font-semibold transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed save-button-pulse"
      >
        {saving ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>{t('common.loading')}</span>
          </>
        ) : (
          <>
            <Save size={16} />
            <span>{t('common.save')}</span>
          </>
        )}
      </button>
    </div>
  );
}
