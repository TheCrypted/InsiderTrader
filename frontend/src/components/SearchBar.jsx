import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { getAllRepresentativesBasic } from '../utils/api'

export default function SearchBar({ placeholder, className = "", onSearch }) {
  const [searchText, setSearchText] = useState('')
  const [politicians, setPoliticians] = useState([])
  const [filteredPoliticians, setFilteredPoliticians] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const navigate = useNavigate()
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // Fetch all politicians on mount
  useEffect(() => {
    const fetchPoliticians = async () => {
      try {
        setLoading(true)
        const data = await getAllRepresentativesBasic()
        setPoliticians(data)
        setFilteredPoliticians(data)
      } catch (error) {
        console.error('Error fetching politicians:', error)
        setPoliticians([])
        setFilteredPoliticians([])
      } finally {
        setLoading(false)
      }
    }

    fetchPoliticians()
  }, [])

  // Filter politicians based on search text
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredPoliticians(politicians)
      setShowDropdown(false)
    } else {
      const filtered = politicians.filter(politician => 
        politician.name.toLowerCase().includes(searchText.toLowerCase())
      )
      setFilteredPoliticians(filtered)
      setShowDropdown(true)
    }
  }, [searchText, politicians])

  // Update dropdown position when shown
  useEffect(() => {
    const updatePosition = () => {
      if (showDropdown && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        })
      }
    }

    if (showDropdown) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [showDropdown, searchText])

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value
    setSearchText(value)
    onSearch?.(value)
  }

  // Handle politician selection
  const handlePoliticianClick = (politician) => {
    setSearchText(politician.name)
    setShowDropdown(false)
    navigate(`/congressman/${politician.id}/trading`)
  }

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const dropdownContent = showDropdown && searchText.trim() !== '' ? (
    <div 
      ref={dropdownRef}
      className="fixed bg-white border border-black"
      style={{ 
        zIndex: 99999,
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`
      }}
    >
      {loading ? (
        <div className="p-4 text-center text-gray-500 text-sm">
          Loading...
        </div>
      ) : filteredPoliticians.length > 0 ? (
        <div className="divide-y divide-gray-200">
          {filteredPoliticians.slice(0, 4).map((politician) => (
            <button
              key={politician.id}
              onClick={() => handlePoliticianClick(politician)}
              className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              {politician.image ? (
                <img
                  src={politician.image}
                  alt={politician.name}
                  className="w-10 h-10 rounded object-cover border border-black"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-200 border border-black flex items-center justify-center text-xs font-bold text-gray-600">
                  {politician.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {politician.name}
                </div>
                <div className="text-xs text-gray-600 truncate">
                  {politician.party} - {politician.chamber} - {politician.state}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500 text-sm">
          No politicians found
        </div>
      )}
    </div>
  ) : null

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        <div className={`border border-transparent px-4 py-3 flex items-center ${className}`}>
          <svg className="w-6 h-6 text-gray-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="bg-transparent outline-none flex-1 text-sm text-white placeholder-gray-400"
            value={searchText}
            onChange={handleInputChange}
            onFocus={() => {
              if (searchText.trim() !== '' && filteredPoliticians.length > 0) {
                setShowDropdown(true)
              }
            }}
          />
        </div>
      </div>
      
      {/* Dropdown via Portal */}
      {typeof window !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  )
}

