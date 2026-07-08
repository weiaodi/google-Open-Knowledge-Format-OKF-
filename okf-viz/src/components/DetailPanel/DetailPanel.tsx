import React from 'react'
import { useGraphStore } from '@/store/graphStore'
import { EDGE_TYPE_COLOR, EDGE_TYPE_LABEL, TYPE_BADGE } from '@/data/js_syntax'
import styles from './DetailPanel.module.css'

const DetailPanel: React.FC = () => {
  const { selectedNodeId, nodes, connectedLinks, openDoc, selectNode } = useGraphStore()
  const node = nodes.find(n => n.id === selectedNodeId)
  const badge = node ? TYPE_BADGE[node.type] : null
  const cLinks = selectedNodeId ? connectedLinks(selectedNodeId) : []

  return (
    <aside className={`${styles.panel} ${selectedNodeId ? styles.open : ''}`}>
      {node && badge && (
        <>
          <div className={styles.header}>
            <span className={styles.badge} style={{ background: badge.bg, color: badge.fg }}>
              {node.type}
            </span>
            <button className={styles.close} onClick={() => selectNode(null)}>✕</button>
          </div>

          <h2 className={styles.title}>{node.label}</h2>
          <p className={styles.desc}>{node.description}</p>

          <div className={styles.stats}>
            <span>被引用 <b>{node.inDegree ?? 0}</b> 次</span>
            <span>阅读 <b>{(node.reads / 1000).toFixed(1)}k</b></span>
            <span>⏱ <b>{node.learnMins}</b> 分钟</span>
          </div>

          <div className={styles.tags}>
            {node.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
          </div>

          {cLinks.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionTitle}>节点关系 · {cLinks.length} 条</div>
              {cLinks.map((l, i) => {
                const isOut = l.source === node.id
                const otherNode = nodes.find(n => n.id === (isOut ? l.target : l.source))
                return (
                  <div key={i} className={styles.edgeItem}>
                    <span className={styles.edgeDot} style={{ background: EDGE_TYPE_COLOR[l.type] }} />
                    <div className={styles.edgeInfo}>
                      <div className={styles.edgeMeta}>
                        <span
                          className={styles.edgeType}
                          style={{ color: EDGE_TYPE_COLOR[l.type], borderColor: EDGE_TYPE_COLOR[l.type] }}
                        >
                          {EDGE_TYPE_LABEL[l.type]}
                        </span>
                        <span className={styles.edgeDir}>{isOut ? '→' : '←'}</span>
                        <span className={styles.edgeNode} onClick={() => otherNode && selectNode(otherNode.id)}>
                          {otherNode?.label}
                        </span>
                      </div>
                      <p className={styles.edgeDesc}>{l.description}</p>
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          <section className={styles.section}>
            <div className={styles.sectionTitle}>要点</div>
            <ul className={styles.keyPoints}>
              {node.keyPoints.map((p, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: p }} />
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionTitle}>相关概念</div>
            {node.related.map(r => (
              <div key={r.id} className={styles.relatedItem}>
                <span className={styles.relatedLabel} onClick={() => selectNode(r.id)}>{r.label}</span>
                <span className={styles.relatedSep}>—</span>
                <span className={styles.relatedDesc}>{r.desc}</span>
                <span className={styles.relatedLink} onClick={() => openDoc(r.id)}>文档 ›</span>
              </div>
            ))}
          </section>

          {node.citations.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionTitle}>引用来源</div>
              {node.citations.map(c => (
                <a key={c.url} href={c.url} target="_blank" rel="noreferrer" className={styles.citation}>
                  · {c.label}
                </a>
              ))}
            </section>
          )}

          <button className={styles.viewDoc} onClick={() => openDoc(node.id)}>
            查看完整文档
          </button>
        </>
      )}
    </aside>
  )
}

export default DetailPanel
