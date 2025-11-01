import SearchBar from './SearchBar'

export default function SearchSection({ onSearch }) {
  return (
    <div className="relative bg-black text-white overflow-hidden min-h-[70vh] flex items-center">
      {/* Diagonal split gradient overlay */}
      <div className="absolute inset-0 opacity-30">
        <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none">
          <defs>
            <linearGradient id="diagonalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#000000" />
              <stop offset="50%" stopColor="#1a1a1a" />
              <stop offset="100%" stopColor="#000000" />
            </linearGradient>
            <pattern id="gridPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diagonalGradient)" />
          <rect width="100%" height="100%" fill="url(#gridPattern)" />
        </svg>
      </div>

      {/* Abstract grayscale wavy background */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 1200 600" preserveAspectRatio="none">
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#666666" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M 0,300 Q 300,250 600,300 T 1200,300 L 1200,600 L 0,600 Z"
            fill="url(#waveGradient)"
          />
          <path
            d="M 0,400 Q 400,350 800,400 T 1200,400 L 1200,600 L 0,600 Z"
            fill="url(#waveGradient)"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* Complex diagonal geometric overlay with lines and nodes */}
      <div className="absolute inset-0 overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 1200 840" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
            </linearGradient>
            <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
            </linearGradient>
          </defs>
          
          {/* Primary diagonal lines */}
          <line x1="0" y1="0" x2="1200" y2="840" stroke="url(#lineGradient1)" strokeWidth="1.5" />
          <line x1="200" y1="0" x2="1000" y2="840" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          <line x1="400" y1="0" x2="1200" y2="600" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <line x1="0" y1="200" x2="1200" y2="840" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <line x1="600" y1="0" x2="1200" y2="420" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          
          {/* Secondary diagonal lines */}
          <line x1="0" y1="300" x2="800" y2="840" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1="300" y1="0" x2="1200" y2="560" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          
          {/* Grid lines - vertical */}
          <line x1="400" y1="0" x2="400" y2="840" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <line x1="600" y1="0" x2="600" y2="840" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <line x1="800" y1="0" x2="800" y2="840" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1="1000" y1="0" x2="1000" y2="840" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          
          {/* Grid lines - horizontal */}
          <line x1="0" y1="210" x2="1200" y2="210" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <line x1="0" y1="420" x2="1200" y2="420" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1="0" y1="630" x2="1200" y2="630" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          
          {/* Connection lines between nodes */}
          <line x1="600" y1="150" x2="800" y2="300" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          <line x1="850" y1="200" x2="1000" y2="350" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
          <line x1="700" y1="500" x2="950" y2="650" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          <line x1="600" y1="150" x2="950" y2="500" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          
          {/* Nodes - white squares (increased quantity) */}
          <rect x="300" y="100" width="8" height="8" fill="white" opacity="0.4" />
          <rect x="600" y="150" width="8" height="8" fill="white" opacity="0.4" />
          <rect x="800" y="300" width="8" height="8" fill="white" opacity="0.4" />
          <rect x="950" y="200" width="8" height="8" fill="white" opacity="0.4" />
          <rect x="1000" y="350" width="8" height="8" fill="white" opacity="0.4" />
          <rect x="700" y="500" width="8" height="8" fill="white" opacity="0.4" />
          <rect x="950" y="500" width="8" height="8" fill="white" opacity="0.4" />
          <rect x="1050" y="650" width="8" height="8" fill="white" opacity="0.4" />
          <rect x="450" y="600" width="8" height="8" fill="white" opacity="0.3" />
          <rect x="550" y="700" width="8" height="8" fill="white" opacity="0.3" />
          
          {/* Neon yellow accent nodes (increased and better positioned) */}
          <rect x="600" y="150" width="12" height="12" fill="#FFFF00" opacity="0.9" />
          <rect x="850" y="450" width="12" height="12" fill="#FFFF00" opacity="0.9" />
          <rect x="1050" y="250" width="10" height="10" fill="#FFFF00" opacity="0.8" />
          <rect x="400" y="550" width="10" height="10" fill="#FFFF00" opacity="0.8" />
          
          {/* Additional geometric shapes */}
          <polygon points="750,150 800,180 750,210 700,180" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <circle cx="900" cy="400" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
              Track Insider
              <br />
              Activity
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Search for politicians, stocks, and trading activity
            </p>
          </div>
          <div className="w-full max-w-2xl">
            <SearchBar
              placeholder="Search stocks, politicians, and more..."
              onSearch={onSearch}
              className="bg-black text-white"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

