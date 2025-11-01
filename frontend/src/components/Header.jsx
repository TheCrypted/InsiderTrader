import { Link } from 'react-router-dom'
import NavLink from './NavLink'
import SearchBar from './SearchBar'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-black text-white relative">
      <nav className="flex items-stretch justify-between h-20 relative">
        {/* Logo - Clickable link to home */}
        <Link to="/" className="flex items-center pl-16 hover:opacity-80 transition-opacity duration-200">
          <div className="flex items-center gap-2">
            {/* White square with black I */}
            <div className="w-10 h-10 bg-white flex items-center justify-center flex-shrink-0">
              <span className="text-black  text-xl">I</span>
            </div>
            {/* TRADER text */}
            <span className="text-xl tracking-tight">TRADER</span>
          </div>
        </Link>

        {/* Browse Button */}
        <div className="flex items-stretch h-full pr-16">
          <Link
            to="/browse"
            className="flex items-center px-4 py-2 bg-white text-black border-2 border-black font-medium hover:bg-gray-200 transition-all duration-200"
          >
            Browse All
          </Link>
        </div>
      </nav>
    </header>
  )
}

