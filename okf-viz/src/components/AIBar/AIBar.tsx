import React, { useState, useRef, useCallback } from 'react'
import { useGraphStore } from '@/store/graphStore'
import styles from './AIBar.module.css'

interface PathStep { id: string; label: string; mins: number; isTarget: boolean }
interface Msg {
  role: 'user' | 'ai'
  text?: string
  nodeIds?: string[]
  // Structured path card
  pathCard?: { steps: PathStep[]; totalMins: number; targetLabel: string }
}

// ── Knowledge replies ────────────────────────────────────────────────────────
const KNOWLEDGE_REPLIES: Record<string, { text: string; highlight: string[] }> = {
  '异步': {
    text: '**异步编程**是 JS 最核心的能力。底层是 **Promise** 状态机，上层是 **async/await** 语法糖，**Event Loop** 决定执行时机。',
    highlight: ['promise', 'async_await', 'async_fn_node', 'event_loop'],
  },
  'Promise': {
    text: '**Promise** 是 JS 异步的核心对象，**async/await** 是它的语法糖。`.then()` 回调进入微任务队列，由 **Event Loop** 立即调度。',
    highlight: ['promise', 'async_await', 'event_loop'],
  },
  '闭包': {
    text: '**Closure** 是函数与词法环境的组合。**Arrow Functions** 的词法 this 正是闭包机制的体现，**let/const** 使循环闭包行为可预测。',
    highlight: ['closure', 'arrow_function', 'let_const'],
  },
  '基础': {
    text: '从入度看，**Arrow Functions** 和 **Closure** 被引用最多。建议顺序：let/const → Closure → Arrow Functions → Promise → async/await。',
    highlight: ['arrow_function', 'closure', 'promise'],
  },
  '原型': {
    text: '**Prototype Chain** 是 JS 继承的底层机制，class extends 只是语法糖。**Arrow Functions** 没有 prototype，这是原型链的边界体现。',
    highlight: ['prototype', 'arrow_function'],
  },
  'Event Loop': {
    text: '**Event Loop** 是 JS 单线程调度核心。顺序：同步 → 微任务（**Promise**.then）→ 宏任务（setTimeout）。理解它是掌握所有异步行为的前提。',
    highlight: ['event_loop', 'promise', 'async_await'],
  },
}

// ── Learning path skill ──────────────────────────────────────────────────────
function buildPath(
  targetId: string,
  allNodes: ReturnType<typeof useGraphStore.getState>['nodes'],
  allLinks: ReturnType<typeof useGraphStore.getState>['links']
): string[] {
  const prereqs: Record<string, string[]> = {}
  allNodes.forEach(n => { prereqs[n.id] = [] })
  allLinks.forEach(l => {
    if (l.type === 'depends-on' || l.type === 'syntactic-sugar') {
      prereqs[l.source].push(l.target)
    }
  })
  const visited = new Set<string>()
  const order: string[] = []
  function dfs(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    prereqs[id]?.forEach(dfs)
    order.push(id)
  }
  dfs(targetId)
  return order
}

function getReply(q: string, selectedNodeId: string | null): Msg {
  // Learning path skill
  if (/学习路径|怎么学|如何学|前置|规划/.test(q) && selectedNodeId) {
    const { nodes, links } = useGraphStore.getState()
    const target = nodes.find(n => n.id === selectedNodeId)
    if (target) {
      const path = buildPath(selectedNodeId, nodes, links)
      const steps: PathStep[] = path.map(id => {
        const n = nodes.find(x => x.id === id)!
        return { id, label: n.label, mins: n.learnMins, isTarget: id === selectedNodeId }
      })
      const totalMins = steps.reduce((s, x) => s + x.mins, 0)
      return {
        role: 'ai',
        nodeIds: path,
        pathCard: { steps, totalMins, targetLabel: target.label },
      }
    }
  }

  // Knowledge skill
  const key = Object.keys(KNOWLEDGE_REPLIES).find(k => q.includes(k))
  if (key) return { role: 'ai', ...KNOWLEDGE_REPLIES[key] }

  return {
    role: 'ai',
    text: `图谱中共有 ${useGraphStore.getState().nodes.length} 个核心概念。点击某个节点后，可问「怎么学」获取专属学习路径。`,
    nodeIds: [],
  }
}

// ── Component ────────────────────────────────────────────────────────────────
const AIBar: React.FC = () => {
  const { selectNode, selectedNodeId, nodes, setLearningTarget } = useGraphStore()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const selectedNode = nodes.find(n => n.id === selectedNodeId)
  const CHIPS = selectedNode
    ? [
        { label: `怎么学「${selectedNode.label}」？`, q: `学习路径` },
        { label: `${selectedNode.label} 的原理？`,    q: `${selectedNode.label} 基础` },
        { label: 'Event Loop 是什么？',               q: 'Event Loop' },
      ]
    : [
        { label: '异步编程入门', q: '异步编程' },
        { label: 'Promise vs async', q: 'Promise' },
        { label: '闭包的本质', q: '闭包' },
        { label: '从哪个概念开始学？', q: '基础' },
      ]

  const send = useCallback((q: string) => {
    if (!q.trim() || loading) return
    setMsgs(m => [...m, { role: 'user', text: q }])
    setInput('')
    setLoading(true)

    setTimeout(() => {
      const reply = getReply(q, selectedNodeId)
      setMsgs(m => [...m, reply])
      setLoading(false)
      if (reply.nodeIds?.length) selectNode(reply.nodeIds[0])
      if (reply.pathCard) {
        const last = reply.pathCard.steps[reply.pathCard.steps.length - 1]
        setLearningTarget(last?.id ?? null)
      }
    }, 700)
  }, [loading, selectNode, selectedNodeId, setLearningTarget])

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const renderText = (text: string, nodeIds?: string[]) =>
    text.split(/(\*\*[^*]+\*\*)/).map((p, i) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        const label = p.slice(2, -2)
        const nid = nodeIds?.find(id => nodes.find(n => n.id === id && n.label === label))
        return nid
          ? <span key={i} className={styles.aiLink} onClick={() => selectNode(nid)}>{label}</span>
          : <strong key={i}>{label}</strong>
      }
      return <span key={i}>{p}</span>
    })

  // Render path card — nodes as chips, time at bottom
  const renderPathCard = (card: NonNullable<Msg['pathCard']>) => {
    const hrs = Math.floor(card.totalMins / 60)
    const mins = card.totalMins % 60
    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} 分钟`

    return (
      <div className={styles.pathCard}>
        <div className={styles.pathNodeRow}>
          {card.steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <button
                className={`${styles.pathNodeChip} ${s.isTarget ? styles.pathNodeChipFinal : ''}`}
                onClick={() => selectNode(s.id)}
                title={`${s.mins} 分钟`}
              >
                {s.label}
              </button>
              {i < card.steps.length - 1 && (
                <span className={styles.pathArrow}>→</span>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className={styles.pathCardFooter}>
          <span>共 {card.steps.length} 个概念</span>
          <span className={styles.pathTotalTime}>⏱ {timeStr}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.aiBar}>
      {(msgs.length > 0 || loading) && (
        <div className={styles.replies}>
          {msgs.map((m, i) => (
            m.role === 'user'
              ? <div key={i} className={styles.userMsg}>{m.text}</div>
              : (
                <div key={i} className={styles.aiMsg}>
                  <span className={styles.aiIcon}>✦</span>
                  <div className={styles.aiText}>
                    {m.pathCard
                      ? renderPathCard(m.pathCard)
                      : m.text && renderText(m.text, m.nodeIds)
                    }
                  </div>
                </div>
              )
          ))}
          {loading && (
            <div className={styles.aiMsg}>
              <span className={styles.aiIcon}>✦</span>
              <div className={styles.thinking}>规划中…</div>
            </div>
          )}
        </div>
      )}

      {msgs.length === 0 && (
        <div className={styles.chips}>
          {CHIPS.map(c => (
            <button key={c.label} className={styles.chip} onClick={() => send(c.q)}>
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.inputRow}>
        {selectedNode && msgs.length === 0 && (
          <span className={styles.context}>@{selectedNode.label}</span>
        )}
        <textarea
          ref={taRef}
          className={styles.input}
          rows={1}
          placeholder={selectedNode ? `问关于「${selectedNode.label}」的问题…` : '问 AI 一个知识图谱问题…'}
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
