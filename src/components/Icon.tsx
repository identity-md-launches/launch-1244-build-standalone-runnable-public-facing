export type IconName =
  | 'arrow'
  | 'arrowUp'
  | 'arrowDown'
  | 'external'
  | 'close'
  | 'search'
  | 'bookmark'
  | 'grid'
  | 'clock'
  | 'shield'
  | 'check'
  | 'info'
  | 'layers'
  | 'spot'
  | 'contracts'
  | 'onchain'
  | 'tw'
  | 'us'
  | 'gold'
  | 'settings'
  | 'globe'
  | 'chevron';
const paths: Record<IconName, React.ReactNode> = {
  arrow: (
    <>
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </>
  ),
  arrowUp: <path d="m6 15 6-6 6 6M12 9v12" />,
  arrowDown: <path d="m6 9 6 6 6-6M12 3v12" />,
  external: (
    <>
      <path d="M14 4h6v6m0-6-9 9" />
      <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  bookmark: <path d="M6 4h12v17l-6-4-6 4V4Z" />,
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-11v1" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 10 5-10 5L2 8l10-5Zm-9 9 9 5 9-5M3 17l9 5 9-5" />
    </>
  ),
  spot: (
    <>
      <path d="m3 17 5-5 4 3 8-11M14 4h6v6" />
      <path d="M3 4v16h18" />
    </>
  ),
  contracts: (
    <>
      <path d="M6 3v18m12-18v18" />
      <rect x="3" y="7" width="6" height="7" rx="1" />
      <rect x="15" y="10" width="6" height="7" rx="1" />
    </>
  ),
  onchain: (
    <>
      <path d="m9 8 6 8m-6 0 6-8" />
      <circle cx="6" cy="5" r="3" />
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="19" r="3" />
      <circle cx="18" cy="19" r="3" />
    </>
  ),
  tw: (
    <>
      <path d="M12 3 8 7v4l-4 4 3 6 5-2 3-5 2-2 3-6-4-3-4 0Z" />
    </>
  ),
  us: (
    <>
      <path d="M3 20h18M5 20V9h14v11M3 9l9-6 9 6M9 12v5m6-5v5" />
    </>
  ),
  gold: (
    <>
      <path d="m8 5-5 14h18L16 5H8Zm-2 8h12M10 5l-1 8m5-8 1 8" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6h16M4 18h16M4 12h16" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="10" cy="18" r="2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
};
export default function Icon({
  name,
  size = 20,
  className = '',
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
