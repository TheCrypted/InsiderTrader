import { useState, useEffect } from 'react'
import CongressmanCard from './CongressmanCard'
import { getCongressman } from '../utils/api'

// Mapping of congressman IDs for the main page
const CONGRESSMAN_IDS = [
  "P000197", // Nancy Pelosi
  "G000596", // Marjorie Taylor Greene
  "V000137", // J. D. Vance
  "H001089", // Josh Hawley
  "D000216", // Ro Khanna
  "S001184" // Rick Scott
]

export default function CongressmanGrid() {
  const [congressmen, setCongressmen] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCongressmen = async () => {
      try {
        setLoading(true)
        const data = await Promise.all(
          CONGRESSMAN_IDS.map(id => getCongressman(id))
        )
        // Filter out null values (congressmen not found)
        const validCongressmen = data.filter(c => c !== null)
        setCongressmen(validCongressmen)
      } catch (error) {
        console.error('Error fetching congressmen:', error)
        setCongressmen([])
      } finally {
        setLoading(false)
      }
    }

    fetchCongressmen()
  }, [])

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6 px-6 pt-6">Congressional Trading Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2">
          {CONGRESSMAN_IDS.map((id, index) => {
            const isLastInRow = (index + 1) % 2 === 0
            return (
              <div key={id} className={`bg-gray-100 ${isLastInRow ? 'border-b border-black' : 'border-b border-r border-black'}`} style={{ minHeight: '300px' }}>
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-gray-400">Loading...</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 px-6 pt-6">Congressional Trading Activity</h2>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {congressmen.length > 0 ? (
          congressmen.map((congressman, index) => {
            if (!congressman) return null;
            const isLastInRow = (index + 1) % 2 === 0
            return (
              <CongressmanCard 
                key={congressman.id || index} 
                name={congressman.name || 'Unknown'}
                party={congressman.party || 'Unknown'}
                position={`${congressman.chamber || 'Unknown'} ${congressman.chamber === 'Senate' ? 'Senator' : 'Representative'}`}
                trades={`${congressman.totalTrades || 0} trades`}
                id={congressman.id}
                image={congressman.image}
                isLast={isLastInRow}
              />
            )
          })
        ) : (
          <div className="col-span-2 p-6 text-center text-gray-500">
            No congressmen data available
          </div>
        )}
      </div>
    </div>
  )
}

