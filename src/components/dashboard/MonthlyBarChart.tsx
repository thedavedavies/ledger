import { useId } from 'react'

type BarDatum = {
  shortLabel: string
  longLabel: string
  totalCents: bigint
}

type Props = {
  caption: string
  data: BarDatum[]
  formatAxis: (cents: bigint) => string
  formatTooltip: (cents: bigint) => string
}

// SVG viewBox grid. Renders responsively because the viewBox preserves ratio.
const W = 800
const H = 240
const PAD_LEFT = 56
const PAD_RIGHT = 16
const PAD_TOP = 12
const PAD_BOTTOM = 32
const CHART_W = W - PAD_LEFT - PAD_RIGHT
const CHART_H = H - PAD_TOP - PAD_BOTTOM
const TICK_COUNT = 4

// Picks a "nice" axis maximum and evenly spaced tick values in cents. Step is
// 1, 2, 2.5, 5 or 10 × 10^k so the y-axis reads as round numbers.
function niceAxis(maxCents: bigint, tickCount: number): {
  max: bigint
  ticks: bigint[]
} {
  if (maxCents <= 0n) {
    const empty: bigint[] = []
    for (let i = 0; i < tickCount; i++) empty.push(0n)
    return { max: 0n, ticks: empty }
  }
  const intervals = tickCount - 1
  const rawStep = Number(maxCents) / intervals
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const norm = rawStep / mag
  const niceNorm =
    norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  const step = niceNorm * mag
  const ticks: bigint[] = []
  for (let i = 0; i <= intervals; i++) {
    ticks.push(BigInt(Math.round(step * i)))
  }
  return { max: ticks[ticks.length - 1]!, ticks }
}

export function MonthlyBarChart({
  caption,
  data,
  formatAxis,
  formatTooltip,
}: Props) {
  const captionId = useId()
  const descId = useId()

  let rawMax = 0n
  for (const d of data) if (d.totalCents > rawMax) rawMax = d.totalCents
  const { max: axisMax, ticks } = niceAxis(rawMax, TICK_COUNT)

  const cellW = CHART_W / data.length
  const barW = Math.min(48, cellW * 0.62)
  const baseY = PAD_TOP + CHART_H

  function barHeight(cents: bigint): number {
    if (axisMax <= 0n) return 0
    return (Number(cents) / Number(axisMax)) * CHART_H
  }

  function tickY(cents: bigint): number {
    if (axisMax <= 0n) return baseY
    return baseY - (Number(cents) / Number(axisMax)) * CHART_H
  }

  const accessibleDescription =
    rawMax > 0n
      ? `Bar chart of ${caption.toLowerCase()}, with values ranging from ${formatAxis(0n)} to ${formatAxis(axisMax)} across ${data.length} months.`
      : `Bar chart of ${caption.toLowerCase()} for the last ${data.length} months. No activity recorded.`

  return (
    <figure
      role="group"
      aria-labelledby={captionId}
      aria-describedby={descId}
      className="space-y-3"
    >
      <figcaption
        id={captionId}
        className="text-sm font-medium text-foreground"
      >
        {caption}
      </figcaption>
      <p id={descId} className="sr-only">
        {accessibleDescription}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={accessibleDescription}
        className="block h-auto w-full"
      >
        {/* Gridlines and y-axis tick labels */}
        <g aria-hidden="true">
          {ticks.map((t) => {
            const y = tickY(t)
            return (
              <g key={String(t)}>
                <line
                  x1={PAD_LEFT}
                  x2={PAD_LEFT + CHART_W}
                  y1={y}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text
                  x={PAD_LEFT - 10}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill="var(--color-muted-foreground)"
                >
                  {formatAxis(t)}
                </text>
              </g>
            )
          })}
        </g>

        {/* Bars */}
        <g>
          {data.map((d, i) => {
            const h = barHeight(d.totalCents)
            const x = PAD_LEFT + i * cellW + (cellW - barW) / 2
            const y = baseY - h
            return (
              <rect
                key={d.longLabel}
                x={x}
                y={y}
                width={barW}
                height={h}
                fill="var(--color-accent)"
                rx={2}
              >
                <title>{`${d.longLabel}: ${formatTooltip(d.totalCents)}`}</title>
              </rect>
            )
          })}
        </g>

        {/* X axis labels */}
        <g aria-hidden="true">
          {data.map((d, i) => {
            const cx = PAD_LEFT + i * cellW + cellW / 2
            return (
              <text
                key={d.longLabel}
                x={cx}
                y={H - 10}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-muted-foreground)"
              >
                {d.shortLabel}
              </text>
            )
          })}
        </g>
      </svg>

      {/* Data table for assistive tech. Visually hidden but in the DOM so
          screen reader users get the same data as sighted users see. The
          wrapper carries sr-only because <caption> is positioned outside the
          table box and would otherwise render visibly. */}
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.longLabel}>
                <th scope="row">{d.longLabel}</th>
                <td>{formatTooltip(d.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
