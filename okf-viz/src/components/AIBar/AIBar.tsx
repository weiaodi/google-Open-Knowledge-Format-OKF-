import React, { useState, useRef, useCallback } from 'react'
import { useGraphStore } from '@/store/graphStore'
import styles from './AIBar.module.css'

interface Msg { role: 'user' | 'ai'; text: string; nodeIds?: string[] }

const CHIPS = [
  { label: '⚡ 什么是异步编程？', q: '什么是异步编程' },
  { label: '🔗 Promise 和 async 有何关系？', q: 'Promise 和 async 有何关系' },
  { label: '📦 闭包和箭头函数的关联？', q: '闭包和箭头函数的关联' },
  { label: '🔬 最基础的概念是哪个？', q: '最基础的概念是哪个' },
]

const REPLIES: Record<string, { text: string; highlight: string[] }> = {
  '异步': {
    text: '**异步编程**是 JS 最核心的能力。底层是 **Promise** 状态机（resolve/reject），上层是 **async/await** 语法糖。**async function** 负责声明，**async/await** 负责使用。',
    highlight: ['promise', 'async_await', 'async_fn_node'],
  },
  'Promise': {
    text: '**Promise** 是 JS 异步的核心对象，**async/await** 是它的语法糖。`async function` 总是返回 Promise。Promise 的 `.then()` 回调中常用 **Arrow Functions** 来保持词法 this。',
    highlight: ['promise', 'async_await', 'arrow_function'],
  },
  '闭包': {
    text: '**Closure（闭包）** 是函数与词法环境的组合。**Arrow Functions** 的词法 this 正是闭包机制的体现。**let/const** 的块级作用域使循环闭包行为可预测。',
    highlight: ['closure', 'arrow_function', 'let_const'],
  },
  '基础': {
    text: '从入度看，**Arrow Functions**（入度最高）是最多概念依赖的核心节点。**Closure** 和 **Promise** 也是高被引用节点，建议先掌握这三个。',
    highlight: ['arrow_function', 'closure', 'promise'],
  },
}

function getReply(q: string): { text: string; highlight: string[] } {
  const key = Object.keys(REPLIES).find(k => q.includes(k))
  return key ? REPLIES[key] : {
    text: `这是个好问题！知识图谱中共有 7 个核心概念，覆盖 JS 异步、作用域和语法特性。点击图谱中的节点可查看详细的因果关系。`,
    highlight: [],
  }
}

const AIBar: React.FC = () => {
  const { selectNode } = useGraphStore()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const send = useCallback((q: string) => {
    if (!q.trim() || loading) return
    const userMsg: Msg = { role: 'user', text: q }
    setMsgs(m => [...m, userMsg])
    setInput('')
    setLoading(true)

    setTimeout(() => {
      const { text, highlight } = getReply(q)
      setMsgs(m => [...m, { role: 'ai', text, nodeIds: highlight }])
      setLoading(false)
      if (highlight.length) selectNode(highlight[0])
    }, 800)
  }, [loading, selectNode])

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  // Render AI text with **bold** markdown
  const renderAI = (text: string, nodeIds?: string[]) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        const label = p.slice(2, -2)
        const nid = nodeIds?.find(id => {
          const { nodes } = useGraphStore.getState()
          return nodes.find(n => n.id === id && n.label === label)
        })
        return nid
          ? <span key={i} className={styles.aiLink} onClick={() => selectNode(nid)}>{label}</span>
          : <strong key={i}>{label}</strong>
      }
      return <span key={i}>{p}</span>
    })
  }

  return (
    <div className={styles.aiBar}>
      {/* Reply area */}
      {msgs.length > 0 && (
        <div className={styles.replies}>
          {msgs.map((m, i) => (
            m.role === 'user'
              ? <div key={i} className={styles.userMsg}>{m.text}</div>
              : (
                <div key={i} className={styles.aiMsg}>
                  <span className={styles.aiIcon}>🤖</span>
                  <div className={styles.aiText}>{renderAI(m.text, m.nodeIds)}</div>
                </div>
              )
          ))}
          {loading && (
            <div className={styles.aiMsg}>
              <span className={styles.aiIcon}>🤖</span>
              <div className={styles.thinking}>思考中…</div>
            </div>
          )}
        </div>
      )}

      {/* Chips */}
      {msgs.length === 0 && (
        <div className={styles.chips}>
          {CHIPS.map(c => (
            <button key={c.label} className={styles.chip} onClick={() => send(c.q)}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className={styles.inputRow}>
        <textarea
          ref={taRef}
          className={styles.input}
          rows={1}
          placeholder="问 AI 一个知识图谱相关问题…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
        />
        <button
          className={styles.send}
          disabled={!input.trim() || loading}
          onClick={() => send(input)}
        >
          {loading ? '…' : '↑'}
        </button>
      </div>
    </div>
  )
}

export default AIBar
