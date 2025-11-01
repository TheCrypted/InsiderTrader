import TrendingCard from './TrendingCard'

export default function CategoryCard({ title, subtitle, icon, iconBg = "bg-blue-600" }) {
  return (
    <TrendingCard>
      <div className="flex flex-col items-start gap-2">
        <div className={`${iconBg} w-10 h-10 rounded-lg flex items-center justify-center mb-2`}>
          {icon}
        </div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-gray-400">{subtitle}</div>
      </div>
    </TrendingCard>
  )
}

