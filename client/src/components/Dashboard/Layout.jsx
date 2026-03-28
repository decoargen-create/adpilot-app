import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePublish } from '../../context/PublishContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../context/LanguageContext';
import { LogOut, Upload, Plug, Settings, BarChart3, FolderOpen, Zap, HelpCircle, ChevronLeft, ChevronRight, Rocket, CheckCircle, AlertCircle, X, ChevronDown, ChevronUp, Loader2, CalendarPlus, PartyPopper, MessageCircle, Moon, Sun, Globe, DollarSign, Wifi, WifiOff } from 'lucide-react';
import client from '../../api/client';

// Full-screen success banner that appears briefly
function SuccessBanner({ campaignName, onDismiss }) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 500);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center pointer-events-none transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-green-500/95 backdrop-blur-md text-white rounded-2xl shadow-2xl px-10 py-8 max-w-md text-center pointer-events-auto"
           style={{ animation: 'fadeInUp 0.4s ease-out forwards' }}>
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4"
             style={{ animation: 'bounce-subtle 1s ease-in-out infinite' }}>
          <CheckCircle size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t('publish.campaign_published')}</h2>
        <p className="text-green-100 text-sm mb-1">{campaignName}</p>
        <p className="text-green-200 text-xs">{t('publish.successMessage')}</p>
        <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
                className="mt-4 px-5 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition">
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}

// PublishWidget component
function PublishWidget() {
  const { t } = useLanguage();
  const { isPublishing, publishStep, publishError, publishSuccess, campaignName, showWidget, whatsappLink, PUBLISH_STEPS, dismissWidget } = usePublish();
  const [minimized, setMinimized] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerShown, setBannerShown] = useState(false);

  const isSuccess = publishSuccess && !publishError;
  const isError = !!publishError;

  // Show full-screen banner on success (only once per publish)
  useEffect(() => {
    if (isSuccess && !bannerShown) {
      setShowBanner(true);
      setBannerShown(true);
    }
    if (!showWidget) {
      setBannerShown(false);
    }
  }, [isSuccess, showWidget, bannerShown]);

  if (!showWidget) return null;

  const totalSteps = PUBLISH_STEPS.length;
  const progress = isSuccess ? 100 : isError ? 100 : Math.min(((publishStep + 1) / totalSteps) * 100, 95);

  return (
    <>
      {/* Full-screen success banner */}
      {showBanner && isSuccess && (
        <SuccessBanner campaignName={campaignName} onDismiss={() => setShowBanner(false)} />
      )}

      {/* Floating widget */}
      <div className="fixed bottom-5 right-5 z-50" style={{ animation: 'fadeInUp 0.3s ease-out forwards' }}>
        <div className={`rounded-xl shadow-2xl border backdrop-blur-sm transition-all duration-300 ${
          isError ? 'bg-red-50/95 border-red-200 w-80' :
          isSuccess ? 'bg-green-50/95 border-green-200 w-80' :
          'bg-white/95 border-gray-200 w-80'
        }`}>
          <div className="p-3.5">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 min-w-0">
                {isError ? <AlertCircle size={16} className="text-red-500 flex-shrink-0" /> :
                 isSuccess ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" /> :
                 <Rocket size={16} className="text-violet-600 flex-shrink-0" style={{ animation: 'bounce-subtle 1.5s ease-in-out infinite' }} />}
                <span className={`font-semibold text-sm truncate ${
                  isError ? 'text-red-700' : isSuccess ? 'text-green-700' : 'text-gray-900'
                }`}>
                  {isError ? t('publish.error') : isSuccess ? t('publish.success') : t('publish.title')}
                </span>
              </div>
              <div className="flex items-center space-x-0.5 flex-shrink-0">
                <button onClick={() => setMinimized(!minimized)} className="p-1 rounded hover:bg-black/5 transition">
                  {minimized ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
                </button>
                {(isSuccess || isError) && (
                  <button onClick={dismissWidget} className="p-1 rounded hover:bg-black/5 transition">
                    <X size={14} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Campaign name */}
            <p className={`text-xs mb-2 truncate ${isError ? 'text-red-500' : isSuccess ? 'text-green-600' : 'text-gray-500'}`}>
              {campaignName}
            </p>

            {/* Expanded content */}
            {!minimized && (
              <>
                {/* Success message */}
                {isSuccess && (
                  <div className="p-2.5 bg-green-100 border border-green-200 rounded-lg mb-2">
                    <p className="text-xs text-green-700 font-medium text-center">{publishSuccess}</p>
                    <p className="text-[10px] text-green-600 mt-1 text-center">{t('publish.successMessage')}</p>
                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block w-full px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-medium rounded flex items-center justify-center space-x-1 transition"
                      >
                        <MessageCircle size={12} />
                        <span>{t('publish.notifyWhatsapp')}</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Steps */}
                {!isSuccess && (
                  <div className="space-y-1 mb-2.5">
                    {PUBLISH_STEPS.map((s, i) => {
                      const isDone = i < publishStep || (isSuccess && i <= publishStep);
                      const isActive = i === publishStep && !isError && !isSuccess;
                      const isFailed = i === publishStep && isError;
                      return (
                        <div key={i} className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isDone ? 'bg-green-500' : isFailed ? 'bg-red-500' : isActive ? 'bg-violet-600' : 'bg-gray-200'
                          }`}>
                            {isDone ? <CheckCircle size={10} className="text-white" /> :
                             isFailed ? <X size={10} className="text-white" /> :
                             isActive ? <Loader2 size={10} className="text-white animate-spin" /> :
                             <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                          </div>
                          <span className={`text-[11px] ${
                            isDone ? 'text-green-600 line-through' :
                            isFailed ? 'text-red-600 font-medium' :
                            isActive ? 'text-violet-700 font-medium' : 'text-gray-400'
                          }`}>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Error detail */}
                {isError && (
                  <div className="p-2 bg-red-100 border border-red-200 rounded-lg mb-2">
                    <p className="text-[11px] text-red-700 leading-relaxed">{publishError}</p>
                  </div>
                )}
              </>
            )}

            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ease-out ${
                isError ? 'bg-red-400' : isSuccess ? 'bg-green-500' : 'bg-gradient-to-r from-violet-500 to-indigo-500'
              }`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Meta connection status indicator
function MetaStatusIndicator() {
  const { t } = useLanguage();
  const [metaConnected, setMetaConnected] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMetaStatus = async () => {
      try {
        const response = await client.get('/meta/status');
        setMetaConnected(response.data?.connected || false);
      } catch (error) {
        console.error('Error fetching Meta status:', error);
        setMetaConnected(false);
      } finally {
        setLoading(false);
      }
    };

    fetchMetaStatus();
  }, []);

  if (loading) {
    return (
      <button className="h-[30px] px-3 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center space-x-2 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600" />
        <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Meta</span>
      </button>
    );
  }

  if (metaConnected) {
    return (
      <button
        onClick={() => navigate('/dashboard/integration')}
        className="h-[30px] px-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center space-x-1.5 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
        title={t('meta.connected')}
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <Wifi size={12} className="text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Meta</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate('/dashboard/integration')}
      className="h-[30px] px-3 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center space-x-1.5 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95"
      title={t('meta.clickToConnect')}
    >
      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <WifiOff size={12} className="text-amber-600 dark:text-amber-400" />
      <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Meta</span>
    </button>
  );
}

// Sidebar tooltip
function SideTooltip({ text, children, collapsed }) {
  const [show, setShow] = useState(false);
  if (!collapsed) return children;
  return (
    <span className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute z-50 left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
          style={{ animation: 'fadeInUp 0.2s ease-out forwards' }}>
          {text}
        </span>
      )}
    </span>
  );
}

export default function DashboardLayout() {
  const { logout, user } = useAuth();
  const { currency, toggleCurrency, exchangeRate, rateSource } = useCurrency();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Inject global animation styles
  useEffect(() => {
    const styleId = 'adpilot-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .fade-in-animation {
          animation: fadeIn 0.4s ease-out forwards;
        }

        .sidebar-item-hover {
          transition: all 0.2s ease-out;
        }

        .sidebar-item-hover:hover {
          transform: translateX(4px);
        }

        .switch-click {
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
        }

        .switch-click:hover {
          transform: scale(1.08);
          filter: brightness(1.1);
        }

        .switch-click:active {
          transform: scale(0.92);
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Initialize dark mode from localStorage (default: dark on first visit)
  useEffect(() => {
    const storedDark = localStorage.getItem('adpilot-dark-mode');
    const isDark = storedDark === null ? true : storedDark === 'true'; // default dark
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    if (storedDark === null) localStorage.setItem('adpilot-dark-mode', 'true');
  }, []);

  const toggleDarkMode = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    localStorage.setItem('adpilot-dark-mode', newVal);
    if (newVal) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/dashboard/campaigns', label: t('nav.campaigns'), icon: BarChart3, tip: t('nav.tooltip.campaigns') },
    { path: '/dashboard/upload', label: t('nav.schedule'), icon: CalendarPlus, tip: t('nav.tooltip.schedule') },
    { path: '/dashboard/library', label: t('nav.library'), icon: FolderOpen, tip: t('nav.tooltip.library') },
    { path: '/dashboard/integration', label: t('nav.integration'), icon: Plug, tip: t('nav.tooltip.integration') },
    { path: '/dashboard/settings', label: t('nav.settings'), icon: Settings, tip: t('nav.tooltip.settings') }
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Sidebar — gradient violet theme */}
      <div className={`${collapsed ? 'w-[68px]' : 'w-64'} bg-gradient-to-b from-violet-950 via-violet-900 to-indigo-950 flex flex-col flex-shrink-0 transition-all duration-300 relative`}>
        {/* Logo */}
        <div className={`${collapsed ? 'px-3 py-4' : 'p-5'} border-b border-white/10`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-2.5'}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-900/40 flex-shrink-0">
              <Zap size={18} className="text-white" />
            </div>
            {!collapsed && (
              <span className="text-xl font-bold text-white tracking-tight">AdPilot</span>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-violet-700 border-2 border-violet-900 flex items-center justify-center text-white hover:bg-violet-600 transition shadow-md z-10"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Section label */}
        {!collapsed && (
          <div className="px-5 pt-5 pb-2">
            <p className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">{t('nav.navigation')}</p>
          </div>
        )}

        {/* Nav */}
        <nav className={`flex-1 ${collapsed ? 'px-2 pt-4' : 'px-3'} space-y-1 overflow-y-auto`}>
          {menuItems.map(({ path, label, icon: Icon, tip }) => (
            <SideTooltip key={path} text={tip} collapsed={collapsed}>
              <button
                onClick={() => navigate(path)}
                className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'space-x-3 px-3.5'} py-2.5 rounded-xl text-sm transition-all duration-200 group sidebar-item-hover ${
                  isActive(path)
                    ? 'bg-white/15 text-white font-semibold shadow-sm shadow-black/10 backdrop-blur-sm'
                    : 'text-violet-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className={`flex-shrink-0 ${isActive(path) ? '' : 'group-hover:scale-110 transition-transform'}`}>
                  <Icon size={18} className={isActive(path) ? 'text-violet-300' : 'text-violet-400 group-hover:text-violet-200'} />
                </div>
                {!collapsed && <span>{label}</span>}
                {!collapsed && isActive(path) && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                )}
              </button>
            </SideTooltip>
          ))}
        </nav>

        {/* Pro badge / branding */}
        {!collapsed && (
          <div className="px-4 py-3">
            <div className="bg-gradient-to-r from-violet-800/50 to-indigo-800/50 rounded-xl p-3 border border-white/10">
              <div className="flex items-center space-x-2 mb-1">
                <Zap size={12} className="text-amber-400" />
                <span className="text-[10px] uppercase tracking-wider text-violet-300 font-bold">AdPilot Beta</span>
              </div>
              <p className="text-[11px] text-violet-400 leading-relaxed">Automatización inteligente de campañas Meta Ads</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={`${collapsed ? 'px-2' : 'px-3'} py-3 border-t border-white/10`}>
          {!collapsed && (
            <div className="mb-2 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-violet-500 font-medium">{t('nav.account')}</p>
              <p className="font-medium text-violet-100 text-sm truncate mt-0.5">{user?.email}</p>
            </div>
          )}
          <SideTooltip text={t('nav.logout')} collapsed={collapsed}>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-center space-x-2'} text-violet-300 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-xl transition text-sm font-medium`}
            >
              <LogOut size={16} />
              {!collapsed && <span>{t('nav.logout')}</span>}
            </button>
          </SideTooltip>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto flex flex-col">
        {/* Top Header Bar */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 px-6 py-2 flex items-center justify-end space-x-3">
          {/* Meta connection status */}
          <MetaStatusIndicator />

          {/* Language switch */}
          <button
            onClick={toggleLanguage}
            className={`relative h-[30px] rounded-full flex items-center px-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 switch-click ${
              language === 'en'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-md shadow-blue-500/20'
                : 'bg-gradient-to-r from-violet-500 to-purple-500 shadow-md shadow-violet-500/20'
            }`}
            title={language === 'es' ? t('lang.english') : t('lang.spanish')}
            style={{ width: '62px' }}
          >
            <div className={`w-[24px] h-[24px] rounded-full bg-white shadow-sm flex items-center justify-center transition-all duration-300 ${language === 'en' ? 'translate-x-[30px]' : 'translate-x-0'}`}>
              <Globe size={12} className={language === 'en' ? 'text-blue-600' : 'text-violet-600'} />
            </div>
            <span className={`absolute text-[9px] font-bold text-white/90 tracking-wide transition-all duration-300 ${language === 'en' ? 'left-2' : 'right-2.5'}`}>
              {language === 'es' ? 'ES' : 'EN'}
            </span>
          </button>

          {/* Currency switch */}
          <button
            onClick={toggleCurrency}
            className={`relative h-[30px] rounded-full flex items-center px-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 switch-click ${
              currency === 'USD'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/20'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-md shadow-blue-500/20'
            }`}
            title={currency === 'ARS' ? `ARS (1 USD = $${exchangeRate.toLocaleString('es-AR')} ARS — ${rateSource})` : t('currency.ars')}
            style={{ width: '62px' }}
          >
            <div className={`w-[24px] h-[24px] rounded-full bg-white shadow-sm flex items-center justify-center transition-all duration-300 ${currency === 'USD' ? 'translate-x-[30px]' : 'translate-x-0'}`}>
              <DollarSign size={12} className={currency === 'USD' ? 'text-emerald-600' : 'text-blue-600'} />
            </div>
            <span className={`absolute text-[9px] font-bold text-white/90 tracking-wide transition-all duration-300 ${currency === 'USD' ? 'left-1.5' : 'right-1.5'}`}>
              {currency}
            </span>
          </button>

          {/* Dark mode switch */}
          <button
            onClick={toggleDarkMode}
            className={`relative h-[30px] rounded-full flex items-center px-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500/30 switch-click ${
              darkMode
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/20'
                : 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-md shadow-amber-400/20'
            }`}
            title={darkMode ? t('theme.light') : t('theme.dark')}
            style={{ width: '52px' }}
          >
            <div className={`w-[24px] h-[24px] rounded-full bg-white shadow-sm flex items-center justify-center transition-all duration-300 ${darkMode ? 'translate-x-[20px]' : 'translate-x-0'}`}>
              {darkMode ? <Moon size={12} className="text-indigo-600" /> : <Sun size={12} className="text-amber-500" />}
            </div>
          </button>
        </div>

        {/* Page content */}
        <div className="flex-1 p-8 pb-20 max-w-7xl mx-auto w-full">
          <div key={location.pathname} className="fade-in-animation">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Floating publish widget — always visible */}
      <PublishWidget />
    </div>
  );
}
