import SearchBar from './SearchBar'

export default function SearchSection({ onSearch }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h1 className="text-4xl font-bold mb-4">Track Insider Activity</h1>
      <p className="text-gray-600 mb-8">Search for politicians, stocks, and trading activity</p>
      <div className="w-full max-w-2xl">
        <SearchBar
          placeholder="Search stocks, politicians, and more..."
          onSearch={onSearch}
          className="bg-gray-50 border-gray-300"
        />
      </div>
    </div>
  )
}

