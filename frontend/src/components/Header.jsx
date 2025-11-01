import NavLink from './NavLink'
import SearchBar from './SearchBar'

export default function Header() {
  return (
    <header className="border-b border-gray-800">
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-white rounded-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-full"></div>
          </div>
          <span className="text-xl font-semibold">QUIVER QUANTITATIVE</span>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink>Home</NavLink>
          <NavLink hasDropdown>Datasets</NavLink>
          <NavLink>Strategies</NavLink>
          <NavLink hasDropdown>Premium</NavLink>
          <NavLink>Pricing</NavLink>
          <NavLink hasDropdown>More</NavLink>
        </div>

        {/* Search and User Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search Quiver..."
              className="bg-transparent outline-none text-sm w-40"
            />
          </div>
          <a href="#" className="hidden lg:flex items-center gap-2 hover:text-gray-300 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Sign In
          </a>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
            Join Quiver
          </button>
        </div>
      </nav>
    </header>
  )
}

