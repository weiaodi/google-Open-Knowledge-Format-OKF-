import React from 'react'
import { useGraphStore } from '@/store/graphStore'
import { EDGE_TYPE_COLOR, EDGE_TYPE_LABEL, TYPE_BADGE } from '@/data/js_syntax'
import styles from './DocPage.module.css'

const DocPage: React.FC = () => {
  const { docNodeId, nodes, connectedLinks, backToGraph, openDoc, selectNode } = useGraphStore()
  const node = nodes.find(n => n.id === docNodeId)

  if (!node) return null

  const badge = TYPE_BADGE[node.type]
  const cLinks = connectedLinks(node.id)

  return (
    <div className={styles.page}>
      <div className={styles.body}>
        {/* Badge + title */}
        <div className={styles.meta}>
          <span className={styles.badge} style={{ background: badge.bg, color: badge.fg }}>
            {node.type}
          </span>
          <span className={styles.metaText}>
            📖 {(node.reads / 1000).toFixed(1)}k 次阅读 · 🔗 被引用 {node.inDegree ?? 0} 次
          </span>
        </div>

        <h1 className={styles.title}>{node.label}</h1>
        <p className={styles.lead}>{node.description}</p>

        {/* Tags */}
        <div className={styles.tags}>
          {node.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
        </div>

        {/* Code */}
        <section className={styles.section}>
          <h3>代码示例</h3>
          <pre className={styles.codeBlock}>
            <code dangerouslySetInnerHTML={{ __html: node.code }} />
          </pre>
        </section>

        {/* Key points */}
        <section className={styles.section}>
          <h3>核心要点</h3>
          <ul className={styles.keyPoints}>
            {node.keyPoints.map((p, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: p }} />
            ))}
          </ul>
        </section>

        {/* Cause-and-effect relationships */}
        {cLinks.length > 0 && (
          <section className={styles.section}>
            <h3>因果关系</h3>
            <p className={styles.sectionNote}>
              该文档与其他概念之间的有向关系，点击节点名可在图谱中高亮。
            </p>
            <div className={styles.relList}>
              {cLinks.map((l, i) => {
                const isOut = l.source === node.id
                const otherId = isOut ? l.target : l.source
                const other = nodes.find(n => n.id === otherId)
                return (
                  <div key={i} className={styles.relItem}>
                    <span className={styles.relDir}>{isOut ? '→ 影响' : '← 依赖'}</span>
                    <span
                      className={styles.relNode}
                      onClick={() => { backToGraph(); setTimeout(() => selectNode(otherId), 100) }}
                    >
                      {other?.label}
                    </span>
                    <span
                      className={styles.relType}
                      style={{ color: EDGE_TYPE_COLOR[l.type], borderColor: EDGE_TYPE_COLOR[l.type] }}
                    >
                      {EDGE_TYPE_LABEL[l.type]}
                    </span>
                    <p className={styles.relDesc}>{l.description}</p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Related concepts */}
        <section className={styles.section}>
          <h3>相关概念</h3>
          {node.related.map(r => (
            <div key={r.id} className={styles.refItem}>
              <span
                className={styles.refLabel}
                onClick={() => openDoc(r.id)}
              >
                · {r.label}
              </span>
              <span className={styles.refSep}>—</span>
              <span className={styles.refDesc}>{r.desc}</span>
              <span
                className={styles.refLink}
                onClick={() => openDoc(r.id)}
              >
                文档 ›
              </span>
            </div>
          ))}
        </section>

        {/* Citations */}
        {node.citations.length > 0 && (
          <section className={styles.section}>
            <h3>引用来源</h3>
            {node.citations.map(c => (
              <a key={c.url} href={c.url} target="_blank" rel="noreferrer" className={styles.citation}>
                · {c.label}
              </a>
            ))}
          </section>
        )}

        {/* Back */}
        <button className={styles.backBtn} onClick={backToGraph}>
          ← 返回知识图谱
        </button>
      </div>
    </div>
  )
}

export default DocPage
