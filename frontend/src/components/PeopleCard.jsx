import TrendingCard from './TrendingCard'

export default function PeopleCard({ name, title, party, position, initials, bgColor = "bg-blue-600" }) {
  return (
    <TrendingCard>
      <div className="flex items-center gap-3">
        <div className={`${bgColor} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xs`}>
          {initials}
        </div>
        <div>
          <div className="font-semibold">Track {name}</div>
          <div className="text-sm text-gray-400">{party} - {position}</div>
        </div>
      </div>
    </TrendingCard>
  )
}

