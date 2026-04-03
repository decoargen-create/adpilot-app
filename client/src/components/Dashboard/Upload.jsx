import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { usePublish } from '../../context/PublishContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Upload as UploadIcon,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  Plus,
  Film,
  Image,
  CalendarPlus,
  Rocket,
  ChevronDown,
  ChevronUp,
  Zap,
  Copy,
  UploadCloud,
  Check,
  ArrowRight,
  MoreVertical,
  Pencil,
  Trash2,
  HelpCircle,
  PlusCircle,
  Sparkles,
  Eye,
  Star
} from 'lucide-react';

// --- CSS animations via style tag injected once ---
const ANIM_STYLE_ID = 'upload-animations';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = ANIM_STYLE_ID;
  style.textContent = `
    @keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse-ring { 0% { transform:scale(0.8); opacity:1; } 100% { transform:scale(1.6); opacity:0; } }
    @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
    @keyframes bounce-subtle { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-3px); } }
    @keyframes progress-bar { 0% { width:5%; } 50% { width:60%; } 100% { width:95%; } }
    .fade-in-up { animation: fadeInUp 0.35s ease-out forwards; }
    .pulse-ring { animation: pulse-ring 1.5s ease-out infinite; }
    .shimmer-bg { background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.4) 50%, transparent 75%); background-size: 200% 100%; animation: shimmer 2s infinite; }
    .bounce-subtle { animation: bounce-subtle 1.5s ease-in-out infinite; }
    .progress-bar-anim { animation: progress-bar 30s ease-out forwards; }
    @keyframes sparkle { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.2); } }
    .ai-sparkle { animation: sparkle 2s ease-in-out infinite; }
    @keyframes ai-glow { 0%,100% { box-shadow: 0 0 8px rgba(139,92,246,0.3); } 50% { box-shadow: 0 0 16px rgba(139,92,246,0.6); } }
    .ai-glow { animation: ai-glow 2s ease-in-out infinite; }

    /* Step card animations */
    @keyframes stepEnter { from { opacity:0; transform:translateY(20px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
    .step-card { animation: stepEnter 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; transition: all 300ms ease-out; }
    .step-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

    /* Icon bounce on hover for product cards */
    @keyframes iconWiggle { 0% { transform: rotate(0); } 25% { transform: rotate(-10deg); } 50% { transform: rotate(8deg); } 75% { transform: rotate(-4deg); } 100% { transform: rotate(0); } }
    .product-card:hover .product-icon { animation: iconWiggle 0.5s ease-in-out; }
    .product-card { transition: all 250ms cubic-bezier(0.34,1.56,0.64,1); }
    .product-card:hover { transform: translateY(-3px) scale(1.02); }
    .product-card.selected { box-shadow: 0 4px 20px rgba(124,58,237,0.15); }

    /* Mode card hover effects */
    .mode-card { transition: all 300ms cubic-bezier(0.34,1.56,0.64,1); }
    .mode-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.1); }
    .mode-card.active { transform: translateY(-2px); }
    .mode-card:hover .mode-icon { transform: scale(1.2) rotate(-5deg); transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1); }
    .mode-icon { transition: transform 300ms ease-out; }

    /* Step number pulse when active */
    @keyframes stepPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); } 50% { box-shadow: 0 0 0 8px rgba(124,58,237,0); } }
    .step-active { animation: stepPulse 2s ease-in-out infinite; }

    /* Publish button */
    @keyframes publishReady { 0%,100% { box-shadow: 0 4px 14px rgba(124,58,237,0.3); } 50% { box-shadow: 0 4px 28px rgba(124,58,237,0.5); } }
    .publish-ready { animation: publishReady 2s ease-in-out infinite; }
    .publish-ready:hover { animation: none; transform: translateY(-3px); box-shadow: 0 8px 32px rgba(124,58,237,0.4); }

    /* Drop zone animation */
    @keyframes dropZonePulse { 0%,100% { border-color: rgba(124,58,237,0.3); } 50% { border-color: rgba(124,58,237,0.7); } }
    .drop-zone-active { animation: dropZonePulse 1.5s ease-in-out infinite; }

    /* File list item enter */
    @keyframes fileSlideIn { from { opacity:0; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
    .file-item { animation: fileSlideIn 0.3s ease-out forwards; }
    .file-item:hover { transform: translateX(4px); }
  `;
  document.head.appendChild(style);
}

// --- AI Generation Button ---
function AIButton({ onClick, loading, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="ai-glow flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Sparkles size={12} className="ai-sparkle" />
      )}
      <span>{loading ? 'Generando...' : label}</span>
    </button>
  );
}

// --- Compact Live Facebook Ad Preview ---
function LiveAdPreview({ body, titles, descriptions, cta, link, productName, previewFile }) {
  const [thumbUrl, setThumbUrl] = useState(null);

  useEffect(() => {
    if (previewFile && previewFile.type?.startsWith('image/')) {
      const url = URL.createObjectURL(previewFile);
      setThumbUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setThumbUrl(null);
    }
  }, [previewFile]);

  const ctaLabels = {
    SHOP_NOW: 'Comprar', LEARN_MORE: 'Más info', SIGN_UP: 'Registrarse',
    CONTACT_US: 'Contactar', SUBSCRIBE: 'Suscribir', GET_OFFER: 'Oferta',
    ORDER_NOW: 'Pedir', BOOK_NOW: 'Reservar', WATCH_MORE: 'Ver más',
    APPLY_NOW: 'Aplicar', DOWNLOAD: 'Descargar', NO_BUTTON: null
  };

  const domain = link ? (() => { try { return new URL(link).hostname.replace('www.', ''); } catch { return ''; } })() : '';
  const displayTitle = (titles || []).find(t => t.trim()) || '';
  const displayDesc = (descriptions || []).find(d => d.trim()) || '';

  // Truncate body for preview (max ~120 chars)
  const truncBody = body && body.length > 120 ? body.slice(0, 120) + '...' : body;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 shadow-md overflow-hidden w-full transition-all duration-300" style={{ fontSize: '0px' }}>
      {/* FB header */}
      <div className="px-2.5 pt-2.5 pb-1.5 flex items-center space-x-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Zap size={11} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-900 dark:text-white truncate leading-tight">{productName || 'Tu Marca'}</p>
          <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-tight">Publicidad · 🌐</p>
        </div>
      </div>

      {/* Body text — compact */}
      <div className="px-2.5 pb-1.5">
        <p className="text-[11px] text-gray-800 dark:text-gray-200 leading-snug whitespace-pre-line transition-all duration-200" style={{ minHeight: '14px', maxHeight: '72px', overflow: 'hidden' }}>
          {truncBody || <span className="text-gray-300 dark:text-gray-600 italic">Texto principal...</span>}
        </p>
      </div>

      {/* Image area — 4:5 ratio instead of square */}
      <div className="relative w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-500">
            <Image size={28} strokeWidth={1} />
            <p className="text-[9px] mt-1">Creativo</p>
          </div>
        )}
      </div>

      {/* Link bar + CTA */}
      <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-600">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            {domain && <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase truncate leading-tight">{domain}</p>}
            <p className="text-[11px] font-semibold text-gray-900 dark:text-white truncate leading-tight" style={{ minHeight: '13px' }}>
              {displayTitle || <span className="text-gray-300 dark:text-gray-600">Titular...</span>}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight" style={{ minHeight: '12px' }}>
              {displayDesc || <span className="text-gray-300 dark:text-gray-600">Descripción...</span>}
            </p>
          </div>
          {ctaLabels[cta] && (
            <button className="flex-shrink-0 px-2 py-1 bg-gray-200 dark:bg-slate-600 rounded text-[10px] font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
              {ctaLabels[cta]}
            </button>
          )}
        </div>
      </div>

      {/* Reactions — minimal */}
      <div className="px-2.5 py-1 border-t border-gray-100 dark:border-slate-600 flex items-center justify-between text-[9px] text-gray-400 dark:text-gray-500">
        <span>👍 ❤️ 24</span>
        <span>3 comentarios</span>
      </div>
    </div>
  );
}

// --- Tooltip Component ---
function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-slate-800 rounded-lg shadow-lg whitespace-nowrap max-w-xs text-center fade-in-up pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900 dark:border-t-slate-800" />
        </span>
      )}
    </span>
  );
}

function getTomorrowDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

function detectCreativeType(files) {
  if (files.length === 0) return null;
  const hasVideo = files.some(f => f.type.startsWith('video/'));
  const hasImage = files.some(f => f.type.startsWith('image/'));
  if (hasVideo && !hasImage) return 'videos';
  if (hasImage && !hasVideo) return 'estaticos';
  if (hasVideo && hasImage) return 'mixto';
  return null;
}

function generateDates(startDate, count) {
  const dates = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

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

// --- File thumbnail preview ---
function FileThumbnail({ file }) {
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setThumb(url);
      return () => URL.revokeObjectURL(url);
    }
    if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setThumb(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (file.type.startsWith('image/') && thumb) {
    return <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />;
  }
  if (file.type.startsWith('video/')) {
    return (
      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
        <Film size={18} className="text-blue-600" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
      <Image size={18} className="text-gray-400 dark:text-gray-500" />
    </div>
  );
}


export default function Upload() {
  const navigate = useNavigate();
  const { startPublish, isPublishing } = usePublish();
  const { currencySymbol, currency, convertFromUSD, convertToUSD, formatPrice, exchangeRate } = useCurrency();
  const { t } = useLanguage();

  // Mode selection
  const [mode, setMode] = useState('duplicate'); // 'duplicate' | 'create_new'

  // Core state
  const [settings, setSettings] = useState(null);
  const [productPresets, setProductPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [files, setFiles] = useState([]);
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState('40');
  const [campaignHour, setCampaignHour] = useState('9');
  const [isDragging, setIsDragging] = useState(false);

  // Meta state
  const [metaConnected, setMetaConnected] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Batch mode
  const [batchMode, setBatchMode] = useState(false);
  const [batchDays, setBatchDays] = useState(2);

  // Advanced options toggle
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Mode 2: Create New Campaign fields
  const [campaignTexts, setCampaignTexts] = useState({
    body: '',
    titles: ['', ''],
    descriptions: ['', '']
  });
  const [campaignCta, setCampaignCta] = useState('SHOP_NOW');
  const [campaignLink, setCampaignLink] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('OUTCOME_SALES');
  const [loadingDefaults, setLoadingDefaults] = useState(false);

  // New preset creation
  const [showNewPreset, setShowNewPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [adAccounts, setAdAccounts] = useState([]);
  const [newPresetAccount, setNewPresetAccount] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [newPresetCampaign, setNewPresetCampaign] = useState('');
  const [newPresetBudget, setNewPresetBudget] = useState('40');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [campaignSearch, setCampaignSearch] = useState('');

  // Edit preset state
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [editPresetName, setEditPresetName] = useState('');
  const [editPresetBudget, setEditPresetBudget] = useState('');
  const [editPresetAccount, setEditPresetAccount] = useState('');
  const [editPresetCampaign, setEditPresetCampaign] = useState('');
  const [editPresetLink, setEditPresetLink] = useState('');
  const [editCampaigns, setEditCampaigns] = useState([]);
  const [editCampaignSearch, setEditCampaignSearch] = useState('');
  const [editLoadingCampaigns, setEditLoadingCampaigns] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Publish state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const detectedType = useMemo(() => detectCreativeType(files), [files]);

  // --- Init ---
  useEffect(() => {
    checkMetaStatus();
    fetchSettings();
    fetchProductPresets();
  }, []);

  useEffect(() => {
    if (settings && !date) {
      if (settings.start_date_mode === 'next_day') setDate(getTomorrowDate());
      if (settings.default_budget) setBudget(String(settings.default_budget));
      if (settings.campaign_hour !== undefined) setCampaignHour(String(settings.campaign_hour));
    }
  }, [settings]);

  useEffect(() => {
    if (newPresetAccount) {
      fetchCampaigns(newPresetAccount);
    }
  }, [newPresetAccount]);

  // Fetch defaults for mode 2 when preset is selected and mode is 'create_new'
  // Load from product's saved ad text defaults first, then fallback to API
  useEffect(() => {
    if (mode === 'create_new' && selectedPreset) {
      loadProductAdDefaults();
    }
  }, [mode, selectedPreset?.id]);

  const loadProductAdDefaults = async () => {
    if (!selectedPreset) return;
    // Use product's saved defaults if they exist
    if (selectedPreset.default_body || selectedPreset.default_title || selectedPreset.default_description) {
      setCampaignTexts({
        body: selectedPreset.default_body || '',
        titles: [selectedPreset.default_title || '', ''],
        descriptions: [selectedPreset.default_description || '', '']
      });
      setCampaignCta(selectedPreset.default_cta || 'SHOP_NOW');
      setCampaignObjective(selectedPreset.default_objective || 'OUTCOME_SALES');
      if (selectedPreset.product_link) setCampaignLink(selectedPreset.product_link);
      return;
    }
    // Fallback: fetch from Meta API
    setLoadingDefaults(true);
    try {
      const res = await client.get(`/meta/campaign-defaults?ad_account_id=${selectedPreset.ad_account_id}`);
      if (res.data) {
        setCampaignCta(res.data.cta || 'SHOP_NOW');
        setCampaignObjective(res.data.objective || 'OUTCOME_SALES');
        setCampaignTexts({
          body: res.data.body || '',
          titles: [res.data.title || '', ''],
          descriptions: [res.data.description || '', '']
        });
        if (res.data.link) setCampaignLink(res.data.link);
      }
    } catch (err) {
      console.log('Could not fetch defaults, using hardcoded ones');
      setCampaignCta('SHOP_NOW');
      setCampaignObjective('OUTCOME_SALES');
    } finally {
      setLoadingDefaults(false);
    }
  };

  // AI text generation state
  const [aiGenerating, setAiGenerating] = useState({ body: false, titles: false, descriptions: false, all: false });

  // AI generates texts based on product name + destination link
  const handleAiGenerate = async (field) => {
    if (!selectedPreset) return;
    setAiGenerating(prev => ({ ...prev, [field]: true }));
    try {
      const productName = selectedPreset.name;
      const domain = campaignLink ? (() => { try { return new URL(campaignLink).hostname.replace('www.', ''); } catch { return ''; } })() : '';
      const linkContext = domain ? ` de ${domain}` : '';

      const templates = {
        body: `¿Buscás resultados reales? Descubrí ${productName}${linkContext} y sentí la diferencia desde el primer uso.\n\n` +
              `Miles de personas ya confían en ${productName} para transformar su rutina diaria.\n\n` +
              `✅ Resultados visibles\n✅ Fórmula premium\n✅ Envío gratis\n\n` +
              `Aprovechá el descuento especial por tiempo limitado 👇`,
        titles: [`${productName} - Resultados Reales`, `Descubre ${productName} Hoy`],
        descriptions: [`Envío gratis + Garantía de 30 días | Más de 5,000 clientes satisfechos`, `Calidad premium al mejor precio`]
      };
      await new Promise(r => setTimeout(r, 1200));
      if (field === 'titles' || field === 'descriptions') {
        setCampaignTexts(prev => ({ ...prev, [field]: templates[field] }));
      } else {
        setCampaignTexts(prev => ({ ...prev, [field]: templates[field] }));
      }
    } finally {
      setAiGenerating(prev => ({ ...prev, [field]: false }));
    }
  };

  // Generate all texts at once
  const handleAiGenerateAll = async () => {
    if (!selectedPreset) return;
    if (!campaignLink.trim()) { setError('Ingresá el link de destino primero para generar textos con IA'); return; }
    setAiGenerating({ body: true, titles: true, descriptions: true, all: true });
    try {
      const productName = selectedPreset.name;
      const domain = campaignLink ? (() => { try { return new URL(campaignLink).hostname.replace('www.', ''); } catch { return ''; } })() : '';
      const linkContext = domain ? ` de ${domain}` : '';

      await new Promise(r => setTimeout(r, 1800));
      setCampaignTexts({
        body: `¿Buscás resultados reales? Descubrí ${productName}${linkContext} y sentí la diferencia desde el primer uso.\n\n` +
              `Miles de personas ya confían en ${productName} para transformar su rutina diaria.\n\n` +
              `✅ Resultados visibles\n✅ Fórmula premium\n✅ Envío gratis\n\n` +
              `Aprovechá el descuento especial por tiempo limitado 👇`,
        titles: [`${productName} - Resultados Reales`, `Descubre ${productName} Hoy`],
        descriptions: [`Envío gratis + Garantía de 30 días | Más de 5,000 clientes satisfechos`, `Calidad premium al mejor precio`]
      });
    } finally {
      setAiGenerating({ body: false, titles: false, descriptions: false, all: false });
    }
  };

  // Auto-save link to product when it changes (debounced)
  const [linkSaveTimeout, setLinkSaveTimeout] = useState(null);
  const handleLinkChange = (val) => {
    setCampaignLink(val);
    if (linkSaveTimeout) clearTimeout(linkSaveTimeout);
    if (selectedPreset && val.trim()) {
      const t = setTimeout(async () => {
        try {
          await client.patch(`/products/${selectedPreset.id}`, { product_link: val.trim() });
          setProductPresets(prev => prev.map(p => String(p.id) === String(selectedPreset.id) ? { ...p, product_link: val.trim() } : p));
        } catch {}
      }, 1500);
      setLinkSaveTimeout(t);
    }
  };

  // Save ad texts to product defaults
  const saveAdTextsToProduct = async () => {
    if (!selectedPreset) return;
    try {
      const res = await client.patch(`/products/${selectedPreset.id}`, {
        default_body: campaignTexts.body || null,
        default_title: campaignTexts.titles[0] || null,
        default_description: campaignTexts.descriptions[0] || null,
        default_cta: campaignCta,
        default_objective: campaignObjective,
        product_link: campaignLink || null
      });
      // Update local state
      setProductPresets(prev => prev.map(p => String(p.id) === String(selectedPreset.id) ? res.data : p));
      setSelectedPreset(res.data);
      setSuccess('Textos guardados como predeterminados para ' + selectedPreset.name);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError('Error guardando textos: ' + (e.response?.data?.error || e.message));
    }
  };

  // --- Data Fetching ---
  const fetchSettings = async () => {
    try {
      const res = await client.get('/settings');
      setSettings(res.data);
    } catch {
      setSettings({ start_date_mode: 'next_day', default_budget: 40, campaign_hour: 5, naming_template: '{producto} {fecha} [CBO Testeo {tipo}]' });
    }
  };

  const fetchProductPresets = async () => {
    try {
      const res = await client.get('/products');
      setProductPresets(res.data || []);
    } catch { setProductPresets([]); }
  };

  const checkMetaStatus = async () => {
    try {
      const res = await client.get('/meta/status');
      setMetaConnected(res.data.connected);
      if (res.data.connected && res.data.adAccounts?.length > 0) {
        setAdAccounts(res.data.adAccounts);
      }
    } catch { setMetaConnected(false); }
    finally { setLoadingStatus(false); }
  };

  const fetchCampaigns = async (accountId) => {
    setLoadingCampaigns(true);
    try {
      const res = await client.get(`/meta/campaigns?ad_account_id=${accountId}`);
      const list = Array.isArray(res.data) ? res.data : (res.data.campaigns || res.data.data || []);
      setCampaigns(list);
    } catch { setCampaigns([]); }
    finally { setLoadingCampaigns(false); }
  };

  // --- Preset Selection ---
  const handleSelectPreset = (presetId) => {
    setSelectedPresetId(presetId);
    setError('');
    if (!presetId) { setSelectedPreset(null); return; }
    const preset = productPresets.find(p => String(p.id) === String(presetId));
    if (preset) {
      setSelectedPreset(preset);
      setBudget(String(preset.daily_budget || 40));
       }
  };

  // --- Save New Preset ---
  const handleSaveNewPreset = async () => {
    if (!newPresetName.trim() || !newPresetCampaign) {
      setError('Necesitas nombre y campaña base para crear un producto');
      return;
    }
    setSavingPreset(true);
    try {
      const campaignObj = campaigns.find(c => c.id === newPresetCampaign);
      const res = await client.post('/products', {
        name: newPresetName.trim(),
        ad_account_id: newPresetAccount,
        base_campaign_id: newPresetCampaign,
        base_campaign_name: campaignObj?.name || '',
        daily_budget: parseFloat(newPresetBudget) || 40
      });
      const newPreset = res.data;
      setProductPresets(prev => [...prev, newPreset]);
      setSelectedPresetId(String(newPreset.id));
      setSelectedPreset(newPreset);
      setBudget(String(newPreset.daily_budget || 40));
      setShowNewPreset(false);
      setNewPresetName('');
      setNewPresetCampaign('');
    } catch (e) {
      setError('Error al guardar: ' + (e.response?.data?.error || e.message));
    } finally { setSavingPreset(false); }
  };

  // --- Edit Preset ---
  const handleStartEdit = async (preset) => {
    setEditingPresetId(preset.id);
    setEditPresetName(preset.name);
    setEditPresetBudget(String(preset.daily_budget || 40));
    setEditPresetAccount(preset.ad_account_id || '');
    setEditPresetCampaign(preset.base_campaign_id || '');
    setEditPresetLink(preset.product_link || '');
    setEditCampaignSearch('');
    // Fetch campaigns for this ad account
    if (preset.ad_account_id) {
      setEditLoadingCampaigns(true);
      try {
        const res = await client.get(`/meta/campaigns?ad_account_id=${preset.ad_account_id}`);
        const list = Array.isArray(res.data) ? res.data : (res.data.campaigns || res.data.data || []);
        setEditCampaigns(list);
      } catch { setEditCampaigns([]); }
      finally { setEditLoadingCampaigns(false); }
    } else {
      setEditCampaigns([]);
    }
  };

  const handleEditAccountChange = async (accountId) => {
    setEditPresetAccount(accountId);
    setEditPresetCampaign('');
    setEditCampaignSearch('');
    if (accountId) {
      setEditLoadingCampaigns(true);
      try {
        const res = await client.get(`/meta/campaigns?ad_account_id=${accountId}`);
        const list = Array.isArray(res.data) ? res.data : (res.data.campaigns || res.data.data || []);
        setEditCampaigns(list);
      } catch { setEditCampaigns([]); }
      finally { setEditLoadingCampaigns(false); }
    } else {
      setEditCampaigns([]);
    }
  };

  const filteredEditCampaigns = editCampaigns.filter(c =>
    c.name.toLowerCase().includes(editCampaignSearch.toLowerCase())
  );

  const handleSaveEdit = async () => {
    if (!editPresetName.trim()) {
      setError('El nombre no puede estar vacío');
      return;
    }
    setSavingEdit(true);
    try {
      const campaignObj = editCampaigns.find(c => c.id === editPresetCampaign);
      const res = await client.patch(`/products/${editingPresetId}`, {
        name: editPresetName.trim(),
        ad_account_id: editPresetAccount || null,
        base_campaign_id: editPresetCampaign || null,
        base_campaign_name: campaignObj?.name || (editPresetCampaign ? undefined : null),
        daily_budget: parseFloat(editPresetBudget) || 40,
        product_link: editPresetLink.trim() || null
      });
      setProductPresets(prev => prev.map(p =>
        String(p.id) === String(editingPresetId) ? res.data : p
      ));
      if (String(selectedPresetId) === String(editingPresetId)) {
        setSelectedPreset(res.data);
        setBudget(String(res.data.daily_budget || 40));
      }
      setEditingPresetId(null);
    } catch (e) {
      setError('Error al guardar: ' + (e.response?.data?.error || e.message));
    } finally { setSavingEdit(false); }
  };

  const handleDeletePreset = async (presetId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
    try {
      await client.delete(`/products/${presetId}`);
      setProductPresets(prev => prev.filter(p => String(p.id) !== String(presetId)));
      if (String(selectedPresetId) === String(presetId)) {
        setSelectedPresetId('');
        setSelectedPreset(null);
      }
    } catch (e) {
      setError('Error al eliminar: ' + (e.response?.data?.error || e.message));
    }
  };

  // --- Files ---
  const handleFileChange = (e) => {
    setFiles(prev => [...prev, ...Array.from(e.target.files)]);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
  };
  const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  // --- Campaign Name ---
  const generateCampaignName = (dateOverride) => {
    const d = dateOverride || date;
    const name = selectedPreset?.name || 'Producto';
    if (!d) return '';
    const tipo = detectedType === 'videos' ? 'Videos' :
                 detectedType === 'estaticos' ? 'Estaticos' : 'Mixto';
    const template = settings?.naming_template || '{producto} {fecha} [CBO Testeo {tipo}]';
    return template.replace('{producto}', name).replace('{fecha}', d).replace('{tipo}', tipo);
  };

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(campaignSearch.toLowerCase())
  );

  const handlePublishNew = async () => {
    setError('');
    setSuccess('');

    if (!selectedPreset) { setError('Seleccioná un producto primero'); return; }
    if (files.length === 0) { setError('Subí al menos un creativo'); return; }
    if (!date) { setError('Seleccioná una fecha'); return; }
    if (!campaignTexts.body.trim()) { setError('Ingresá el texto principal del anuncio'); return; }
    if (!campaignLink.trim()) { setError('Ingresá el link de destino'); return; }
    if (!campaignTexts.titles.some(t => t.trim())) { setError('Ingresá al menos un titular'); return; }

    setLoading(true);
    try {
      const formData = new FormData();

      // Agregar archivos
      files.forEach(f => formData.append('files', f));

      // Agregar metadatos
      formData.append('ad_account_id', selectedPreset.ad_account_id);
      formData.append('campaign_name', `${selectedPreset.name} ${date}`);
      formData.append('start_date', date);
      formData.append('campaign_hour', campaignHour);
      formData.append('daily_budget', budget);
      formData.append('body_text', campaignTexts.body);
      formData.append('title_text', JSON.stringify(campaignTexts.titles.filter(t => t.trim())));
      formData.append('description_text', JSON.stringify(campaignTexts.descriptions.filter(d => d.trim())));
      formData.append('cta_type', campaignCta);
      formData.append('destination_url', campaignLink);
      formData.append('campaign_objective', campaignObjective);

      const res = await client.post('/meta/publish-new', formData);

      setSuccess(`Campaña "${res.data.campaign_name}" publicada exitosamente!`);
      // Reset form
      setFiles([]);
      setCampaignTexts({ body: '', titles: ['', ''], descriptions: ['', ''] });
      setCampaignLink('');
      setCampaignCta('SHOP_NOW');
      setCampaignObjective('OUTCOME_SALES');
      setDate(getTomorrowDate());
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setError('');
    setSuccess('');

    if (!selectedPreset) { setError('Seleccioná un producto primero'); return; }
    if (files.length === 0) { setError('Subí al menos un creativo'); return; }
    if (!date) { setError('Seleccioná una fecha'); return; }
    if (!selectedPreset.base_campaign_id) { setError('Este producto no tiene campaña base configurada'); return; }
    if (isPublishing) { setError('Ya hay una publicación en curso. Esperá a que termine.'); return; }

    if (batchMode && batchDays > 1) {
      const perDay = Math.floor(files.length / batchDays);
      if (perDay === 0) {
        setError(`Necesitás al menos ${batchDays} archivos para ${batchDays} días`);
        return;
      }
    }

    // Dispatch to global context — runs in background even if user navigates away
    const dates = batchMode && batchDays > 1 ? generateDates(date, batchDays) : [date];
    startPublish({
      preset: selectedPreset,
      files: [...files],
      dates,
      budget,
      campaignHour,
      settings,
      generateName: generateCampaignName,
      batchMode,
      batchDays,
    });

    // Reset form so user can start another
    setSuccess('Publicación iniciada — podés seguir navegando, el progreso se muestra abajo a la derecha.');
    setFiles([]);
  };

  // --- Render ---
  if (loadingStatus) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-violet-500 mb-3" size={32} />
        <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
      </div>
    );
  }

  const isReady = selectedPreset && files.length > 0 && date && metaConnected;
  const currentStepNum = selectedPreset ? (files.length > 0 ? (date ? 3 : 2) : 1) : 0;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{t('upload.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('upload.subtitle')}</p>
      </div>

      {/* MODE SELECTOR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Mode 1: Duplicate */}
        <button
          onClick={() => {
            setMode('duplicate');
            setError('');
            setSuccess('');
          }}
          className={`p-6 rounded-xl border-2 text-left mode-card ${
            mode === 'duplicate'
              ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/30 shadow-md ring-2 ring-violet-200 dark:ring-violet-900 active'
              : 'border-gray-200 dark:border-slate-600 hover:border-violet-300 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <Copy size={24} className={`mode-icon ${mode === 'duplicate' ? 'text-violet-600' : 'text-gray-400 dark:text-gray-500'}`} />
            {mode === 'duplicate' && <CheckCircle size={20} className="text-violet-600" />}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('upload.duplicate')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Clona una campaña existente reemplazando los creativos</p>
        </button>

        {/* Mode 2: Create New */}
        <button
          onClick={() => {
            setMode('create_new');
            setError('');
            setSuccess('');
          }}
          className={`p-6 rounded-xl border-2 text-left mode-card ${
            mode === 'create_new'
              ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/30 shadow-md ring-2 ring-violet-200 dark:ring-violet-900 active'
              : 'border-gray-200 dark:border-slate-600 hover:border-violet-300 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <PlusCircle size={24} className={`mode-icon ${mode === 'create_new' ? 'text-violet-600' : 'text-gray-400 dark:text-gray-500'}`} />
            {mode === 'create_new' && <CheckCircle size={20} className="text-violet-600" />}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t('upload.create')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Crea una campaña desde cero con configuración personalizada</p>
        </button>
      </div>

      {/* Meta warning */}
      {!metaConnected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6 flex items-start space-x-3 fade-in-up">
          <AlertCircle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200">{t('meta.notConnected')}</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Conecta tu cuenta en{' '}
              <button onClick={() => navigate('/dashboard/integration')} className="underline font-semibold hover:text-amber-900 dark:hover:text-amber-100">Integración</button>.
            </p>
          </div>
        </div>
      )}

      {/* No ad accounts warning */}
      {metaConnected && adAccounts.length === 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mb-6 flex items-start space-x-3 fade-in-up">
          <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-200">No se encontraron cuentas publicitarias</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              Tu cuenta de Meta está conectada, pero no tiene cuentas publicitarias asociadas.
              Para crear campañas necesitás al menos una cuenta publicitaria en{' '}
              <a href="https://business.facebook.com/settings/ad-accounts" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-red-900 dark:hover:text-red-100">Meta Business Suite</a>.
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Si ya tenés una cuenta publicitaria, probá desconectar y volver a conectar Meta desde{' '}
              <button onClick={() => navigate('/dashboard/integration')} className="underline font-semibold hover:text-red-800 dark:hover:text-red-200">Integración</button>{' '}
              para actualizar los permisos.
            </p>
          </div>
        </div>
      )}

      {/* ========== MODE 1: DUPLICATE CAMPAIGN ========== */}
      {mode === 'duplicate' && (
        <>
      {/* Step indicator mini bar */}
      <div className="flex items-center space-x-2 mb-6">
        {[1,2,3].map(n => (
          <div key={n} className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              currentStepNum >= n
                ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500'
            }`}>{n}</div>
            <span className={`text-sm font-medium hidden sm:inline transition-colors ${
              currentStepNum >= n ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {n === 1 ? t('upload.stepProduct') : n === 2 ? t('upload.stepCreatives') : t('upload.stepPublish')}
            </span>
            {n < 3 && <ArrowRight size={14} className="text-gray-300 dark:text-gray-600 mx-1" />}
          </div>
        ))}
      </div>

      {/* ========== STEP 1: Select Product ========== */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-4 transition-all duration-300">
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
            selectedPreset ? 'bg-green-500 text-white' : 'bg-violet-100 dark:bg-violet-900/50 text-violet-700'
          }`}>
            {selectedPreset ? <Check size={16} strokeWidth={3} /> : '1'}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('upload.step1')}</h2>
          <Tooltip text="Seleccioná un producto existente o creá uno nuevo. Cada producto tiene su campaña base y presupuesto.">
            <HelpCircle size={15} className="text-gray-400 dark:text-gray-500 hover:text-violet-500 transition cursor-help" />
          </Tooltip>
          {selectedPreset && (
            <span className="ml-auto text-sm text-violet-600 font-medium bg-violet-50 dark:bg-violet-900/30 px-3 py-1 rounded-full">
              {selectedPreset.name}
            </span>
          )}
        </div>

        {productPresets.length > 0 && !showNewPreset ? (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {productPresets.map(p => (
                editingPresetId === p.id ? (
                  // Edit form — full fields (spans 2 columns on md+)
                  <div key={p.id} className="p-4 rounded-xl border-2 border-violet-300 bg-violet-50 dark:bg-violet-900/20 space-y-3 fade-in-up col-span-2 sm:col-span-2 md:col-span-2">
                    <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wider flex items-center space-x-1">
                      <Pencil size={12} /><span>Editar producto</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                        <input
                          type="text"
                          value={editPresetName}
                          onChange={(e) => setEditPresetName(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Presupuesto ({currencySymbol}/día)
                        </label>
                        <input
                          type="number"
                          value={editPresetBudget}
                          onChange={(e) => setEditPresetBudget(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none"
                          min="1"
                        />
                      </div>
                    </div>
                    {adAccounts.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cuenta publicitaria</label>
                        <select
                          value={editPresetAccount}
                          onChange={(e) => handleEditAccountChange(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none"
                        >
                          <option value="">-- Seleccionar cuenta --</option>
                          {adAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name || acc.id}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {editPresetAccount && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Campaña base (para duplicar)</label>
                        {editLoadingCampaigns ? (
                          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-xs py-2">
                            <Loader2 className="animate-spin" size={12} />
                            <span>{t('upload.loading')}</span>
                          </div>
                        ) : (
                          <div>
                            <input
                              type="text"
                              value={editCampaignSearch}
                              onChange={(e) => setEditCampaignSearch(e.target.value)}
                              placeholder="Buscar campaña..."
                              className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white mb-1.5 focus:ring-2 focus:ring-violet-600 outline-none"
                            />
                            <select
                              value={editPresetCampaign}
                              onChange={(e) => setEditPresetCampaign(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none"
                              size={Math.min(filteredEditCampaigns.length + 1, 4)}
                            >
                              <option value="">-- Seleccionar --</option>
                              {filteredEditCampaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Link del producto
                        <Tooltip text="URL de destino del anuncio (ej: tu tienda online). Obligatorio para campañas de ventas/tráfico." />
                      </label>
                      <input
                        type="url"
                        value={editPresetLink}
                        onChange={(e) => setEditPresetLink(e.target.value)}
                        placeholder="https://tutienda.com/producto"
                        className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none"
                      />
                      {!editPresetLink && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Recomendado: sin link, las campañas de ventas pueden fallar.</p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleSaveEdit}
                        disabled={savingEdit}
                        className="flex-1 px-2 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center space-x-1"
                      >
                        {savingEdit ? <><Loader2 size={12} className="animate-spin" /><span>{t('upload.saving')}</span></> : <span>{t('common.save')}</span>}
                      </button>
                      <button
                        onClick={() => setEditingPresetId(null)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeletePreset(p.id)}
                      className="w-full text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-semibold transition flex items-center justify-center space-x-1"
                    >
                      <Trash2 size={11} /><span>Eliminar producto</span>
                    </button>
                  </div>
                ) : (
                  // View mode
                  <div
                    key={p.id}
                    onClick={() => handleSelectPreset(String(p.id))}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md group cursor-pointer relative ${
                      String(selectedPresetId) === String(p.id)
                        ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/30 shadow-md ring-2 ring-violet-200 dark:ring-violet-900'
                        : 'border-gray-200 dark:border-slate-700 hover:border-violet-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Package size={20} className={`transition-colors ${
                        String(selectedPresetId) === String(p.id) ? 'text-violet-600' : 'text-gray-400 dark:text-gray-500 group-hover:text-violet-400'
                      }`} />
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                        {String(selectedPresetId) === String(p.id) && (
                          <CheckCircle size={16} className="text-violet-600" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(p);
                          }}
                          className="p-1 rounded hover:bg-violet-100 dark:hover:bg-violet-900/40 transition"
                          title="Editar"
                        >
                          <MoreVertical size={14} className="text-gray-500 dark:text-gray-400 hover:text-violet-600" />
                        </button>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{p.base_campaign_name || 'Sin campaña base'}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {currencySymbol}
                      {p.daily_budget}/día
                    </p>
                  </div>
                )
              ))}
              <button
                onClick={() => setShowNewPreset(true)}
                className="p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-600 text-center hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all flex flex-col items-center justify-center group"
              >
                <Plus size={24} className="text-gray-400 dark:text-gray-500 mb-1 group-hover:text-violet-500 transition-colors" />
                <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-violet-600 transition-colors">Nuevo producto</p>
              </button>
            </div>
          </div>
        ) : (
          /* New Preset Form */
          <div className="space-y-4 fade-in-up">
            {productPresets.length > 0 && (
              <button onClick={() => setShowNewPreset(false)} className="text-sm text-violet-600 hover:text-violet-800 dark:hover:text-violet-400 mb-2 flex items-center space-x-1">
                <ChevronUp size={14} className="rotate-[-90deg]" /><span>Volver a productos</span>
              </button>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del producto</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none transition"
                placeholder="Ej: Probiotico, Crema Facial..."
              />
            </div>
            {adAccounts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cuenta publicitaria</label>
                <select
                  value={newPresetAccount}
                  onChange={(e) => setNewPresetAccount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none"
                >
                  <option value="">-- Seleccionar cuenta --</option>
                  {adAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name || acc.id}</option>
                  ))}
                </select>
              </div>
            )}
            {newPresetAccount && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center space-x-1.5">
                  <span>Campaña base (para duplicar)</span>
                  <Tooltip text="AdPilot duplica esta campaña con sus conjuntos y anuncios, reemplazando los creativos por los que subas.">
                    <HelpCircle size={13} className="text-gray-400 dark:text-gray-500 hover:text-violet-500 transition cursor-help" />
                  </Tooltip>
                </label>
                {loadingCampaigns ? (
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-sm py-2">
                    <Loader2 className="animate-spin" size={14} />
                    <span>Cargando campañas...</span>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={campaignSearch}
                      onChange={(e) => setCampaignSearch(e.target.value)}
                      placeholder="Buscar campaña..."
                      className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white mb-2 focus:ring-2 focus:ring-violet-600 outline-none"
                    />
                    <select
                      value={newPresetCampaign}
                      onChange={(e) => setNewPresetCampaign(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none"
                      size={Math.min(filteredCampaigns.length + 1, 5)}
                    >
                      <option value="">-- Seleccionar --</option>
                      {filteredCampaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
                      ))}
                    </select>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center space-x-1">
                      <AlertCircle size={12} />
                      <span>Asegurate de elegir una campaña que tenga conjuntos de anuncios y anuncios adentro</span>
                    </p>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('upload.dailyBudget')} ({currencySymbol})
              </label>
              <input
                type="number"
                value={newPresetBudget}
                onChange={(e) => setNewPresetBudget(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none"
                min="1"
              />
            </div>
            <button
              onClick={handleSaveNewPreset}
              disabled={savingPreset}
              className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-semibold hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {savingPreset ? <><Loader2 size={16} className="animate-spin" /><span>{t('upload.saving')}</span></> : <span>{t('upload.saveProduct')}</span>}
            </button>
          </div>
        )}
      </div>

      {/* ========== STEP 2: Upload Creatives ========== */}
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-4 transition-all duration-300 ${!selectedPreset ? 'opacity-40 pointer-events-none scale-[0.99]' : ''}`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
            files.length > 0 ? 'bg-green-500 text-white' : 'bg-violet-100 dark:bg-violet-900/50 text-violet-700'
          }`}>
            {files.length > 0 ? <Check size={16} strokeWidth={3} /> : '2'}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('upload.step2')}</h2>
          <Tooltip text="Subí imágenes o videos que serán los anuncios. Se detecta automáticamente si son videos, estáticos o mixtos.">
            <HelpCircle size={15} className="text-gray-400 dark:text-gray-500 hover:text-violet-500 transition cursor-help" />
          </Tooltip>
          {detectedType && (
            <span className={`ml-auto flex items-center space-x-1.5 text-sm px-3 py-1 rounded-full ${
              detectedType === 'videos' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' :
              detectedType === 'estaticos' ? 'bg-green-50 dark:bg-green-900/30 text-green-600' :
              'bg-purple-50 dark:bg-purple-900/30 text-purple-600'
            }`}>
              {detectedType === 'videos' ? <Film size={14} /> : <Image size={14} />}
              <span className="font-medium">{files.length} {detectedType === 'videos' ? 'Videos' : detectedType === 'estaticos' ? 'Estaticos' : 'Mixto'}</span>
            </span>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer text-center ${
            isDragging
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 scale-[1.01]'
              : 'border-gray-300 dark:border-slate-600 hover:border-violet-400 hover:bg-gray-50 dark:hover:bg-slate-700'
          }`}
        >
          <div className={`transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}>
            <UploadIcon className={`mx-auto mb-3 transition-colors ${isDragging ? 'text-violet-500' : 'text-gray-400 dark:text-gray-500'}`} size={32} />
          </div>
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
            {isDragging ? 'Soltar archivos aqui' : 'Arrastra tus creativos aqui'}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-3">o</p>
          <label className="inline-block cursor-pointer">
            <input type="file" multiple onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
            <span className="inline-block px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition shadow-sm pointer-events-none">
              Seleccionar archivos
            </span>
          </label>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Videos e imagenes — el tipo se detecta automaticamente</p>
        </div>

        {/* File list with thumbnails */}
        {files.length > 0 && (
          <div className="mt-4 fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {files.length} archivo{files.length !== 1 ? 's' : ''}{' '}
                <span className="text-gray-400 dark:text-gray-500">({(files.reduce((a, f) => a + f.size, 0) / 1024 / 1024).toFixed(1)} MB total)</span>
              </span>
              <button onClick={() => setFiles([])} className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium">Limpiar todo</button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {files.map((file, i) => (
                <div key={i} className="flex items-center space-x-3 py-2 px-3 bg-gray-50 dark:bg-slate-700 rounded-xl text-sm group hover:bg-gray-100 dark:hover:bg-slate-600 transition">
                  <FileThumbnail file={file} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-gray-700 dark:text-gray-300 font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                      {batchMode && batchDays > 1 && (
                        <span className="text-violet-500 ml-2">
                          Dia {Math.min(Math.floor(i / Math.max(1, Math.floor(files.length / batchDays))) + 1, batchDays)}
                        </span>
                      )}
                    </p>
                  </div>
                  <button onClick={() => removeFile(i)} className="text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========== STEP 3: Publish ========== */}
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-4 transition-all duration-300 ${!selectedPreset || files.length === 0 ? 'opacity-40 pointer-events-none scale-[0.99]' : ''}`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-700 font-bold text-sm">3</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('upload.step4')}</h2>
          <Tooltip text="Elegí la fecha y presupuesto. Se duplicará la campaña base en Meta con los creativos que subiste.">
            <HelpCircle size={15} className="text-gray-400 dark:text-gray-500 hover:text-violet-500 transition cursor-help" />
          </Tooltip>
        </div>

        {/* Date + Hour + Budget row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t('upload.startDate')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none transition"
            />
            {settings?.start_date_mode === 'next_day' && (
              <p className="text-xs text-violet-500 mt-1 flex items-center space-x-1">
                <Zap size={10} /><span>Auto: dia siguiente</span>
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Hora</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={campaignHour}
                onChange={(e) => setCampaignHour(String(Math.max(0, Math.min(23, parseInt(e.target.value) || 0))))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none transition text-center font-semibold"
                min="0"
                max="23"
              />
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">:00</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Presupuesto diario ({currencySymbol})
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none transition"
              min="1"
            />
          </div>
        </div>

        {/* Advanced: batch mode */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 mb-3 transition"
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>Opciones avanzadas</span>
        </button>

        {showAdvanced && (
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 mb-4 fade-in-up">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={batchMode}
                onChange={() => setBatchMode(!batchMode)}
                className="w-4 h-4 text-violet-600 rounded accent-violet-600"
              />
              <CalendarPlus size={16} className="text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('upload.batchMode')}</span>
            </label>
            {batchMode && (
              <div className="mt-3 flex items-center space-x-3 fade-in-up">
                <label className="text-xs text-gray-600 dark:text-gray-400">{t('upload.days')}:</label>
                <input
                  type="number"
                  value={batchDays}
                  onChange={(e) => setBatchDays(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-16 px-2 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-600 dark:text-white"
                  min="2" max="30"
                />
                {files.length > 0 && (
                  <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                    {Math.floor(files.length / batchDays)} creativos/dia — {generateDates(date, batchDays).map(formatDateShort).join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Campaign name preview */}
        {selectedPreset && date && (
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-xl px-4 py-3 mb-5 border border-violet-100 dark:border-violet-900/40">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nombre de la campaña:</p>
            {batchMode && batchDays > 1 ? (
              generateDates(date, batchDays).map((d, i) => (
                <p key={i} className="text-sm font-semibold text-gray-900 dark:text-white">{generateCampaignName(d)}</p>
              ))
            ) : (
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{generateCampaignName()}</p>
            )}
            <div className="flex items-center space-x-1.5 mt-2">
              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                <Copy size={10} /><span>Duplica</span>
              </div>
              <ArrowRight size={10} className="text-gray-400 dark:text-gray-600" />
              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                <UploadCloud size={10} /><span>Reemplaza {files.length} creativo{files.length !== 1 ? 's' : ''}</span>
              </div>
              <ArrowRight size={10} className="text-gray-400 dark:text-gray-600" />
              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                <Zap size={10} /><span>Activa</span>
              </div>
            </div>
          </div>
        )}

        {/* Error/Success */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-xl p-3.5 text-sm text-red-700 dark:text-red-400 mb-4 flex items-start space-x-2 fade-in-up">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-xl p-3.5 text-sm text-green-700 dark:text-green-400 flex items-center space-x-2 mb-4 fade-in-up">
            <CheckCircle size={16} className="text-green-500" /><span className="font-medium">{success}</span>
          </div>
        )}

        <button
          onClick={handlePublish}
          disabled={loading || !isReady}
          className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
            isReady && !loading
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 active:translate-y-0'
              : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          <Rocket size={18} />
          <span>
            {loading ? t('publish.step.launch') :
             batchMode && batchDays > 1 ? `${t('upload.step4')} ${batchDays} ${t('campaigns.title')}` :
             t('upload.step4')}
          </span>
        </button>

        {!metaConnected && <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">{t('settings.connectMeta')}</p>}
      </div>
        </>
      )}

      {/* ========== MODE 2: CREATE NEW CAMPAIGN ========== */}
      {mode === 'create_new' && (
        <div className="space-y-6">
          {/* Product Selection */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-violet-100 dark:bg-violet-900/50 text-violet-700">
                1
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Elegir Producto (para datos de la cuenta)</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {productPresets.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(String(p.id))}
                  className={`p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md group cursor-pointer ${
                    String(selectedPresetId) === String(p.id)
                      ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/30 shadow-md ring-2 ring-violet-200 dark:ring-violet-900'
                      : 'border-gray-200 dark:border-slate-700 hover:border-violet-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Package size={20} className={`transition-colors ${
                      String(selectedPresetId) === String(p.id) ? 'text-violet-600' : 'text-gray-400 dark:text-gray-500 group-hover:text-violet-400'
                    }`} />
                    {String(selectedPresetId) === String(p.id) && <Check size={16} className="text-violet-600" strokeWidth={3} />}
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {currencySymbol}{p.daily_budget}/día
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Campaign Details */}
          {selectedPreset && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 fade-in-up">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-violet-100 dark:bg-violet-900/50 text-violet-700">
                    2
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('upload.step3')}</h2>
                </div>
                <button
                  onClick={saveAdTextsToProduct}
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/50 transition border border-violet-200 dark:border-violet-800"
                  title={t('upload.setDefault')}
                >
                  <Star size={12} />
                  <span>{t('upload.setDefault')}</span>
                </button>
              </div>

              {selectedPreset.default_body && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 mb-4 flex items-center space-x-2">
                  <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">Textos cargados desde los predeterminados de <strong>{selectedPreset.name}</strong></p>
                </div>
              )}

              {/* STEP 1: Link de destino FIRST */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🔗 {t('upload.link')} (requerido — se usa para generar textos con IA)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={campaignLink}
                    onChange={(e) => handleLinkChange(e.target.value)}
                    placeholder="https://tutienda.com/producto"
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none transition"
                  />
                  {campaignLink.trim() && (
                    <span className="flex items-center px-2 text-emerald-500">
                      <CheckCircle size={16} />
                    </span>
                  )}
                </div>
                {campaignLink.trim() && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">✓ Link guardado automáticamente en el producto</p>
                )}
              </div>

              {/* Generate ALL with AI button */}
              {campaignLink.trim() && (
                <div className="mb-5 fade-in-up">
                  <button
                    onClick={handleAiGenerateAll}
                    disabled={aiGenerating.all}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {aiGenerating.all ? (
                      <><Loader2 size={18} className="animate-spin" /><span>{t('upload.generating')}</span></>
                    ) : (
                      <><Sparkles size={18} className="ai-sparkle" /><span>{t('upload.generateAll')}</span></>
                    )}
                  </button>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-1.5">Genera texto principal, titular y descripción basados en tu link y producto</p>
                </div>
              )}

              {/* Two-column: Text fields + Live Preview */}
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Left: Text fields */}
                <div className="flex-1 space-y-4">
                  {/* Texto principal */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('upload.mainText')}</label>
                      <AIButton onClick={() => handleAiGenerate('body')} loading={aiGenerating.body} label={t('upload.generateAI')} />
                    </div>
                    <textarea
                      value={campaignTexts.body}
                      onChange={(e) => setCampaignTexts({...campaignTexts, body: e.target.value})}
                      placeholder="El texto largo que aparece arriba de la imagen..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none transition resize-none"
                      rows={4}
                    />
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{campaignTexts.body.length} caracteres</p>
                  </div>

                  {/* Titulares */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('upload.headline')}</label>
                      <AIButton onClick={() => handleAiGenerate('titles')} loading={aiGenerating.titles} label={t('upload.generateAI')} />
                    </div>
                    <div className="space-y-2">
                      {campaignTexts.titles.map((title, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 w-5 h-5 flex items-center justify-center bg-gray-100 dark:bg-slate-700 rounded">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => {
                              const newTitles = [...campaignTexts.titles];
                              newTitles[idx] = e.target.value;
                              setCampaignTexts({...campaignTexts, titles: newTitles});
                            }}
                            placeholder="Texto corto y llamativo debajo de la imagen"
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none transition"
                          />
                          {campaignTexts.titles.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newTitles = campaignTexts.titles.filter((_, i) => i !== idx);
                                setCampaignTexts({...campaignTexts, titles: newTitles});
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCampaignTexts({...campaignTexts, titles: [...campaignTexts.titles, '']})}
                      className="mt-2 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1 transition"
                    >
                      <Plus size={14} />
                      Agregar
                    </button>
                  </div>

                  {/* Descripciones */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Descripciones</label>
                      <AIButton onClick={() => handleAiGenerate('descriptions')} loading={aiGenerating.descriptions} label="IA" />
                    </div>
                    <div className="space-y-2">
                      {campaignTexts.descriptions.map((desc, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 w-5 h-5 flex items-center justify-center bg-gray-100 dark:bg-slate-700 rounded">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={desc}
                            onChange={(e) => {
                              const newDescs = [...campaignTexts.descriptions];
                              newDescs[idx] = e.target.value;
                              setCampaignTexts({...campaignTexts, descriptions: newDescs});
                            }}
                            placeholder="Texto secundario junto al botón CTA"
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none transition"
                          />
                          {campaignTexts.descriptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newDescs = campaignTexts.descriptions.filter((_, i) => i !== idx);
                                setCampaignTexts({...campaignTexts, descriptions: newDescs});
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCampaignTexts({...campaignTexts, descriptions: [...campaignTexts.descriptions, '']})}
                      className="mt-2 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1 transition"
                    >
                      <Plus size={14} />
                      Agregar
                    </button>
                  </div>

                  {/* CTA + Objective row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">CTA</label>
                      <select
                        value={campaignCta}
                        onChange={(e) => setCampaignCta(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none transition"
                      >
                        <option value="SHOP_NOW">Comprar ahora</option>
                        <option value="LEARN_MORE">Más información</option>
                        <option value="SIGN_UP">Registrarse</option>
                        <option value="CONTACT_US">Contactanos</option>
                        <option value="SUBSCRIBE">Suscribirse</option>
                        <option value="GET_OFFER">Obtener oferta</option>
                        <option value="ORDER_NOW">Pedir ahora</option>
                        <option value="BOOK_NOW">Reservar</option>
                        <option value="WATCH_MORE">Ver más</option>
                        <option value="APPLY_NOW">Aplicar</option>
                        <option value="DOWNLOAD">Descargar</option>
                        <option value="NO_BUTTON">Sin botón</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Objetivo</label>
                      <select
                        value={campaignObjective}
                        onChange={(e) => setCampaignObjective(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none transition"
                      >
                        <option value="OUTCOME_SALES">Ventas</option>
                        <option value="OUTCOME_TRAFFIC">Tráfico</option>
                        <option value="OUTCOME_ENGAGEMENT">Interacción</option>
                        <option value="OUTCOME_LEADS">Leads</option>
                        <option value="OUTCOME_AWARENESS">Reconocimiento</option>
                        <option value="OUTCOME_APP_PROMOTION">App</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right: Live Facebook Ad Preview */}
                <div className="lg:w-[340px] flex-shrink-0">
                  <div className="sticky top-20">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                      <Eye size={12} />
                      <span>{t('upload.livePreview')}</span>
                    </p>
                    <LiveAdPreview
                      body={campaignTexts.body}
                      titles={campaignTexts.titles}
                      descriptions={campaignTexts.descriptions}
                      cta={campaignCta}
                      link={campaignLink}
                      productName={selectedPreset?.name}
                      previewFile={files.length > 0 ? files[0] : null}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-xl p-3">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>Segmentación:</strong> Se usará la segmentación predeterminada de tu cuenta.
                </p>
              </div>
            </div>
          )}

          {/* Upload Creatives */}
          {selectedPreset && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 fade-in-up">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-violet-100 dark:bg-violet-900/50 text-violet-700">
                  3
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('upload.step2')}</h2>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer text-center ${
                  isDragging
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 scale-[1.01]'
                    : 'border-gray-300 dark:border-slate-600 hover:border-violet-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                }`}
              >
                <div className={`transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}>
                  <UploadIcon className={`mx-auto mb-3 transition-colors ${isDragging ? 'text-violet-500' : 'text-gray-400 dark:text-gray-500'}`} size={32} />
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                  {isDragging ? 'Soltar archivos aqui' : 'Arrastra tus creativos aqui'}
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mb-3">o</p>
                <label className="inline-block cursor-pointer">
                  <input type="file" multiple onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
                  <span className="inline-block px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 transition shadow-sm pointer-events-none">
                    Seleccionar archivos
                  </span>
                </label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Videos e imagenes — el tipo se detecta automaticamente</p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-4 fade-in-up">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {files.length} archivo{files.length !== 1 ? 's' : ''}{' '}
                      <span className="text-gray-400 dark:text-gray-500">({(files.reduce((a, f) => a + f.size, 0) / 1024 / 1024).toFixed(1)} MB total)</span>
                    </span>
                    <button onClick={() => setFiles([])} className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium">Limpiar todo</button>
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center space-x-3 py-2 px-3 bg-gray-50 dark:bg-slate-700 rounded-xl text-sm group hover:bg-gray-100 dark:hover:bg-slate-600 transition">
                        <FileThumbnail file={file} />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-gray-700 dark:text-gray-300 font-medium text-sm">{file.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                        <button onClick={() => removeFile(i)} className="text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date + Budget */}
          {selectedPreset && files.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 fade-in-up">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-violet-100 dark:bg-violet-900/50 text-violet-700">
                  4
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('upload.step4')}</h2>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t('upload.startDate')}</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Hora</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={campaignHour}
                      onChange={(e) => setCampaignHour(String(Math.max(0, Math.min(23, parseInt(e.target.value) || 0))))}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none transition text-center font-semibold"
                      min="0"
                      max="23"
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">:00</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    {t('upload.dailyBudget')} ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-violet-600 outline-none transition"
                    min="1"
                  />
                </div>
              </div>

              {/* Error/Success */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-xl p-3.5 text-sm text-red-700 dark:text-red-400 mb-4 flex items-start space-x-2 fade-in-up">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-xl p-3.5 text-sm text-green-700 dark:text-green-400 flex items-center space-x-2 mb-4 fade-in-up">
                  <CheckCircle size={16} className="text-green-500" /><span className="font-medium">{success}</span>
                </div>
              )}

              <button
                onClick={handlePublishNew}
                disabled={loading || !selectedPreset || files.length === 0 || !date || !campaignTexts.body.trim() || !campaignLink.trim()}
                className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 ${
                  selectedPreset && files.length > 0 && date && campaignTexts.body.trim() && campaignLink.trim() && !loading
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-violet-200 hover:-translate-y-0.5 active:translate-y-0'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                <Rocket size={18} />
                <span>{loading ? t('publish.step.create') : t('upload.createCampaign')}</span>
              </button>

              {!metaConnected && <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-3">{t('settings.connectMeta')}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
