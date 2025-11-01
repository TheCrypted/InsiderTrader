import NavLink from './NavLink'
import SearchBar from './SearchBar'

export default function Header() {
  return (
    <header className="border-b border-gray-300 relative bg-white">
      <div className="mx-8">
        <nav className="flex items-stretch justify-between h-16 relative">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-3xl font-semibold">Inside Trader</span>
          </div>

          {/* Navigation Links - Positioned at right edge of page */}
          <div className="hidden md:flex items-stretch absolute right-[-2rem] h-16">
            <NavLink>Home</NavLink>
            <NavLink hasDropdown>Datasets</NavLink>
            <NavLink>Congress</NavLink>
            <NavLink>Legislation</NavLink>
          </div>
        </nav>
      </div>
    </header>
  )
}

