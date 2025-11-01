import NavLink from './NavLink'
import SearchBar from './SearchBar'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-black text-white relative">
      <nav className="flex items-stretch justify-between h-20 relative">
        {/* Logo - Displaced from left margin */}
        <div className="flex items-center pl-16">
          <div className="flex items-center gap-2">
            {/* White square with black I */}
            <div className="w-10 h-10 bg-white flex items-center justify-center flex-shrink-0">
              <span className="text-black  text-xl">I</span>
            </div>
            {/* TRADER text */}
            <span className="text-xl tracking-tight">TRADER</span>
          </div>
        </div>

        {/* Navigation Links - Positioned at right */}
        <div className="hidden md:flex items-stretch h-full -16">
        <NavLink>Home</NavLink>
            <NavLink hasDropdown>Datasets</NavLink>
            <NavLink>Congress</NavLink>
            <NavLink>Legislation</NavLink>
        </div>
      </nav>
    </header>
  )
}

