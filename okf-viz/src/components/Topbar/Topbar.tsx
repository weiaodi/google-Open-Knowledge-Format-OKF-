import React from 'react'
import { useGraphStore } from '@/store/graphStore'
import styles from './Topbar.module.css'

const Topbar: React.FC = () => {
  const { activeView, docNodeId, nodes, backToGraph } = useGraphStore()
  const docNode = nodes.find(n => n.id === docNodeId)

  return (
    <header className={styles.topbar}>
      {/* Back link */}
      <a className={styles.back} href="#">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        魏奥迪的知识库
      </a>

      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <span>创新业务探索</span>
        <span className={styles.sep}>›</span>
        <span>CodeGraph</span>
        <span className={styles.sep}>›</span>
        {activeView === 'doc' && docNode ? (
          <>
            <span className={styles.bcLink} onClick={backToGraph}>JS 知识图谱</span>
            <span className={styles.sep}>›</span>
            <span className={styles.current}>{docNode.label}</span>
          </>
        ) : (
          <span className={styles.current}>JS 知识图谱</span>
        )}
        <span className={styles.tag}>
          {activeView === 'doc' && docNode ? docNode.type : 'Graph View'}
        </span>
      </nav>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={`${styles.btn} ${styles.outline}`}>所有者</button>
        <button className={`${styles.btn} ${styles.outline}`}>分享</button>
        <button className={`${styles.btn} ${styles.primary}`}>完成</button>
      </div>
    </header>
  )
}

export default Topbar
