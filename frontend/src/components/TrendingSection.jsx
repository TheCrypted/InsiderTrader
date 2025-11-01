import PeopleCard from './PeopleCard'
import CategoryCard from './CategoryCard'
import StockCard from './StockCard'
import { CongressIcon, DollarIcon, HoldingsIcon } from './CategoryIcons'

const PEOPLE_DATA = [
  { name: "Nancy Pelosi", party: "Dem", position: "House", initials: "NP", bgColor: "bg-blue-600" },
  { name: "Marjorie Taylor Greene", party: "Rep", position: "House", initials: "MTG", bgColor: "bg-red-600" },
  { name: "J. D. Vance", party: "Rep", position: "VP", initials: "JDV", bgColor: "bg-red-600" },
]

const CATEGORIES_DATA = [
  { title: "Congress Trading", subtitle: "See Dashboard", icon: <CongressIcon />, iconBg: "bg-blue-600" },
  { title: "Insider Trading", subtitle: "See Dashboard", icon: <DollarIcon />, iconBg: "bg-green-600" },
  { title: "Institutional Holdings", subtitle: "See Dashboard", icon: <HoldingsIcon />, iconBg: "bg-purple-600" },
]

const STOCKS_DATA = [
  { symbol: "NVDA", name: "NVIDIA Corp", price: "202.49", change: "-0.13%", isPositive: false, logoBg: "bg-green-600" },
  { symbol: "AVGO", name: "Broadcom Inc", price: "369.63", change: "-1.79%", isPositive: false, logoBg: "bg-red-600" },
  { symbol: "TEM", name: "Tempus AI Inc. - O...", price: "89.85", change: "+4.30%", isPositive: true, logoBg: "bg-blue-600" },
]

export default function TrendingSection() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Trending Now On Quiver:</h2>
      
      {/* Row 1: People Tracking */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {PEOPLE_DATA.map((person, index) => (
          <PeopleCard key={index} {...person} />
        ))}
      </div>

      {/* Row 2: Trading Categories */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {CATEGORIES_DATA.map((category, index) => (
          <CategoryCard key={index} {...category} />
        ))}
      </div>

      {/* Row 3: Stock Performance */}
      <div className="grid grid-cols-3 gap-4">
        {STOCKS_DATA.map((stock, index) => (
          <StockCard key={index} {...stock} />
        ))}
      </div>
    </div>
  )
}

