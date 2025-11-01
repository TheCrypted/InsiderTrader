import SearchBar from './SearchBar'

export default function HeroSection({ onSearch }) {
  return (
    <div className="mb-12">
      <h1 className="text-5xl font-bold mb-4">Trade Like an Insider</h1>
      <p className="text-gray-400 text-lg mb-6">Track the forces that move the markets</p>
      <SearchBar
        placeholder="Search stocks, politicians, and more..."
        onSearch={onSearch}
      />
    </div>
  )
}

