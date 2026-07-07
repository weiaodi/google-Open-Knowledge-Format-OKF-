import React, { useState } from 'react'
import { useGraphStore } from '@/store/graphStore'
import styles from './LearningPath.module.css'

const LearningPath: React.FC = () => {
  const { nodes, learningPath, learningTarget, setLearningTarget, selectNode } = useGraphStore()
  const [open, setOpen] = useState(false)

  const totalMins = learningPath.reduce((sum, id) => {
    const n = nodes.find(x => x.id === id)
    return sum + (n?.learnMins ?? 0)
  }, 0)

  return (
    <div className={`${styles.wrap} ${open ? styles.expanded : ''}`}>
      {/* Toggle button */}
      <button
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        title="学习路径生成器"
      >
        🗺 学习路径
        {learningPath.length > 0 && (
          <span className={styles.badge}>{learningPath.length}</span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.title}>学习路径生成器</span>
            <button className={styles.close} onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Target picker */}
          <div className={styles.pickerLabel}>选择目标概念：</div>
          <div className={styles.picker}>
            {nodes.map(n => (
              <button
                key={n.id}
                className={`${styles.pickBtn} ${learningTarget === n.id ? styles.pickBtnOn : ''}`}
                style={learningTarget === n.id ? { borderColor: n.color, color: n.color } : {}}
                onClick={() => setLearningTarget(learningTarget === n.id ? null : n.id)}
              >
                {n.label}
              </button>
            ))}
          </div>

          {/* Path display */}
          {learningPath.length > 0 && (
            <>
              <div className={styles.pathHeader}>
                <span>推荐学习顺序</span>
                <span className={styles.totalTime}>⏱ 共约 {totalMins} 分钟</span>
              </div>
              <div className={styles.path}>
                {learningPath.map((id, i) => {
                  const n = nodes.find(x => x.id === id)
                  if (!n) return null
                  const isTarget = id === learningTarget
                  return (
                    <React.Fragment key={id}>
                      <div
                        className={`${styles.step} ${isTarget ? styles.stepTarget : ''}`}
                        onClick={() => { selectNode(id); setOpen(false) }}
                        style={isTarget ? { borderColor: n.color } : {}}
                      >
                        <span className={styles.stepNum}>{i + 1}</span>
                        <div className={styles.stepInfo}>
                          <span className={styles.stepLabel}>{n.label}</span>
                          <span className={styles.stepMeta}>
                            {n.type} · {n.learnMins} 分钟
                            {isTarget && <span className={styles.goalTag}>目标</span>}
                          </span>
                        </div>
                        <span
                          className={styles.stepDot}
                          style={{ background: n.color }}
                        />
                      </div>
                      {i < learningPath.length - 1 && (
                        <div className={styles.connector}>↓</div>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>

              <button
                className={styles.highlight}
                onClick={() => {
                  // Highlight first non-target node
                  const first = learningPath[0]
                  if (first) selectNode(first)
                  setOpen(false)
                }}
              >
                📍 在图谱中高亮路径
              </button>
            </>
          )}

          {learningPath.length === 0 && (
            <div className={styles.empty}>
              选择一个目标概念，AI 将自动规划从基础到目标的学习路径
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LearningPath
