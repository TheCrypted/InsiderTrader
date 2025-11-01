export default function TrendingCard({ children, className = "", onClick }) {
  return (
    <div
      className={`bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition cursor-pointer ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

