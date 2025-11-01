export default function IsometricIllustration() {
  return (
    <div className="relative w-full h-[600px]">
      {/* Large Monitor */}
      <div className="absolute top-20 right-0 w-64 h-48 bg-gray-800 border-2 border-gray-700 transform rotate-[30deg] skew-y-[-10deg]">
        <div className="absolute inset-4 bg-gray-900 border border-gray-700">
          {/* Bar Chart */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end gap-2 h-16">
            <div className="flex-1 bg-green-500 h-8"></div>
            <div className="flex-1 bg-blue-500 h-12"></div>
            <div className="flex-1 bg-purple-500 h-6"></div>
            <div className="flex-1 bg-pink-500 h-10"></div>
          </div>
        </div>
      </div>

      {/* Person Figure */}
      <div className="absolute bottom-20 left-10">
        <div className="relative">
          {/* Head */}
          <div className="w-16 h-16 bg-gray-700 rounded-full border-2 border-gray-600"></div>
          {/* Body */}
          <div className="absolute top-16 left-4 w-24 h-32 bg-gray-800 border-2 border-gray-600 transform skew-y-[-5deg]">
            <div className="absolute top-4 left-2 w-20 h-8 bg-gray-900"></div>
          </div>
        </div>
      </div>

      {/* Floating Shapes */}
      <div className="absolute top-10 left-20 w-12 h-12 bg-purple-500 rounded-lg transform rotate-45 opacity-60"></div>
      <div className="absolute top-40 left-10 w-8 h-8 bg-pink-500 rounded-full opacity-60"></div>
      <div className="absolute bottom-40 right-20 w-16 h-16 bg-blue-500 rounded-lg transform rotate-12 opacity-40"></div>

      {/* Infinity Symbol */}
      <div className="absolute top-0 right-20 text-purple-500 text-6xl font-bold opacity-50">
        ∞
      </div>

      {/* Glowing Lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
        <line x1="20%" y1="30%" x2="60%" y2="50%" stroke="#3b82f6" strokeWidth="2" />
        <line x1="40%" y1="70%" x2="70%" y2="40%" stroke="#8b5cf6" strokeWidth="2" />
        <line x1="30%" y1="50%" x2="80%" y2="30%" stroke="#ec4899" strokeWidth="2" />
      </svg>
    </div>
  )
}

