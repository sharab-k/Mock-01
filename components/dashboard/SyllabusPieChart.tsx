'use client'

import { useState } from 'react'

// ── Chart constants ──────────────────────────────────────────────────────────
const CX        = 100
const CY        = 100
const R_OUT     = 76
const R_IN      = 50
const R_OUT_HOV = 79
const R_IN_HOV  = 47
const GAP       = 2.5   // degrees gap between segments
const TOTAL_MAX = 500   // 5 subjects × 100

// ── Subject data ─────────────────────────────────────────────────────────────
const SUBJECTS = [
  { label: 'Mathematics', covered: 72, color: '#233357' }, // ink-700
  { label: 'English',     covered: 85, color: '#3D7157' }, // success
  { label: 'Physics',     covered: 60, color: '#A97C2D' }, // warning
  { label: 'Chemistry',   covered: 55, color: '#973F35' }, // danger
  { label: 'Urdu',        covered: 80, color: '#7E587E' }, // role.marks
]

const totalCovered = SUBJECTS.reduce((a, s) => a + s.covered, 0) // 352
const overallPct   = Math.round(totalCovered / SUBJECTS.length)  // 70

// ── SVG arc path helpers ─────────────────────────────────────────────────────
function polarPt(r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}

function donutArc(start: number, end: number, rOut: number, rIn: number): string {
  if (end - start >= 360) end = start + 359.99
  const large = end - start > 180 ? 1 : 0
  const s  = polarPt(rOut, start);  const e  = polarPt(rOut, end)
  const si = polarPt(rIn,  start);  const ei = polarPt(rIn,  end)
  return (
    `M${s.x.toFixed(2)},${s.y.toFixed(2)} ` +
    `A${rOut},${rOut},0,${large},1,${e.x.toFixed(2)},${e.y.toFixed(2)} ` +
    `L${ei.x.toFixed(2)},${ei.y.toFixed(2)} ` +
    `A${rIn},${rIn},0,${large},0,${si.x.toFixed(2)},${si.y.toFixed(2)}Z`
  )
}

// ── Component ────────────────────────────────────────────────────────────────
export default function SyllabusPieChart() {
  const [hovered, setHovered] = useState<number | null>(null)

  // Pre-compute segment angles
  let angle = 0
  const segs = SUBJECTS.map((s, i) => {
    const span  = (s.covered / TOTAL_MAX) * 360
    const start = angle
    const end   = angle + span - GAP
    angle      += span
    return { ...s, i, start, end }
  })

  // Uncovered (gray) segment fills the rest
  const uncoveredSpan  = ((TOTAL_MAX - totalCovered) / TOTAL_MAX) * 360
  const uncoveredEnd   = angle + uncoveredSpan - GAP

  const hovSeg = hovered !== null ? segs[hovered] : null

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-1 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[14px] font-semibold text-neutral-900">Syllabus Coverage</h2>
          <p className="text-[11.5px] text-neutral-400 mt-0.5 font-mono">Current term · 5 subjects</p>
        </div>
        <span className="text-[12px] font-semibold text-ink-600 bg-ink-50 px-3 py-1.5 rounded-xl border border-ink-100">
          {overallPct}% overall
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-7">

        {/* ── Donut chart ─────────────────────────────────────────────────── */}
        <div className="shrink-0">
          <svg
            viewBox="0 0 200 200"
            width="176"
            height="176"
            role="img"
            aria-label={`Syllabus coverage donut chart. Overall ${overallPct}% of the curriculum is covered.`}
          >
            {/* Subject segments */}
            {segs.map((seg) => {
              const isHov = hovered === seg.i
              return (
                <path
                  key={seg.label}
                  d={donutArc(
                    seg.start, seg.end,
                    isHov ? R_OUT_HOV : R_OUT,
                    isHov ? R_IN_HOV  : R_IN,
                  )}
                  fill={seg.color}
                  opacity={hovered === null ? 0.9 : isHov ? 1 : 0.28}
                  style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
                  onMouseEnter={() => setHovered(seg.i)}
                  onMouseLeave={() => setHovered(null)}
                  role="listitem"
                  aria-label={`${seg.label}: ${seg.covered}% covered`}
                />
              )
            })}

            {/* Uncovered gap (neutral) */}
            <path
              d={donutArc(angle, uncoveredEnd, R_OUT, R_IN)}
              fill="#D6D2CC"
              opacity={hovered !== null ? 0.2 : 0.65}
              style={{ transition: 'opacity 0.15s ease' }}
            />

            {/* Center label — swaps on hover */}
            {hovSeg ? (
              <>
                <text x={CX} y={CY - 14} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#938B80" fontFamily="'IBM Plex Sans', system-ui, sans-serif">
                  {hovSeg.label}
                </text>
                <text x={CX} y={CY + 2} textAnchor="middle" dominantBaseline="middle" fontSize="24" fontWeight="700" fill={hovSeg.color} fontFamily="'IBM Plex Mono', monospace">
                  {hovSeg.covered}%
                </text>
                <text x={CX} y={CY + 17} textAnchor="middle" dominantBaseline="middle" fontSize="7.5" fill="#938B80" fontFamily="'IBM Plex Sans', system-ui, sans-serif" letterSpacing="0.07em">
                  COVERED
                </text>
              </>
            ) : (
              <>
                <text x={CX} y={CY + 2} textAnchor="middle" dominantBaseline="middle" fontSize="26" fontWeight="700" fill="#18243E" fontFamily="'IBM Plex Mono', monospace">
                  {overallPct}%
                </text>
                <text x={CX} y={CY + 19} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#938B80" fontFamily="'IBM Plex Sans', system-ui, sans-serif" letterSpacing="0.07em">
                  COVERED
                </text>
              </>
            )}
          </svg>
        </div>

        {/* ── Legend with mini progress bars ──────────────────────────────── */}
        <div className="flex-1 space-y-3.5 w-full sm:w-auto">
          {SUBJECTS.map((s, i) => (
            <div
              key={s.label}
              className="flex items-center gap-3"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'default' }}
            >
              {/* Swatch */}
              <div
                className="w-2.5 h-2.5 rounded-sm shrink-0 transition-opacity duration-150"
                style={{
                  backgroundColor: s.color,
                  opacity: hovered === null || hovered === i ? 1 : 0.28,
                }}
              />
              {/* Bar + label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-[12.5px] font-medium transition-colors duration-150 ${hovered === i ? 'text-neutral-900' : 'text-neutral-600'}`}>
                    {s.label}
                  </span>
                  <span
                    className="text-[12px] font-bold font-mono shrink-0 transition-opacity duration-150"
                    style={{ color: s.color, opacity: hovered === null || hovered === i ? 1 : 0.28 }}
                  >
                    {s.covered}%
                  </span>
                </div>
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-opacity duration-150"
                    style={{
                      width: `${s.covered}%`,
                      backgroundColor: s.color,
                      opacity: hovered === null || hovered === i ? 1 : 0.22,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Remaining */}
          <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
            <div className="w-2.5 h-2.5 rounded-sm bg-neutral-300 shrink-0" />
            <span className="text-[12px] text-neutral-400 flex-1">Not yet covered</span>
            <span className="text-[12px] font-bold font-mono text-neutral-400">{100 - overallPct}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
