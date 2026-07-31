// =============================================================================
// icons.jsx
// Hand-drawn line icon set for TrustWork — replaces emoji throughout the UI.
// Consistent 1.75 stroke weight, currentColor-based so icons inherit theme
// colors (accent teal, violet, etc). No external icon library dependency.
// =============================================================================

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

// ── Brand mark ───────────────────────────────────────────────────────────
// Shield + check: reads instantly as "verified / secured" — fits an escrow
// product far better than a generic lightning bolt.
export function LogoMark({ size = 50, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 210" {...props}>
      <defs>
        <linearGradient id="tw-ring-grad" x1="100" y1="18" x2="100" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0b5f57" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="104" r="86" fill="none" stroke="url(#tw-ring-grad)" strokeWidth="13" />
      <path
        d="M40,54 L64,74 L136,74 L160,54"
        fill="none"
        stroke="#0e7d70"
        strokeWidth="12"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      <path
        d="M100,74 L100,116"
        fill="none"
        stroke="#0e7d70"
        strokeWidth="12"
        strokeLinecap="square"
      />
      <path
        d="M54,92 L72,148 L100,116 L128,148 L146,92"
        fill="none"
        stroke="#0e7d70"
        strokeWidth="12"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      <polygon points="70,76 94,76 82,96" fill="#8fe6da" />
      <polygon points="106,76 130,76 118,96" fill="#8fe6da" />
      <polygon points="86,150 114,150 100,176" fill="#8fe6da" />
    </svg>
  )
}

// ── Feature icons (Home page) ───────────────────────────────────────────
export function LockIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function BoltIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  )
}

export function ScaleIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v18" />
      <path d="M7 7h10" />
      <path d="M5 7l-3 6a3.5 3.5 0 0 0 7 0L5 7Z" />
      <path d="M19 7l-3 6a3.5 3.5 0 0 0 7 0l-4-6Z" />
      <path d="M8 21h8" />
    </svg>
  )
}

// Auto-release: a clock face reads cleaner than a robot emoji and still
// communicates "this happens automatically, on a timer".
export function AutoReleaseIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

// ── Contract template icons ─────────────────────────────────────────────
export function LaptopIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M2 20h20" />
      <path d="M8.5 20l0.8-4h5.4l0.8 4" />
    </svg>
  )
}

export function FlagIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 3v18" />
      <path d="M5 4.5h11l-2.5 3.75L16 12H5" />
    </svg>
  )
}

export function SearchIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.4-4.4" />
    </svg>
  )
}

export function SettingsIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M5.1 5.1l2.1 2.1M16.8 16.8l2.1 2.1M2.5 12h3M18.5 12h3M5.1 18.9l2.1-2.1M16.8 7.2l2.1-2.1" />
    </svg>
  )
}

// ── Empty state / misc icons ────────────────────────────────────────────
export function PackageIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M21 8l-9-5-9 5 9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  )
}

export function ClipboardIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="4" width="12" height="17" rx="1.5" />
      <rect x="9" y="2.3" width="6" height="3" rx="1" />
      <path d="M9 11h6M9 15h6" />
    </svg>
  )
}

// ── Theme toggle icons ───────────────────────────────────────────────────
export function SunIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  )
}

export function MoonIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  )
}

// Maps CONTRACT_TEMPLATES `icon` keys (see utils/contractTemplates.js) to
// their corresponding component.
export const TEMPLATE_ICONS = {
  laptop: LaptopIcon,
  flag: FlagIcon,
  search: SearchIcon,
  bolt: BoltIcon,
  settings: SettingsIcon,
}
