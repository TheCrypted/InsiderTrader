import CongressmanCard from './CongressmanCard'

const CONGRESSMEN_DATA = [
  {
    name: "Nancy Pelosi",
    party: "Democrat",
    position: "House Representative",
    trades: "12 trades this quarter"
  },
  {
    name: "Marjorie Taylor Greene",
    party: "Republican",
    position: "House Representative",
    trades: "8 trades this quarter"
  },
  {
    name: "J. D. Vance",
    party: "Republican",
    position: "Vice President",
    trades: "5 trades this quarter"
  },
  {
    name: "Josh Hawley",
    party: "Republican",
    position: "Senator",
    trades: "15 trades this quarter"
  },
  {
    name: "Ro Khanna",
    party: "Democrat",
    position: "House Representative",
    trades: "9 trades this quarter"
  },
  {
    name: "Rick Scott",
    party: "Republican",
    position: "Senator",
    trades: "11 trades this quarter"
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
              key={index} 
              {...congressman} 
              isLast={isLastInRow}
            />
          )
        })}
      </div>
    </div>
  )
}

