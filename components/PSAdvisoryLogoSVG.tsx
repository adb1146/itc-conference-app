export function PSAdvisoryLogoSVG({ className = "h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 280 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PS Advisory"
    >
      {/* PS Icon - Blue square with interlocking S shape */}
      <g>
        {/* Blue square background */}
        <rect x="0" y="5" width="40" height="40" rx="6" fill="#3B82F6"/>

        {/* Interlocking S curves in white */}
        <path
          d="M 12 18
             C 12 14, 16 12, 20 12
             C 24 12, 28 14, 28 18
             C 28 22, 24 24, 20 24
             C 16 24, 12 26, 12 30
             C 12 34, 16 36, 20 36
             C 24 36, 28 34, 28 30"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* PS Advisory Text */}
      <text x="52" y="32" fontFamily="system-ui, -apple-system, sans-serif" fontSize="26" fontWeight="600" fill="#1e293b">
        PS Advisory
      </text>
    </svg>
  );
}