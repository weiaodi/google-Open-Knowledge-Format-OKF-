import React from 'react'
import GraphCanvas from '@/components/GraphView/GraphView'
import DetailPanel from '@/components/DetailPanel/DetailPanel'
import AIBar from '@/components/AIBar/AIBar'
import styles from './GraphPage.module.css'

const GraphPage: React.FC = () => (
  <div className={styles.page}>
    <div className={styles.main}>
      <GraphCanvas />
      <DetailPanel />
    </div>
    <AIBar />
  </div>
)

export default GraphPage
