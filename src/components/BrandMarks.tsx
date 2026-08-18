import { Handshake } from 'lucide-react';

type BrandProps = {
  className?: string;
  size?: number;
};

export function BodyGarageBadge({ className = '', size = 180 }: BrandProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      aria-label="Body Garage logo"
      role="img"
    >
      <circle cx="60" cy="60" r="52" fill="#e31e24" />
      <circle cx="60" cy="60" r="42" fill="#08090b" />
      <g fill="#f7f7f7">
        <rect x="13" y="52" width="18" height="16" rx="3" />
        <rect x="89" y="52" width="18" height="16" rx="3" />
        <rect x="30" y="39" width="60" height="10" rx="4" />
        <rect x="50" y="23" width="20" height="30" rx="4" />
        <rect x="22" y="57" width="76" height="10" rx="5" />
        <path d="M43 70h34v10H43z" />
      </g>
    </svg>
  );
}

export function PersonalTrainingBadge({ className = '', size = 22 }: BrandProps) {
  return (
    <Handshake
      width={size}
      height={size}
      className={className}
      aria-label="Personal training logo"
      role="img"
      strokeWidth={2.2}
    />
  );
}
