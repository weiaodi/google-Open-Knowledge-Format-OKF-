import React, { useState } from 'react'
import { useGraphStore } from '@/store/graphStore'
import styles from './Timeline.module.css'

const STOPS = [
  { year: 2009, spec: 'ES5',     color: '#94a3b8' },
  { year: 2015, spec: 'ES6',     color: '#3d9fde' },
  { year: 2017, spec: 'ES2017',  color: '#1456f0' },
  { year: 2024, spec: 'ES2024+', color: '#7c3aed' },
]

const Timeline: React.FC = () => {
  const { timelineYear, setTimelineYear, nodes } = useGraphStore()
  const [open, setOpen] = useState(false)

  const countAt = (y: number) => nodes.filter(n => n.year <= y).length
  const activeStop = STOPS.find(s => s.year === timelineYear)

  return (
    <div className={`${styles.card} ${open ? styles.expanded : ''}`}>
      {/* ── Collapsed trigger ── */}
      <button
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        title="版本快照"
      >
        <span className={styles.triggerIcon}>🕐</span>
        <span className={styles.triggerLabel}>版本快照</span>

        {/* Mini year pills (collapsed preview) */}
        {!open && (
          <div className={styles.miniPills}>
            {STOPS.map(s => (
              <span
                key={s.year}
                className={`${styles.miniPill} ${timelineYear === s.year ? styles.miniPillOn : ''}`}
                style={timelineYear === s.year ? { background: s.color } : {}}
              />
            ))}
          </div>
        )}

        {timelineYear && !open && (
          <span className={styles.triggerBadge} style={{ background: activeStop?.color }}>
            ≤ {timelineYear}
          </span>
        )}

        <span className={`${styles.chevron} ${open ? styles.chevronUp : ''}`}>›</span>
      </button>

      {/* ── Expanded content ── */}
      {open && (
        <>
          <div className={styles.headerRow}>
            {timelineYear && (
              <button className={styles.clearBtn} onClick={() => setTimelineYear(null)}>
                全部
              </button>
            )}
          </div>

          {/* Vertical track — strictly contained */}
          <div className={styles.trackWrap}>
            {/* Background rail — only between first and last stop */}
            <div className={styles.rail} />

            {STOPS.map((s, i) => {
              const active  = timelineYear === null || s.year <= timelineYear
              const current = timelineYear === s.year
              // Map stop index to px inside trackWrap (h=136, padding=8px top+bottom → usable 120px)
              const topPx  = 8 + (i / (STOPS.length - 1)) * 120
              const topPct = (topPx / 136) * 100

              return (
                <button
                  key={s.year}
                  className={`${styles.stop} ${active ? styles.active : ''} ${current ? styles.current : ''}`}
                  style={{
                    top: `${topPct}%`,
                    '--dot-color': active ? s.color : '#c5cad5',
                  } as React.CSSProperties}
                  onClick={() => setTimelineYear(current ? null : s.year)}
                  title={`${s.spec} · ${countAt(s.year)} 个概念`}
                >
                  <span className={styles.dot} />
                  <div className={styles.info}>
                    <span className={styles.year}>{s.year}</span>
                    <span className={styles.spec}>{s.spec}</span>
                    <span className={styles.count}>{countAt(s.year)} 个</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Status */}
          {timelineYear ? (
            <div className={styles.status}>
              显示 ≤&nbsp;<b>{timelineYear}</b>
              &nbsp;·&nbsp;{countAt(timelineYear)}&nbsp;/&nbsp;{nodes.length}
            </div>
          ) : (
            <div className={styles.status}>显示全部 {nodes.length} 个概念</div>
          )}
        </>
      )}
    </div>
  )
}

export default Timeline
