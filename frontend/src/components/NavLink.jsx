export default function NavLink({ children, hasDropdown = false, href = "#", className = "", isActive = false }) {
  return (
    <a 
      href={href} 
      className={`h-full flex items-center justify-center px-6 transition relative group text-white ${
        isActive 
          ? 'bg-gray-800' 
          : 'hover:bg-stone-900'
      } ${className}`}
    >
      {/* Left vertical line on hover */}
      
      {children}
      {hasDropdown && (
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
      
      {/* Right vertical line on hover */}
    </a>
  )
}

