import React from 'react'
import { useGraphStore } from '@/store/graphStore'
import Topbar from '@/components/Topbar/Topbar'
import Sidebar from '@/components/Sidebar/Sidebar'
import GraphPage from '@/views/GraphPage'
import DocPage from '@/views/DocPage'
import styles from './App.module.css'

const App: React.FC = () => {
  const { activeView } = useGraphStore()

  return (
    <div className={styles.app}>
      <Topbar />
      <div className={styles.body}>
        <Sidebar />
        {activeView === 'graph' ? <GraphPage /> : <DocPage />}
      </div>
    </div>
  )
}

export default App
