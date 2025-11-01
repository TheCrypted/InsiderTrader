export default function NavLink({ children, hasDropdown = false, href = "#", className = "", isActive = false }) {
  return (
    <a 
      href={href} 
      className={`h-full flex items-center justify-center px-6 transition relative group ${isActive ? 'bg-gray-200' : 'hover:bg-gray-200'} ${className}`}
    >
      {/* Left vertical line on hover */}
      <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"></span>
      
      {children}
      {hasDropdown && (
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
      
      {/* Right vertical line on hover */}
      <span className="absolute right-0 top-0 bottom-0 w-0.5 bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"></span>
    </a>
  )
}

