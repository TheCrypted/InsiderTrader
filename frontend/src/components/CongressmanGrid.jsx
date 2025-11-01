import CongressmanCard from './CongressmanCard'

// Mapping of congressman names to their IDs for routing
const CONGRESSMAN_NAME_TO_ID = {
  "Nancy Pelosi": "P000197",
  "Marjorie Taylor Greene": "G000596",
  "J. D. Vance": "V000137",
  "J.D. Vance": "V000137", // Alternative format
  "Josh Hawley": "H001089", // Common ID for Josh Hawley
  "Ro Khanna": "D000216",
  "Rick Scott": "S001184" // Common ID for Rick Scott
}

const CONGRESSMEN_DATA = [
  {
    name: "Nancy Pelosi",
    party: "Democrat",
    position: "House Representative",
    trades: "12 trades this quarter",
    id: "P000197"
  },
  {
    name: "Marjorie Taylor Greene",
    party: "Republican",
    position: "House Representative",
    trades: "8 trades this quarter",
    id: "G000596"
  },
  {
    name: "J. D. Vance",
    party: "Republican",
    position: "Vice President",
    trades: "5 trades this quarter",
    id: "V000137"
  },
  {
    name: "Josh Hawley",
    party: "Republican",
    position: "Senator",
    trades: "15 trades this quarter",
    id: "H001089"
  },
  {
    name: "Ro Khanna",
    party: "Democrat",
    position: "House Representative",
    trades: "9 trades this quarter",
    id: "D000216"
  },
  {
    name: "Rick Scott",
    party: "Republican",
    position: "Senator",
    trades: "11 trades this quarter",
    id: "S001184"
  }
]

export default function CongressmanGrid() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 px-6 pt-6">Congressional Trading Activity</h2>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {CONGRESSMEN_DATA.map((congressman, index) => {
          const isLastInRow = (index + 1) % 2 === 0
          return (
            <CongressmanCard 
              key={congressman.id || index} 
              {...congressman} 
              isLast={isLastInRow}
            />
          )
        })}
      </div>
    </div>
  )
}

