export default function SearchBar({ placeholder, className = "", onSearch }) {
  return (
    <div className={`bg-white border border-gray-300 rounded-lg px-4 py-3 flex items-center shadow-sm ${className}`}>
      <svg className="w-6 h-6 text-gray-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        className="bg-transparent outline-none flex-1 text-sm text-gray-900"
        onChange={(e) => onSearch?.(e.target.value)}
      />
    </div>
  )
}

