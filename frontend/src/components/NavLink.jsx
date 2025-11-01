export default function NavLink({ children, hasDropdown = false, href = "#", className = "" }) {
  return (
    <a href={href} className={`hover:text-gray-300 transition flex items-center gap-1 ${className}`}>
      {children}
      {hasDropdown && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </a>
  )
}

