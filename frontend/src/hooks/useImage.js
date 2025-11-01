import { useState, useEffect } from 'react'
import { getCongressmanImage, getStockLogo, getStockLogoFromAPI } from '../utils/imageUtils'

export function useCongressmanImage(name) {
  const [imageUrl, setImageUrl] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    
    async function fetchImage() {
      setLoading(true)
      const url = await getCongressmanImage(name)
      if (isMounted) {
        setImageUrl(url)
        setLoading(false)
      }
    }
    
    fetchImage()
    
    return () => {
      isMounted = false
    }
  }, [name])

  return { imageUrl, loading }
}

export function useStockLogo(symbol) {
  const [logoUrl, setLogoUrl] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    
    async function fetchLogo() {
      setLoading(true)
      // Try API first, then fallback to logo services
      let url = await getStockLogoFromAPI(symbol)
      if (!url) {
        url = await getStockLogo(symbol)
      }
      
      if (isMounted) {
        setLogoUrl(url)
        setLoading(false)
      }
    }
    
    fetchLogo()
    
    return () => {
      isMounted = false
    }
  }, [symbol])

  return { logoUrl, loading }
}

