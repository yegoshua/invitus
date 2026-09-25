// The design's own icon set: 20px, 1.6 stroke, round caps.

type Props = { className?: string };

function Svg({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" className={className} aria-hidden>
      {children}
    </svg>
  );
}

export const OverviewIcon = (p: Props) => (
  <Svg {...p}>
    <rect x={3} y={3} width={5.5} height={5.5} rx={1.5} />
    <rect x={11.5} y={3} width={5.5} height={5.5} rx={1.5} />
    <rect x={3} y={11.5} width={5.5} height={5.5} rx={1.5} />
    <rect x={11.5} y={11.5} width={5.5} height={5.5} rx={1.5} />
  </Svg>
);
export const OrdersIcon = (p: Props) => (
  <Svg {...p}>
    <rect x={3.5} y={3} width={13} height={14} rx={2.5} />
    <line x1={7} y1={8} x2={13} y2={8} />
    <line x1={7} y1={12} x2={11} y2={12} />
  </Svg>
);
export const ProductsIcon = (p: Props) => (
  <Svg {...p}>
    <rect x={3} y={6} width={14} height={11} rx={2} />
    <line x1={3} y1={6} x2={17} y2={6} />
    <rect x={5.5} y={3} width={9} height={3} rx={1} />
  </Svg>
);
export const TrafficIcon = (p: Props) => (
  <Svg {...p}>
    <rect x={3} y={11} width={3} height={6} rx={1} />
    <rect x={8.5} y={7} width={3} height={10} rx={1} />
    <rect x={14} y={3} width={3} height={14} rx={1} />
  </Svg>
);
export const ExpensesIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx={10} cy={10} r={7} />
    <line x1={6.8} y1={10} x2={13.2} y2={10} />
  </Svg>
);

/** The site's arrow-right-up, used for every "open in KeyCRM". */
export function ArrowUpRightIcon({ className, size = 20 }: Props & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6.65078 18.825L4.42578 16.6L13.4508 7.57499H5.67578V4.42499H18.8258V17.575H15.6758V9.79999L6.65078 18.825Z" fill="currentColor" />
    </svg>
  );
}
