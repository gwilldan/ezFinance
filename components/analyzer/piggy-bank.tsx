/** A piggy bank catching a coin. Decorative; motion lives in globals.css. */
export function PiggyBank({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 96"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="60" cy="90" rx="30" ry="3.5" fill="#0f172a" opacity="0.08" />

      <g className="piggy-coin">
        <circle
          cx="60"
          cy="14"
          r="8"
          fill="#f7ca18"
          stroke="#d9a90b"
          strokeWidth="2"
        />
        <path
          d="M60 9.5v9"
          stroke="#d9a90b"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      <g className="piggy-body">
        {/* tail */}
        <path
          d="M26 58c-6 0-8-6-4-8s6 3 2 6"
          fill="none"
          stroke="#2e86de"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* legs */}
        <rect x="38" y="70" width="9" height="13" rx="4" fill="#9cc8f2" />
        <rect x="52" y="72" width="9" height="12" rx="4" fill="#8bbdec" />
        <rect x="68" y="72" width="9" height="12" rx="4" fill="#8bbdec" />
        <rect x="80" y="70" width="9" height="13" rx="4" fill="#9cc8f2" />
        {/* body */}
        <ellipse
          cx="62"
          cy="57"
          rx="37"
          ry="25"
          fill="#cfe4fa"
          stroke="#2e86de"
          strokeWidth="2.5"
        />
        {/* ear */}
        <path
          d="M79 36l7-11 4 14z"
          fill="#9cc8f2"
          stroke="#2e86de"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* coin slot */}
        <rect x="52" y="33" width="17" height="4" rx="2" fill="#2e86de" />
        {/* snout */}
        <ellipse
          cx="97"
          cy="58"
          rx="8.5"
          ry="7.5"
          fill="#9cc8f2"
          stroke="#2e86de"
          strokeWidth="2.5"
        />
        <circle cx="94.5" cy="58" r="1.4" fill="#1e5fa3" />
        <circle cx="99.5" cy="58" r="1.4" fill="#1e5fa3" />
        {/* face */}
        <ellipse
          className="piggy-eye"
          cx="84"
          cy="49"
          rx="2.4"
          ry="2.6"
          fill="#0f172a"
        />
        <ellipse cx="80" cy="59" rx="4" ry="2.4" fill="#f9a8b8" opacity="0.7" />
      </g>

      <g className="piggy-sparkle" fill="#f7ca18">
        <path d="M30 26l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" />
      </g>
    </svg>
  )
}
