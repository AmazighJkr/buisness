export default function CircuitBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-20" aria-hidden>
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#d1d5db"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <g stroke="#0891b2" strokeWidth="0.5" fill="none" opacity="0.35">
          <path d="M0 120 H200 L240 80 H480 L520 160 H800" />
          <path d="M100 0 V200 L180 280 V600" />
          <path d="M60% 0 V40% H80% V100%" />
          <circle cx="200" cy="120" r="3" fill="#0891b2" />
          <circle cx="480" cy="80" r="3" fill="#059669" />
          <circle cx="520" cy="160" r="3" fill="#d97706" />
        </g>
      </svg>
    </div>
  )
}
