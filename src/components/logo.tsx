export function Logo({ className = 'size-6' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Center post */}
      <line x1="12" x2="12" y1="2" y2="22" />
      {/* Base */}
      <line x1="8" x2="16" y1="22" y2="22" />
      {/* Beam */}
      <line x1="3" x2="21" y1="6" y2="6" />
      {/* Fulcrum */}
      <polygon fill="currentColor" points="12,2 10,6 14,6" stroke="none" />
      {/* Left pan */}
      <path d="M3 6 L2 12 A4.5 2 0 0 0 11 12 L10 6" />
      {/* Right pan */}
      <path d="M14 6 L13 12 A4.5 2 0 0 0 22 12 L21 6" />
    </svg>
  );
}
