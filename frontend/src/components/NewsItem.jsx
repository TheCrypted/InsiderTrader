export default function NewsItem({ icon, text }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition cursor-pointer whitespace-nowrap">
      <span className="text-green-500">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

