import { useId } from "react"

export function BookOpenFull({ className }: { className?: string }) {
  const maskId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <path d="M12 7v14" stroke="black" strokeWidth="2" strokeLinecap="round" />
        </mask>
      </defs>
      <path
        d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
        mask={`url(#${maskId})`}
      />
    </svg>
  )
}

export function CalendarDaysFull({ className }: { className?: string }) {
  const maskId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <path d="M3 10h18" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 14h.01" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 14h.01" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 14h.01" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 18h.01" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 18h.01" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 18h.01" stroke="black" strokeWidth="2" strokeLinecap="round" />
        </mask>
      </defs>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect
        width="18"
        height="18"
        x="3"
        y="4"
        rx="2"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
    </svg>
  )
}

export function AlertCircleFull({ className }: { className?: string }) {
  const maskId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <line x1="12" y1="8" x2="12" y2="12" stroke="black" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="black" strokeWidth="2" strokeLinecap="round" />
        </mask>
      </defs>
      <circle cx="12" cy="12" r="10" mask={`url(#${maskId})`} />
    </svg>
  )
}

export function SettingsFull({ className }: { className?: string }) {
  const maskId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <circle cx="12" cy="12" r="3" fill="black" stroke="black" strokeWidth="2" />
        </mask>
      </defs>
      <path
        d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
        mask={`url(#${maskId})`}
      />
    </svg>
  )
}

export function FileCheckFull({ className }: { className?: string }) {
  const maskId = useId()
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          {/* Folded corner crease line cutout */}
          <path
            d="M14 2v5a1 1 0 0 0 1 1h5"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Center checkmark cutout */}
          <path
            d="m9 15 2 2 4-4"
            stroke="black"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </mask>
      </defs>
      <path
        d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
        mask={`url(#${maskId})`}
      />
    </svg>
  )
}
