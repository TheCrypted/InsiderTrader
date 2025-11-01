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

// Fetch stock company logo
export async function getStockLogo(symbol) {
  try {
    // Use multiple free logo services as fallbacks
    
    // Option 1: Clearbit Logo API (free, no API key needed)
    const clearbitUrl = `https://logo.clearbit.com/${getCompanyDomain(symbol)}`
    
    // Check if image exists
    const img = new Image()
    return new Promise((resolve) => {
      img.onload = () => resolve(clearbitUrl)
      img.onerror = () => {
        // Fallback 1: TradingView logo CDN
        const tradingViewUrl = `https://s3-symbol-logo.tradingview.com/${symbol.toLowerCase()}.svg`
        const img2 = new Image()
        img2.onload = () => resolve(tradingViewUrl)
        img2.onerror = () => {
          // Fallback 2: Alternative logo service
          const finnhubUrl = `https://finnhub.io/api/logo?symbol=${symbol}`
          const img3 = new Image()
          img3.onload = () => resolve(finnhubUrl)
          img3.onerror = () => {
            // Fallback 3: Polygon.io pattern (if available)
            const polygonUrl = `https://polygon.io/public/img/logo/${symbol.toLowerCase()}.svg`
            const img4 = new Image()
            img4.onload = () => resolve(polygonUrl)
            img4.onerror = () => resolve(null)
            img4.src = polygonUrl
          }
          img3.src = finnhubUrl
        }
        img2.src = tradingViewUrl
      }
      img.src = clearbitUrl
    })
  } catch (error) {
    console.error(`Error fetching logo for ${symbol}:`, error)
    return null
  }
}

// Get company domain from stock symbol (mapping for common companies)
function getCompanyDomain(symbol) {
  const domainMap = {
    'NVDA': 'nvidia.com',
    'AVGO': 'broadcom.com',
    'AAPL': 'apple.com',
    'MSFT': 'microsoft.com',
    'TSLA': 'tesla.com',
    'TEM': 'tempus.ai',
    'GOOGL': 'google.com',
    'AMZN': 'amazon.com',
    'META': 'meta.com',
    'NFLX': 'netflix.com'
  }
  
  return domainMap[symbol] || `${symbol.toLowerCase()}.com`
}

// Alternative: Use Financial Modeling Prep API (free tier available)
export async function getStockLogoFromAPI(symbol) {
  try {
    // Using a free public API endpoint (you may want to add your own API key)
    const apiUrl = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=demo`
    const response = await fetch(apiUrl)
    
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
}

