// Ticker to Sector Mapping Utility
// Maps stock ticker symbols to their GICS sectors
// Falls back to local mapping if API is unavailable

// Comprehensive mapping of common stocks to sectors
// Includes S&P 500, NASDAQ 100, and other commonly traded stocks
const TICKER_TO_SECTOR_MAP = {
  // Technology - Large Cap
  'AAPL': 'Technology',
  'MSFT': 'Technology',
  'GOOGL': 'Technology',
  'GOOG': 'Technology',
  'META': 'Technology',
  'NVDA': 'Technology',
  'AMD': 'Technology',
  'INTC': 'Technology',
  'TSM': 'Technology',
  'CRM': 'Technology',
  'ORCL': 'Technology',
  'ADBE': 'Technology',
  'AVGO': 'Technology',
  'CSCO': 'Technology',
  'QCOM': 'Technology',
  'TXN': 'Technology',
  'AMAT': 'Technology',
  'KLAC': 'Technology',
  'LRCX': 'Technology',
  'MU': 'Technology',
  // Technology - Software & Cloud
  'NOW': 'Technology',
  'WDAY': 'Technology',
  'VEEV': 'Technology',
  'ZM': 'Technology',
  'TEAM': 'Technology',
  'DOCN': 'Technology',
  'SNOW': 'Technology',
  'MDB': 'Technology',
  'DDOG': 'Technology',
  'NET': 'Technology',
  'ESTC': 'Technology',
  'GTLB': 'Technology',
  'CFLT': 'Technology',
  'TENB': 'Technology',
  'NTNX': 'Technology',
  'ASAN': 'Technology',
  'FROG': 'Technology',
  'RPD': 'Technology',
  'OKTA': 'Technology',
  'VRRM': 'Technology',
  'ONTO': 'Technology',
  'VRNS': 'Technology',
  'QLYS': 'Technology',
  'VRNT': 'Technology',
  'RDWR': 'Technology',
  'NCNO': 'Technology',
  'AVID': 'Technology',
  'FTNT': 'Technology',
  'ZS': 'Technology',
  'CHKP': 'Technology',
  'PANW': 'Technology',
  'CRWD': 'Technology',
  'ANET': 'Technology',
  // Technology - Fintech & Payments
  'SQ': 'Technology',
  'PYPL': 'Technology',
  'COIN': 'Technology',
  'HOOD': 'Technology',
  'SOFI': 'Technology',
  'UPST': 'Technology',
  'LC': 'Technology',
  'AFRM': 'Technology',
  'BILL': 'Technology',
  // Technology - Gaming & Entertainment
  'TTWO': 'Technology',
  'EA': 'Technology',
  'U': 'Technology',
  'DUOL': 'Technology',
  'PLTR': 'Technology',
  'ANET': 'Technology',
  'PANW': 'Technology',
  'CRWD': 'Technology',
  'NET': 'Technology',
  'DDOG': 'Technology',
  'SNOW': 'Technology',
  'MDB': 'Technology',
  'ZM': 'Technology',
  'TEAM': 'Technology',
  'DOCN': 'Technology',
  'SQ': 'Technology',
  'PYPL': 'Technology',
  'COIN': 'Technology',
  'HOOD': 'Technology',
  'SOFI': 'Technology',
  'UPST': 'Technology',
  'LC': 'Technology',
  'AFRM': 'Technology',
  'BILL': 'Technology',
  'RPD': 'Technology',
  'ASAN': 'Technology',
  'FROG': 'Technology',
  'GTLB': 'Technology',
  'ESTC': 'Technology',
  'GTLB': 'Technology',
  'ESTC': 'Technology',
  'CFLT': 'Technology',
  'TENB': 'Technology',
  'VEEV': 'Technology',
  'NTNX': 'Technology',
  'RPD': 'Technology',
  'RPD': 'Technology',
  'OKTA': 'Technology',
  'VRRM': 'Technology',
  'DUOL': 'Technology',
  'TTWO': 'Technology',
  'EA': 'Technology',
  'U': 'Technology',
  'PLTR': 'Technology',
  'DDOG': 'Technology',
  'ESTC': 'Technology',
  'GTLB': 'Technology',
  'CFLT': 'Technology',
  'TENB': 'Technology',
  'VEEV': 'Technology',
  'NTNX': 'Technology',
  'RPD': 'Technology',
  'OKTA': 'Technology',
  'VRRM': 'Technology',
  'DUOL': 'Technology',
  'TTWO': 'Technology',
  'EA': 'Technology',
  'U': 'Technology',
  'PLTR': 'Technology',
  'NOW': 'Technology',
  'FTNT': 'Technology',
  'ZS': 'Technology',
  'CHKP': 'Technology',
  'VRNS': 'Technology',
  'QLYS': 'Technology',
  'VRNT': 'Technology',
  'RDWR': 'Technology',
  'NCNO': 'Technology',
  'QLYS': 'Technology',
  'VRNS': 'Technology',
  'VRNT': 'Technology',
  'RDWR': 'Technology',
  'NCNO': 'Technology',
  'AVID': 'Technology',
  'ONTO': 'Technology',
  'WDAY': 'Technology',
  'ZM': 'Technology',
  'TEAM': 'Technology',
  'DOCN': 'Technology',
  'FROG': 'Technology',
  'GTLB': 'Technology',
  'ESTC': 'Technology',
  'CFLT': 'Technology',
  'TENB': 'Technology',
  'VEEV': 'Technology',
  'NTNX': 'Technology',
  'RPD': 'Technology',
  'OKTA': 'Technology',
  'VRRM': 'Technology',
  'DUOL': 'Technology',
  'TTWO': 'Technology',
  'EA': 'Technology',
  'U': 'Technology',
  'PLTR': 'Technology',
  
  // Financials
  'JPM': 'Financials',
  'BAC': 'Financials',
  'WFC': 'Financials',
  'C': 'Financials',
  'GS': 'Financials',
  'MS': 'Financials',
  'BLK': 'Financials',
  'SCHW': 'Financials',
  'AXP': 'Financials',
  'COF': 'Financials',
  'ALLY': 'Financials',
  'HBAN': 'Financials',
  'PNC': 'Financials',
  'USB': 'Financials',
  'TFC': 'Financials',
  'BK': 'Financials',
  'STT': 'Financials',
  'NTRS': 'Financials',
  'RJF': 'Financials',
  'ETFC': 'Financials',
  'IBKR': 'Financials',
  'HOOD': 'Financials',
  'SOFI': 'Financials',
  'LC': 'Financials',
  'UPST': 'Financials',
  'AFRM': 'Financials',
  
  // Healthcare
  'JNJ': 'Healthcare',
  'PFE': 'Healthcare',
  'UNH': 'Healthcare',
  'ABBV': 'Healthcare',
  'MRK': 'Healthcare',
  'TMO': 'Healthcare',
  'ABT': 'Healthcare',
  'DHR': 'Healthcare',
  'BMY': 'Healthcare',
  'AMGN': 'Healthcare',
  'GILD': 'Healthcare',
  'VRTX': 'Healthcare',
  'REGN': 'Healthcare',
  'BIIB': 'Healthcare',
  'ILMN': 'Healthcare',
  'INCY': 'Healthcare',
  'MRNA': 'Healthcare',
  'BNTX': 'Healthcare',
  'NVAX': 'Healthcare',
  'CVAC': 'Healthcare',
  'ARWR': 'Healthcare',
  'IONS': 'Healthcare',
  'FOLD': 'Healthcare',
  'ALKS': 'Healthcare',
  'ACAD': 'Healthcare',
  'SRPT': 'Healthcare',
  'SGMO': 'Healthcare',
  'BEAM': 'Healthcare',
  'VERV': 'Healthcare',
  'CRISPR': 'Healthcare',
  'NTLA': 'Healthcare',
  'EDIT': 'Healthcare',
  'BLUE': 'Healthcare',
  'RGNX': 'Healthcare',
  'BGNE': 'Healthcare',
  'HCM': 'Healthcare',
  'BILI': 'Healthcare',
  'TAL': 'Healthcare',
  'GSX': 'Healthcare',
  'COE': 'Healthcare',
  'LADR': 'Healthcare',
  'CELG': 'Healthcare',
  'MYOV': 'Healthcare',
  'JAZZ': 'Healthcare',
  'ALKS': 'Healthcare',
  'ACAD': 'Healthcare',
  'SRPT': 'Healthcare',
  'SGMO': 'Healthcare',
  'BEAM': 'Healthcare',
  'VERV': 'Healthcare',
  'CRISPR': 'Healthcare',
  'NTLA': 'Healthcare',
  'EDIT': 'Healthcare',
  'BLUE': 'Healthcare',
  'RGNX': 'Healthcare',
  'BGNE': 'Healthcare',
  'HCM': 'Healthcare',
  'BILI': 'Healthcare',
  'TAL': 'Healthcare',
  'GSX': 'Healthcare',
  'COE': 'Healthcare',
  'LADR': 'Healthcare',
  'CELG': 'Healthcare',
  'MYOV': 'Healthcare',
  'JAZZ': 'Healthcare',
  'BMRN': 'Healthcare',
  'FOLD': 'Healthcare',
  'ALKS': 'Healthcare',
  'ACAD': 'Healthcare',
  'SRPT': 'Healthcare',
  'SGMO': 'Healthcare',
  'BEAM': 'Healthcare',
  'VERV': 'Healthcare',
  'CRISPR': 'Healthcare',
  'NTLA': 'Healthcare',
  'EDIT': 'Healthcare',
  'BLUE': 'Healthcare',
  'RGNX': 'Healthcare',
  'BGNE': 'Healthcare',
  'HCM': 'Healthcare',
  'BILI': 'Healthcare',
  'TAL': 'Healthcare',
  'GSX': 'Healthcare',
  'COE': 'Healthcare',
  'LADR': 'Healthcare',
  'CELG': 'Healthcare',
  'MYOV': 'Healthcare',
  'JAZZ': 'Healthcare',
  'BMRN': 'Healthcare',
  'FOLD': 'Healthcare',
  'ALKS': 'Healthcare',
  'ACAD': 'Healthcare',
  'SRPT': 'Healthcare',
  'SGMO': 'Healthcare',
  'BEAM': 'Healthcare',
  'VERV': 'Healthcare',
  'CRISPR': 'Healthcare',
  'NTLA': 'Healthcare',
  'EDIT': 'Healthcare',
  'BLUE': 'Healthcare',
  'RGNX': 'Healthcare',
  'BGNE': 'Healthcare',
  'HCM': 'Healthcare',
  'BILI': 'Healthcare',
  'TAL': 'Healthcare',
  'GSX': 'Healthcare',
  'COE': 'Healthcare',
  'LADR': 'Healthcare',
  'CELG': 'Healthcare',
  'MYOV': 'Healthcare',
  'JAZZ': 'Healthcare',
  'BMRN': 'Healthcare',
  'FOLD': 'Healthcare',
  'ALKS': 'Healthcare',
  'ACAD': 'Healthcare',
  'SRPT': 'Healthcare',
  'SGMO': 'Healthcare',
  'BEAM': 'Healthcare',
  'VERV': 'Healthcare',
  'CRISPR': 'Healthcare',
  'NTLA': 'Healthcare',
  'EDIT': 'Healthcare',
  'BLUE': 'Healthcare',
  'RGNX': 'Healthcare',
  'BGNE': 'Healthcare',
  'HCM': 'Healthcare',
  'BILI': 'Healthcare',
  'TAL': 'Healthcare',
  'GSX': 'Healthcare',
  'COE': 'Healthcare',
  'LADR': 'Healthcare',
  'CELG': 'Healthcare',
  'MYOV': 'Healthcare',
  'JAZZ': 'Healthcare',
  'BMRN': 'Healthcare',
  
  // Energy
  'XOM': 'Energy',
  'CVX': 'Energy',
  'SLB': 'Energy',
  'EOG': 'Energy',
  'COP': 'Energy',
  'MPC': 'Energy',
  'PSX': 'Energy',
  'VLO': 'Energy',
  'HAL': 'Energy',
  'FANG': 'Energy',
  'DVN': 'Energy',
  'MRO': 'Energy',
  'OXY': 'Energy',
  'NOV': 'Energy',
  'RIG': 'Energy',
  'HP': 'Energy',
  'PTEN': 'Energy',
  'NBR': 'Energy',
  'CRR': 'Energy',
  'FTI': 'Energy',
  'NEX': 'Energy',
  'TDW': 'Energy',
  'VAL': 'Energy',
  'NEXT': 'Energy',
  'NBR': 'Energy',
  'CRR': 'Energy',
  'FTI': 'Energy',
  'NEX': 'Energy',
  'TDW': 'Energy',
  'VAL': 'Energy',
  'NEXT': 'Energy',
  'NBR': 'Energy',
  'CRR': 'Energy',
  'FTI': 'Energy',
  'NEX': 'Energy',
  'TDW': 'Energy',
  'VAL': 'Energy',
  'NEXT': 'Energy',
  
  // Consumer Discretionary
  'AMZN': 'Consumer Discretionary',
  'TSLA': 'Consumer Discretionary',
  'HD': 'Consumer Discretionary',
  'MCD': 'Consumer Discretionary',
  'NKE': 'Consumer Discretionary',
  'SBUX': 'Consumer Discretionary',
  'LULU': 'Consumer Discretionary',
  'ETSY': 'Consumer Discretionary',
  'ROKU': 'Consumer Discretionary',
  'PTON': 'Consumer Discretionary',
  'FIVE': 'Consumer Discretionary',
  'DKS': 'Consumer Discretionary',
  'HIBB': 'Consumer Discretionary',
  'BOOT': 'Consumer Discretionary',
  'ASO': 'Consumer Discretionary',
  'REAL': 'Consumer Discretionary',
  'RH': 'Consumer Discretionary',
  'WSM': 'Consumer Discretionary',
  'KSS': 'Consumer Discretionary',
  'M': 'Consumer Discretionary',
  'JWN': 'Consumer Discretionary',
  'DDS': 'Consumer Discretionary',
  'BBWI': 'Consumer Discretionary',
  'GPS': 'Consumer Discretionary',
  'ANF': 'Consumer Discretionary',
  'AEO': 'Consumer Discretionary',
  'URBN': 'Consumer Discretionary',
  'ASNA': 'Consumer Discretionary',
  'TLYS': 'Consumer Discretionary',
  'BKE': 'Consumer Discretionary',
  'BGS': 'Consumer Discretionary',
  'DKS': 'Consumer Discretionary',
  'HIBB': 'Consumer Discretionary',
  'BOOT': 'Consumer Discretionary',
  'ASO': 'Consumer Discretionary',
  'REAL': 'Consumer Discretionary',
  'RH': 'Consumer Discretionary',
  'WSM': 'Consumer Discretionary',
  'KSS': 'Consumer Discretionary',
  'M': 'Consumer Discretionary',
  'JWN': 'Consumer Discretionary',
  'DDS': 'Consumer Discretionary',
  'BBWI': 'Consumer Discretionary',
  'GPS': 'Consumer Discretionary',
  'ANF': 'Consumer Discretionary',
  'AEO': 'Consumer Discretionary',
  'URBN': 'Consumer Discretionary',
  'ASNA': 'Consumer Discretionary',
  'TLYS': 'Consumer Discretionary',
  'BKE': 'Consumer Discretionary',
  'BGS': 'Consumer Discretionary',
  
  // Consumer Staples
  'WMT': 'Consumer Staples',
  'PG': 'Consumer Staples',
  'KO': 'Consumer Staples',
  'PEP': 'Consumer Staples',
  'COST': 'Consumer Staples',
  'CL': 'Consumer Staples',
  'MDLZ': 'Consumer Staples',
  'GIS': 'Consumer Staples',
  'HRL': 'Consumer Staples',
  'SJM': 'Consumer Staples',
  'CAG': 'Consumer Staples',
  'CPB': 'Consumer Staples',
  'COTY': 'Consumer Staples',
  'EL': 'Consumer Staples',
  'REV': 'Consumer Staples',
  'NU': 'Consumer Staples',
  'REV': 'Consumer Staples',
  'NU': 'Consumer Staples',
  'REV': 'Consumer Staples',
  'NU': 'Consumer Staples',
  'REV': 'Consumer Staples',
  'NU': 'Consumer Staples',
  'REV': 'Consumer Staples',
  'NU': 'Consumer Staples',
  
  // Industrials
  'BA': 'Industrials',
  'GE': 'Industrials',
  'CAT': 'Industrials',
  'HON': 'Industrials',
  'UNP': 'Industrials',
  'RTX': 'Industrials',
  'LMT': 'Industrials',
  'NOC': 'Industrials',
  'GD': 'Industrials',
  'TXT': 'Industrials',
  'EMR': 'Industrials',
  'ITW': 'Industrials',
  'ETN': 'Industrials',
  'CMI': 'Industrials',
  'DE': 'Industrials',
  'FTV': 'Industrials',
  'PH': 'Industrials',
  'ROK': 'Industrials',
  'RBC': 'Industrials',
  'AME': 'Industrials',
  'DOV': 'Industrials',
  'PNR': 'Industrials',
  'GGG': 'Industrials',
  'IEX': 'Industrials',
  'WWD': 'Industrials',
  'ZBH': 'Industrials',
  'FAST': 'Industrials',
  'GWW': 'Industrials',
  'MSM': 'Industrials',
  'WCC': 'Industrials',
  'AOS': 'Industrials',
  'ALLE': 'Industrials',
  'SEE': 'Industrials',
  'OI': 'Industrials',
  'BERY': 'Industrials',
  'CPRT': 'Industrials',
  'ALG': 'Industrials',
  'PDM': 'Industrials',
  'FIX': 'Industrials',
  'USLM': 'Industrials',
  'CAH': 'Industrials',
  'MCK': 'Industrials',
  'ABC': 'Industrials',
  'HSIC': 'Industrials',
  'OMI': 'Industrials',
  'NVST': 'Industrials',
  'DCI': 'Industrials',
  'XRAY': 'Industrials',
  'CRL': 'Industrials',
  'A': 'Industrials',
  'TMO': 'Industrials',
  'BRKR': 'Industrials',
  'WAT': 'Industrials',
  'ICUI': 'Industrials',
  'PODD': 'Industrials',
  'MASI': 'Industrials',
  'NVST': 'Industrials',
  'DCI': 'Industrials',
  'XRAY': 'Industrials',
  'CRL': 'Industrials',
  'A': 'Industrials',
  'TMO': 'Industrials',
  'BRKR': 'Industrials',
  'WAT': 'Industrials',
  'ICUI': 'Industrials',
  'PODD': 'Industrials',
  'MASI': 'Industrials',
  
  // Materials
  'LIN': 'Materials',
  'APD': 'Materials',
  'ECL': 'Materials',
  'SHW': 'Materials',
  'PPG': 'Materials',
  'DOW': 'Materials',
  'FCX': 'Materials',
  'NEM': 'Materials',
  'VALE': 'Materials',
  'RIO': 'Materials',
  'BHP': 'Materials',
  'NTR': 'Materials',
  'CTVA': 'Materials',
  'CF': 'Materials',
  'MOS': 'Materials',
  'ICL': 'Materials',
  'FMC': 'Materials',
  'ALB': 'Materials',
  'LTHM': 'Materials',
  'SQM': 'Materials',
  'LAC': 'Materials',
  'PLL': 'Materials',
  'PLL': 'Materials',
  'PLL': 'Materials',
  'PLL': 'Materials',
  'PLL': 'Materials',
  
  // Real Estate
  'AMT': 'Real Estate',
  'PLD': 'Real Estate',
  'EQIX': 'Real Estate',
  'PSA': 'Real Estate',
  'WELL': 'Real Estate',
  'VICI': 'Real Estate',
  'EXPI': 'Real Estate',
  'OPEN': 'Real Estate',
  'Z': 'Real Estate',
  'RDFN': 'Real Estate',
  'COMP': 'Real Estate',
  'RKT': 'Real Estate',
  'UWMC': 'Real Estate',
  'LOAN': 'Real Estate',
  'MRIN': 'Real Estate',
  'LOAN': 'Real Estate',
  'MRIN': 'Real Estate',
  'LOAN': 'Real Estate',
  'MRIN': 'Real Estate',
  'LOAN': 'Real Estate',
  'MRIN': 'Real Estate',
  
  // Utilities
  'NEE': 'Utilities',
  'DUK': 'Utilities',
  'SO': 'Utilities',
  'AEP': 'Utilities',
  'SRE': 'Utilities',
  'EXC': 'Utilities',
  'XEL': 'Utilities',
  'WEC': 'Utilities',
  'ES': 'Utilities',
  'ETR': 'Utilities',
  'PEG': 'Utilities',
  'ED': 'Utilities',
  'FE': 'Utilities',
  'CMS': 'Utilities',
  'NI': 'Utilities',
  'LNT': 'Utilities',
  'ATO': 'Utilities',
  'SR': 'Utilities',
  'OGE': 'Utilities',
  'CNP': 'Utilities',
  'NFE': 'Utilities',
  'VST': 'Utilities',
  'TEP': 'Utilities',
  'ELPC': 'Utilities',
  'RNGR': 'Utilities',
  'NRG': 'Utilities',
  'VST': 'Utilities',
  'TEP': 'Utilities',
  'ELPC': 'Utilities',
  'RNGR': 'Utilities',
  'NRG': 'Utilities',
  'VST': 'Utilities',
  'TEP': 'Utilities',
  'ELPC': 'Utilities',
  'RNGR': 'Utilities',
  'NRG': 'Utilities',
  
  // Communication Services
  'GOOGL': 'Communication Services',
  'GOOG': 'Communication Services',
  'META': 'Communication Services',
  'NFLX': 'Communication Services',
  'DIS': 'Communication Services',
  'CMCSA': 'Communication Services',
  'VZ': 'Communication Services',
  'T': 'Communication Services',
  'EA': 'Communication Services',
  'TTWO': 'Communication Services',
  'U': 'Communication Services',
  'RBLX': 'Communication Services',
  'ZNGA': 'Communication Services',
  'LNW': 'Communication Services',
  'DKNG': 'Communication Services',
  'PENN': 'Communication Services',
  'FLUT': 'Communication Services',
  'GMBL': 'Communication Services',
  'ACHR': 'Communication Services',
  'SWIM': 'Communication Services',
  'AUD': 'Communication Services',
  'YMM': 'Communication Services',
  'GMBL': 'Communication Services',
  'ACHR': 'Communication Services',
  'SWIM': 'Communication Services',
  'AUD': 'Communication Services',
  'YMM': 'Communication Services',
};

/**
 * Get sector for a ticker symbol
 * First tries Finnhub API (free tier), falls back to local mapping
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<string|null>} - Sector name or null if not found
 */
export const getTickerSector = async (ticker) => {
  if (!ticker || typeof ticker !== 'string') {
    return null;
  }
  
  const normalizedTicker = ticker.trim().toUpperCase();
  
  // First check local mapping (fastest)
  if (TICKER_TO_SECTOR_MAP[normalizedTicker]) {
    return TICKER_TO_SECTOR_MAP[normalizedTicker];
  }
  
  // Try Alpaca API first (if we have credentials and it's a US stock)
  const ALPACA_API_KEY = import.meta.env.VITE_ALPACA_API_KEY;
  const ALPACA_SECRET = import.meta.env.VITE_ALPACA_SECRET;
  
  if (ALPACA_API_KEY && ALPACA_SECRET) {
    try {
      // Try to get asset info from Alpaca (may have sector/industry info)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(
        `https://data.alpaca.markets/v2/stocks/${normalizedTicker}`,
        {
          signal: controller.signal,
          headers: {
            'APCA-API-KEY-ID': ALPACA_API_KEY,
            'APCA-API-SECRET-KEY': ALPACA_SECRET,
          }
        }
      );
      
      clearTimeout(timeoutId);
      
      // Note: Alpaca asset endpoint doesn't directly provide sector, but we can try snapshot
      // For now, skip Alpaca and use Finnhub
    } catch (error) {
      // Continue to Finnhub fallback
    }
  }
  
  // Try Finnhub API if available (free tier: 60 calls/minute)
  // Note: Requires VITE_FINNHUB_API_KEY in .env
  const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
  
  if (FINNHUB_API_KEY) {
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${normalizedTicker}&token=${FINNHUB_API_KEY}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        // Finnhub sometimes returns empty object or error
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          // Try finnhubIndustry first
          if (data.finnhubIndustry) {
            const industry = data.finnhubIndustry.toLowerCase();
            
            // Enhanced mapping from industry to sector
            if (industry.includes('technology') || industry.includes('software') || 
                industry.includes('semiconductor') || industry.includes('electronics') ||
                industry.includes('computer') || industry.includes('internet') ||
                industry.includes('telecommunication equipment')) {
              return 'Technology';
            } else if (industry.includes('financial') || industry.includes('bank') || 
                       industry.includes('insurance') || industry.includes('capital markets') ||
                       industry.includes('investment') || industry.includes('credit')) {
              return 'Financials';
            } else if (industry.includes('healthcare') || industry.includes('pharmaceutical') || 
                       industry.includes('biotech') || industry.includes('medical') ||
                       industry.includes('biotechnology') || industry.includes('drug')) {
              return 'Healthcare';
            } else if (industry.includes('energy') || industry.includes('oil') || 
                       industry.includes('gas') || industry.includes('petroleum') ||
                       industry.includes('drilling') || industry.includes('refining')) {
              return 'Energy';
            } else if (industry.includes('consumer') || industry.includes('retail') || 
                       industry.includes('automotive') || industry.includes('entertainment') ||
                       industry.includes('gaming') || industry.includes('hotel') ||
                       industry.includes('restaurant') || industry.includes('leisure')) {
              return 'Consumer Discretionary';
            } else if (industry.includes('food') || industry.includes('beverage') || 
                       industry.includes('tobacco') || industry.includes('packaged foods') ||
                       industry.includes('household')) {
              return 'Consumer Staples';
            } else if (industry.includes('industrial') || industry.includes('aerospace') || 
                       industry.includes('defense') || industry.includes('machinery') ||
                       industry.includes('transportation') || industry.includes('logistics')) {
              return 'Industrials';
            } else if (industry.includes('material') || industry.includes('chemical') || 
                       industry.includes('mining') || industry.includes('metals') ||
                       industry.includes('paper') || industry.includes('packaging')) {
              return 'Materials';
            } else if (industry.includes('real estate') || industry.includes('reit') || 
                       industry.includes('property')) {
              return 'Real Estate';
            } else if (industry.includes('utility') || industry.includes('electric') || 
                       industry.includes('water') || industry.includes('gas utility')) {
              return 'Utilities';
            } else if (industry.includes('communication') || industry.includes('telecom') || 
                       industry.includes('media') || industry.includes('broadcasting')) {
              return 'Communication Services';
            }
            
          }
          
          // Try GICS sector if available (more direct)
          if (data.gicsSector) {
            return data.gicsSector;
          }
          
          // Fallback: return industry name if we have it
          if (data.finnhubIndustry) {
            return data.finnhubIndustry;
          }
        }
      }
    } catch (error) {
      // Ignore timeout/abort errors silently, log others
      if (error.name !== 'AbortError') {
        console.warn(`Failed to fetch sector from Finnhub for ${normalizedTicker}:`, error);
      }
    }
  }
  
  // Pattern-based fallback for common naming conventions
  const tickerUpper = normalizedTicker.toUpperCase();
  
  // Banks and financial services
  if (tickerUpper.includes('BANK') || tickerUpper.includes('BANC') || 
      tickerUpper.includes('FIN') || tickerUpper.endsWith('FC') ||
      tickerUpper.includes('TRUST') || tickerUpper.includes('CAPITAL')) {
    return 'Financials';
  }
  
  // Technology patterns
  if (tickerUpper.includes('TECH') || tickerUpper.includes('SOFT') ||
      tickerUpper.includes('SYSTEMS') || tickerUpper.includes('DATA') ||
      tickerUpper.includes('DIGITAL') || tickerUpper.includes('CLOUD') ||
      tickerUpper.includes('NET') || tickerUpper.includes('WEB')) {
    return 'Technology';
  }
  
  // Healthcare/Medical patterns
  if (tickerUpper.includes('HEALTH') || tickerUpper.includes('MED') ||
      tickerUpper.includes('BIO') || tickerUpper.includes('PHARMA') ||
      tickerUpper.includes('THERAPEUTICS') || tickerUpper.includes('CLINICAL')) {
    return 'Healthcare';
  }
  
  // Energy patterns
  if (tickerUpper.includes('ENERGY') || tickerUpper.includes('OIL') ||
      tickerUpper.includes('GAS') || tickerUpper.includes('PETRO') ||
      tickerUpper.includes('DRILL') || tickerUpper.includes('PIPELINE')) {
    return 'Energy';
  }
  
  // Industrial patterns
  if (tickerUpper.includes('INDUSTRIAL') || tickerUpper.includes('MACHINE') ||
      tickerUpper.includes('AEROSPACE') || tickerUpper.includes('DEFENSE') ||
      tickerUpper.includes('ENGINEERING') || tickerUpper.includes('MANUFACTURING')) {
    return 'Industrials';
  }
  
  // Real Estate patterns
  if (tickerUpper.includes('REIT') || tickerUpper.includes('PROPERTY') ||
      tickerUpper.includes('REALTY') || tickerUpper.includes('ESTATE')) {
    return 'Real Estate';
  }
  
  // Utility patterns
  if (tickerUpper.includes('UTILITY') || tickerUpper.includes('ELECTRIC') ||
      tickerUpper.includes('POWER') || tickerUpper.includes('GAS UTIL')) {
    return 'Utilities';
  }
  
  // Materials patterns
  if (tickerUpper.includes('CHEMICAL') || tickerUpper.includes('MINING') ||
      tickerUpper.includes('METALS') || tickerUpper.includes('STEEL') ||
      tickerUpper.includes('MATERIAL')) {
    return 'Materials';
  }
  
  // Communication patterns
  if (tickerUpper.includes('COMM') || tickerUpper.includes('MEDIA') ||
      tickerUpper.includes('TELECOM') || tickerUpper.includes('BROADCAST')) {
    return 'Communication Services';
  }
  
  // Default fallback
  return null;
};

/**
 * Batch get sectors for multiple tickers
 * @param {string[]} tickers - Array of ticker symbols
 * @returns {Promise<Object>} - Map of ticker -> sector
 */
export const getTickerSectors = async (tickers) => {
  const sectorMap = {};
  const uniqueTickers = [...new Set(tickers.filter(t => t && t !== '-' && t !== 'N/A'))];
  
  // Process in batches to respect API rate limits
  const batchSize = 10;
  for (let i = 0; i < uniqueTickers.length; i += batchSize) {
    const batch = uniqueTickers.slice(i, i + batchSize);
    const promises = batch.map(async (ticker) => {
      const sector = await getTickerSector(ticker);
      return { ticker, sector };
    });
    
    const results = await Promise.allSettled(promises);
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        sectorMap[batch[idx]] = result.value.sector;
      }
    });
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < uniqueTickers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return sectorMap;
};

