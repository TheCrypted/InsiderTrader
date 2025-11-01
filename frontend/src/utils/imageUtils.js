// Utility functions to fetch images from public APIs

// Fetch Congress member image from Wikipedia or official sources
export async function getCongressmanImage(name) {
  try {
    // Try Wikipedia API first
    const wikipediaName = name.replace(/\s+/g, '_')
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${wikipediaName}`
    
    const response = await fetch(wikiUrl)
    if (response.ok) {
      const data = await response.json()
      if (data.thumbnail && data.thumbnail.source) {
        // Wikipedia images are often higher resolution, replace "thumb/" with full size
        let imageUrl = data.thumbnail.source.replace(/\/thumb\//, '/').split('/').slice(0, -1).join('/')
        // Or use the original thumbnail if available
        if (data.original && data.original.source) {
          imageUrl = data.original.source
        }
        return imageUrl
      }
    }
    
    // Fallback: Try common variations of the name
    const nameVariations = [
      name,
      name.replace(/\./g, ''),
      name.replace(/\s+/, '_'),
      name.replace(/\s+/, '%20')
    ]
    
    for (const variation of nameVariations.slice(1)) {
      try {
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${variation}`
        const response = await fetch(wikiUrl)
        if (response.ok) {
          const data = await response.json()
          if (data.thumbnail && data.thumbnail.source) {
            return data.thumbnail.source
          }
        }
      } catch (e) {
        // Continue to next variation
      }
    }
    
    return null // Return null if no image found, component will use initials
  } catch (error) {
    console.error(`Error fetching image for ${name}:`, error)
    return null
  }
}

// Fetch stock company logo - optimized for S&P 500 companies
export async function getStockLogo(symbol) {
  if (!symbol || symbol === '-') {
    return null;
  }
  
  try {
    // Normalize symbol (uppercase, remove any whitespace)
    const normalizedSymbol = symbol.toUpperCase().trim();
    
    // Use Clearbit Logo API - reliable for S&P 500 companies via company domain
    const clearbitUrl = `https://logo.clearbit.com/${getCompanyDomain(normalizedSymbol)}`
    
    return new Promise((resolve) => {
      // Set timeout for image loading
      const timeout = setTimeout(() => {
        resolve(null);
      }, 2000);
      
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Help with CORS if needed
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(clearbitUrl);
      }
      
      img.onerror = () => {
        clearTimeout(timeout);
        // If Clearbit fails, return null (ticker will be shown as fallback)
        resolve(null);
      }
      
      img.src = clearbitUrl;
    })
  } catch (error) {
    console.error(`Error fetching logo for ${symbol}:`, error)
    return null
  }
}

// Get company domain from stock symbol - comprehensive S&P 500 mapping
function getCompanyDomain(symbol) {
  const domainMap = {
    // Tech
    'NVDA': 'nvidia.com',
    'AVGO': 'broadcom.com',
    'AAPL': 'apple.com',
    'MSFT': 'microsoft.com',
    'GOOGL': 'google.com',
    'GOOG': 'google.com', // GOOG is also Alphabet
    'AMZN': 'amazon.com',
    'META': 'meta.com',
    'AMD': 'amd.com',
    'CSCO': 'cisco.com',
    'INTC': 'intel.com',
    'ORCL': 'oracle.com',
    'CRM': 'salesforce.com',
    'ADBE': 'adobe.com',
    'PANW': 'paloaltonetworks.com',
    
    // Financial
    'JPM': 'jpmorganchase.com',
    'BAC': 'bankofamerica.com',
    'WFC': 'wellsfargo.com',
    'GS': 'goldmansachs.com',
    'MS': 'morganstanley.com',
    'C': 'citigroup.com',
    'BLK': 'blackrock.com',
    
    // Healthcare
    'JNJ': 'jnj.com',
    'PFE': 'pfizer.com',
    'MRK': 'merck.com',
    'ABT': 'abbott.com',
    'UNH': 'unitedhealthgroup.com',
    'TMO': 'thermofisher.com',
    'ABBV': 'abbvie.com',
    'LLY': 'lilly.com',
    'NVO': 'novo-nordisk.com',
    
    // Energy
    'CVX': 'chevron.com',
    'XOM': 'exxonmobil.com',
    'COP': 'conocophillips.com',
    'SLB': 'slb.com',
    'EOG': 'eogresources.com',
    'EXC': 'exeloncorp.com',
    
    // Consumer
    'WMT': 'walmart.com',
    'PG': 'pg.com',
    'DIS': 'thewaltdisneycompany.com',
    'HD': 'homedepot.com',
    'NFLX': 'netflix.com',
    'SBUX': 'starbucks.com',
    'TGT': 'target.com',
    'LOW': 'lowes.com',
    
    // Industrial
    'BA': 'boeing.com',
    'CAT': 'caterpillar.com',
    'GE': 'ge.com',
    'HON': 'honeywell.com',
    'MMM': '3m.com',
    
    // Communication
    'VZ': 'verizon.com',
    'T': 'att.com',
    'CMCSA': 'comcast.com',
    'NFLX': 'netflix.com',
    
    // Utilities
    'NEE': 'nexteraenergy.com',
    'DUK': 'duke-energy.com',
    'SO': 'southerncompany.com',
    'AEP': 'aep.com',
    
    // Consumer Staples
    'KO': 'coca-cola.com',
    'PEP': 'pepsico.com',
    'PM': 'pmi.com',
    
    // Materials
    'LIN': 'linde.com',
    'APD': 'airproducts.com',
    'ECL': 'ecolab.com',
    
    // Real Estate
    'AMT': 'american-tower.com',
    'EQIX': 'equinix.com',
    
    // Other
    'IBIT': 'blackrock.com', // iShares Bitcoin Trust - uses BlackRock
    'CAH': 'cardinalhealth.com',
    'TEM': 'tempus.ai'
  }
  
  // If not in map, try a simple pattern (works for many companies)
  if (domainMap[symbol]) {
    return domainMap[symbol];
  }
  
  // Try lowercase symbol.com as fallback (works for many S&P 500 companies)
  return `${symbol.toLowerCase()}.com`;
}

// Alternative: Use Financial Modeling Prep API (free tier available)
// NOTE: Demo API key returns 401 errors, so this is disabled
export async function getStockLogoFromAPI(symbol) {
  // Financial Modeling Prep demo API key is expired/not working (401 errors)
  // Disabled to avoid unnecessary API calls
  return null;
  
  /* Commented out - demo API key no longer works
  if (!symbol || symbol === '-') {
    return null;
  }
  
  try {
    // Normalize symbol
    const normalizedSymbol = symbol.toUpperCase().trim();
    
    // Using a free public API endpoint (you may want to add your own API key)
    const apiUrl = `https://financialmodelingprep.com/api/v3/profile/${normalizedSymbol}?apikey=demo`
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data && data.length > 0 && data[0].image) {
        return data[0].image
      }
    }
    
    return null
  } catch (error) {
    console.error(`Error fetching logo from API for ${symbol}:`, error)
    return null
  }
  */
}

