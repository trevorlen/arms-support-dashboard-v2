/**
 * Currency Conversion Service
 * Fetches USD to CAD exchange rates with caching
 */

const CACHE_KEY = 'usd_cad_exchange_rate';
const CACHE_TIMESTAMP_KEY = 'usd_cad_rate_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const FALLBACK_RATE = 1.36; // Fallback rate if API fails

/**
 * Get USD to CAD exchange rate from cache if available and not expired
 */
const getCachedRate = () => {
  try {
    const cachedRate = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (cachedRate && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();

      // Check if cache is still valid (less than 24 hours old)
      if (now - timestamp < CACHE_DURATION) {
        return {
          rate: parseFloat(cachedRate),
          timestamp: new Date(timestamp),
          cached: true
        };
      }
    }
  } catch (error) {
    console.warn('Error reading cached exchange rate:', error);
  }

  return null;
};

/**
 * Cache exchange rate in localStorage
 */
const cacheRate = (rate) => {
  try {
    const timestamp = Date.now();
    localStorage.setItem(CACHE_KEY, rate.toString());
    localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString());
  } catch (error) {
    console.warn('Error caching exchange rate:', error);
  }
};

/**
 * Fetch USD to CAD exchange rate from exchangerate-api.com
 * Free tier: 1,500 requests/month, no API key required
 */
export const getUSDtoCADRate = async () => {
  // First, try to get from cache
  const cached = getCachedRate();
  if (cached) {
    console.log('Using cached USD/CAD rate:', cached.rate);
    return cached;
  }

  try {
    // Fetch from exchangerate-api.com (free, no API key needed)
    const response = await fetch('https://open.exchangerate-api.com/v6/latest/USD');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Extract CAD rate from response
    const rate = data.rates?.CAD;

    if (!rate || typeof rate !== 'number') {
      throw new Error('Invalid rate data received');
    }

    // Cache the rate
    cacheRate(rate);

    console.log('Fetched fresh USD/CAD rate:', rate);

    return {
      rate,
      timestamp: new Date(),
      cached: false
    };

  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    console.log('Using fallback rate:', FALLBACK_RATE);

    // Return fallback rate if fetch fails
    return {
      rate: FALLBACK_RATE,
      timestamp: new Date(),
      cached: false,
      error: error.message
    };
  }
};

/**
 * Force refresh the exchange rate (bypasses cache)
 */
export const refreshExchangeRate = async () => {
  // Clear cache
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch (error) {
    console.warn('Error clearing cache:', error);
  }

  // Fetch fresh rate
  return await getUSDtoCADRate();
};

/**
 * Clear cached exchange rate
 */
export const clearCachedRate = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  } catch (error) {
    console.warn('Error clearing cached rate:', error);
  }
};
