import React from 'react'
import { useGraphStore } from '@/store/graphStore'
import { TYPE_COLOR } from '@/data/js_syntax'
import styles from './Sidebar.module.css'

const Sidebar: React.FC = () => {
  const { nodes, activeView, docNodeId, openDoc, backToGraph } = useGraphStore()
  const isGraphActive = activeView === 'graph'

  return (
    <aside className={styles.sidebar}>
      <div className={styles.search}>
        <span className={styles.searchIcon}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
        <input type="text" placeholder="搜索文档…" />
      </div>

      <div className={styles.inner}>
        <div className={styles.item}><span>🏠</span>首页</div>
        <div className={styles.item}><span>📋</span>目录</div>

        <div className={styles.divider} />
        <div className={styles.sectionLabel}>文档</div>

        <div className={styles.item}><span>📄</span>周报</div>
        <div className={styles.item}><span>📁</span>归档</div>
        <div className={styles.item}><span>🤖</span>AI 相关</div>

        <div className={styles.divider} />
        <div className={styles.sectionLabel}>知识图谱</div>

        {/* KG parent */}
        <div
          className={`${styles.item} ${styles.kgParent} ${isGraphActive ? styles.active : ''}`}
          onClick={backToGraph}
        >
          <span>🕸</span>
          <span>JS 知识图谱</span>
          <span className={`${styles.chev} ${styles.open}`}>›</span>
        </div>

        {/* KG children */}
        <div className={styles.children}>
          {nodes.map(n => (
            <div
              key={n.id}
              className={`${styles.item} ${styles.childItem} ${docNodeId === n.id ? styles.active : ''}`}
              onClick={() => openDoc(n.id)}
            >
              <span className={styles.dot} style={{ background: TYPE_COLOR[n.type] }} />
              <span>{n.label}</span>
            </div>
          ))}
        </div>

        <div className={styles.divider} />
        <div className={styles.item}><span>📝</span>todos</div>
        <div className={styles.item}><span>🔬</span>demo</div>
      </div>

      <footer className={styles.footer}>
        <a>分享知识库</a>
        <a>⚙ 设置</a>
      </footer>
    </aside>
  )
}

export default Sidebar
