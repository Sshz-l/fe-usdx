type TIconPath = { type: 'path'; d: string }
type TIconRect = {
  type: 'rect'
  width: string
  height: string
  x: string
  y: string
  rx?: string
  ry?: string
}
type TIconShape = TIconPath | TIconRect | string

const path = (d: string): TIconPath => ({ type: 'path', d })
const shapesOf = (d: TIconShape | TIconShape[]): TIconShape[] => (Array.isArray(d) ? d : [d])

type TProps = {
  className?: string
  size?: number
  name:
    | 'wallet'
    | 'layers'
    | 'chevron-right'
    | 'pickaxe'
    | 'swap'
    | 'banknote'
    | 'claim'
    | 'copy'
    | 'copy-check'
    | 'external-link'
    | 'x'
    | 'chevron-left'
    | 'help-circle'
    | 'arrow-down'
    | 'alert-circle'
    | 'info'
    | 'arrow-up-down'
    | 'chevron-down'
    | 'arrow-left-right'
    | 'hand-coins'
    | 'box'
    | 'hexagon'
    | 'scan-line'
    | 'circle-dot'
    | 'alert-triangle'
    | 'user-cog'
    | 'activity'
    | 'cloud-off'
    | 'shield-check'
    | 'clock'
    | 'check-circle-2'
    | 'x-circle'
    | 'check'
    | 'circle'
}

/** lucide@0.525.0 — 与设计稿 HTML `data-lucide` 同源 */
const PATHS: Record<TProps['name'], TIconShape | TIconShape[]> = {
  wallet: [
    'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1',
    'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4',
  ],
  layers:
    'M12 3 3.5 8 12 13l8.5-5L12 3Zm-8.5 9L12 17l8.5-5M3.5 16 12 21l8.5-5',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-left': 'M15 18l-6-6 6-6',
  pickaxe: [
    'M14.531 12.469 6.619 20.38a1 1 0 1 1-3-3l7.912-7.912',
    'M15.686 4.314A12.5 12.5 0 0 0 5.461 2.958 1 1 0 0 0 5.58 4.71a22 22 0 0 1 6.318 3.393',
    'M17.7 3.7a1 1 0 0 0-1.4 0l-4.6 4.6a1 1 0 0 0 0 1.4l2.6 2.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z',
    'M19.686 8.314a12.501 12.501 0 0 1 1.356 10.225 1 1 0 0 1-1.751-.119 22 22 0 0 0-3.393-6.319',
  ],
  swap: 'M7 7h11M14 3l4 4-4 4M17 17H6m4 4-4-4 4-4',
  /* lucide@0.525.0 banknote — 与 HTML data-lucide="banknote" 一致 */
  banknote: [
    'M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
    'M12 10a2 2 0 1 0 0 4 2 2 0 1 0 0-4z',
    'M6 12h.01M18 12h.01',
  ],
  claim: 'M8 11h8M8 15h5M6 4h12l1 4H5l1-4Zm1 4v12h10V8',
  copy: [
    { type: 'rect', width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2' },
    'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2',
  ],
  'copy-check': [
    'm12 15 2 2 4-4',
    { type: 'rect', width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2' },
    'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2',
  ],
  'external-link': ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  x: 'M6 6l12 12M18 6 6 18',
  'arrow-down': 'M12 5v14M19 12l-7 7-7-7',
  'help-circle': [
    'M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20',
    'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3',
    'M12 17h.01',
  ],
  'alert-circle': ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20', 'M12 8v4', 'M12 16h.01'],
  info: ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20', 'M12 16v-4', 'M12 8h.01'],
  'chevron-down': 'M6 9l6 6 6-6',
  'arrow-up-down': ['M8 3v18', 'M4 7l4-4 4 4', 'M16 21V3', 'M12 17l4 4 4-4'],
  'arrow-left-right': ['M8 3 4 7l4 4', 'M4 7h16', 'M16 21l4-4-4-4', 'M20 17H4'],
  'hand-coins': [
    'M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17',
    'm7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9',
    'm2 16 6 6',
    'M13.1 9a2.9 2.9 0 1 0 5.8 0 2.9 2.9 0 1 0-5.8 0',
    'M3 5a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  ],
  box: ['M21 8 12 13 3 8', 'M3 8 12 3l9 5v8l-9 5-9-5V8Z', 'M12 13v8'],
  hexagon:
    'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
  'scan-line': [
    'M3 7V5a2 2 0 0 1 2-2h2',
    'M17 3h2a2 2 0 0 1 2 2v2',
    'M21 17v2a2 2 0 0 1-2 2h-2',
    'M7 21H5a2 2 0 0 1-2-2v-2',
    'M7 12h10',
  ],
  'circle-dot': ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20', 'M12 12h.01'],
  'alert-triangle': [
    'M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z',
    'M12 9v4',
    'M12 17h.01',
  ],
  'user-cog': [
    'M10 15H6a4 4 0 0 0-4 4v2',
    'M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    'M21 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    'm19.8 20.4.9.9',
    'm15.3 15.3.9.9',
    'M18 14.5v1',
    'M18 20.5v1',
  ],
  activity:
    'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2',
  'cloud-off': [
    'm2 2 20 20',
    'M5.8 5.8A7 7 0 0 0 5 9.5 7.5 7.5 0 0 0 12.5 17c1.6 0 3.1-.5 4.3-1.4',
    'M18.6 14.4A7.5 7.5 0 0 0 9.4 5.3',
    'M8.5 16.5A4 4 0 0 1 5 13c0-1.2.5-2.3 1.4-3',
  ],
  'shield-check': [
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    'm9 12 2 2 4-4',
  ],
  clock: ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20', 'M12 6v6l4 2'],
  'check-circle-2': [
    'M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20',
    'm9 12 2 2 4-4',
  ],
  'x-circle': [
    'M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20',
    'M15 9l-6 6',
    'M9 9l6 6',
  ],
  check: 'M20 6 9 17l-5-5',
  circle: 'M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20',
}

export const UsdxIcon = ({ name, className, size = 24 }: TProps) => {
  const nodes = shapesOf(PATHS[name]).map((shape) =>
    typeof shape === 'string' ? path(shape) : shape
  )
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      {nodes.map((node, i) =>
        node.type === 'rect' ? (
          <rect
            key={`r${i}`}
            width={node.width}
            height={node.height}
            x={node.x}
            y={node.y}
            rx={node.rx}
            ry={node.ry}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path key={node.d} d={node.d} strokeLinecap="round" strokeLinejoin="round" />
        )
      )}
    </svg>
  )
}
