import { createContext, useState, useEffect, useContext, useCallback } from 'react';

const CurrencyContext = createContext();

// Fallback rate if API fails — approximate dólar cripto venta
const FALLBACK_ARS_PER_USD = 1350;

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => localStorage.getItem('adpilot-currency') || 'ARS');
  const [exchangeRate, setExchangeRate] = useState(() => {
    const saved = localStorage.getItem('adpilot-exchange-rate');
    return saved ? parseFloat(saved) : FALLBACK_ARS_PER_USD;
  });
  const [rateLoading, setRateLoading] = useState(false);
  const [rateSource, setRateSource] = useState('');
  const [lastFetched, setLastFetched] = useState(null);

  // Fetch dólar cripto rate
  const fetchRate = useCallback(async () => {
    setRateLoading(true);
    try {
      // Try DolarAPI.com first (Argentine dollar rates)
      const res = await fetch('https://dolarapi.com/v1/dolares/cripto');
      if (res.ok) {
        const data = await res.json();
        if (data && data.venta) {
          const rate = parseFloat(data.venta);
          setExchangeRate(rate);
          setRateSource('Dólar Cripto (DolarAPI)');
          localStorage.setItem('adpilot-exchange-rate', String(rate));
          localStorage.setItem('adpilot-rate-source', 'dolarapi-cripto');
          localStorage.setItem('adpilot-rate-fetched', new Date().toISOString());
          setLastFetched(new Date());
          setRateLoading(false);
          return;
        }
      }
    } catch (err) {
      console.log('DolarAPI failed, trying fallback...');
    }

    try {
      // Fallback: DolarAPI blue rate
      const res = await fetch('https://dolarapi.com/v1/dolares/blue');
      if (res.ok) {
        const data = await res.json();
        if (data && data.venta) {
          const rate = parseFloat(data.venta);
          setExchangeRate(rate);
          setRateSource('Dólar Blue (DolarAPI)');
          localStorage.setItem('adpilot-exchange-rate', String(rate));
          localStorage.setItem('adpilot-rate-source', 'dolarapi-blue');
          localStorage.setItem('adpilot-rate-fetched', new Date().toISOString());
          setLastFetched(new Date());
          setRateLoading(false);
          return;
        }
      }
    } catch (err) {
      console.log('Blue rate failed too, using fallback');
    }

    // Use fallback
    setRateSource('Estimado (sin conexión)');
    setRateLoading(false);
  }, []);

  // Fetch rate on mount and every 30 minutes
  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRate]);

  const setCurrency = (val) => {
    setCurrencyState(val);
    localStorage.setItem('adpilot-currency', val);
  };

  const toggleCurrency = () => {
    setCurrency(currency === 'ARS' ? 'USD' : 'ARS');
  };

  // Convert USD amount to display currency
  // Meta API always returns values in the ad account's currency (usually USD for most accounts)
  // This function takes a USD value and converts to ARS if needed
  const convertFromUSD = useCallback((usdAmount) => {
    if (!usdAmount && usdAmount !== 0) return 0;
    const num = parseFloat(usdAmount);
    if (currency === 'USD') return num;
    return Math.round(num * exchangeRate * 100) / 100;
  }, [currency, exchangeRate]);

  // Convert display currency back to USD (for sending to API)
  const convertToUSD = useCallback((displayAmount) => {
    if (!displayAmount && displayAmount !== 0) return 0;
    const num = parseFloat(displayAmount);
    if (currency === 'USD') return num;
    return Math.round((num / exchangeRate) * 100) / 100;
  }, [currency, exchangeRate]);

  // Format a value with currency symbol
  const formatPrice = useCallback((usdAmount, opts = {}) => {
    const { decimals = 2, fromUSD = true } = opts;
    const val = fromUSD ? convertFromUSD(usdAmount) : parseFloat(usdAmount);
    const symbol = currency === 'ARS' ? '$' : 'US$';
    const formatted = val.toLocaleString('es-AR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return `${symbol}${formatted}`;
  }, [currency, convertFromUSD]);

  // Get just the symbol
  const currencySymbol = currency === 'ARS' ? '$' : 'US$';

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      toggleCurrency,
      exchangeRate,
      rateLoading,
      rateSource,
      lastFetched,
      fetchRate,
      convertFromUSD,
      convertToUSD,
      formatPrice,
      currencySymbol
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
