import { create } from 'zustand'
import { KGNode, KGLink, NodeType, computeInDegree } from '@/data/js_syntax'
import { NODES as RAW_NODES, LINKS } from '@/data/js_syntax'

export type ActiveView = 'graph' | 'doc'

interface GraphState {
  // ── Data ──────────────────────────────────────────────────────
  nodes: KGNode[]
  links: KGLink[]

  // ── Selection ─────────────────────────────────────────────────
  selectedNodeId: string | null
  hoveredNodeId:  string | null

  // ── Filter ────────────────────────────────────────────────────
  filterTypes: Record<NodeType, boolean>

  // ── View ──────────────────────────────────────────────────────
  activeView: ActiveView
  docNodeId:  string | null

  // ── Timeline snapshot ─────────────────────────────────────────
  timelineYear: number | null   // null = show all
  setTimelineYear: (year: number | null) => void

  // ── Gravity field ─────────────────────────────────────────────
  gravityEnabled: boolean
  toggleGravity: () => void

  // ── Learning path ─────────────────────────────────────────────
  learningPath: string[]         // ordered node ids
  learningTarget: string | null
  setLearningTarget: (id: string | null) => void
  buildLearningPath: (targetId: string) => void

  // ── Actions ───────────────────────────────────────────────────
  selectNode:   (id: string | null) => void
  hoverNode:    (id: string | null) => void
  toggleFilter: (type: NodeType) => void
  openDoc:      (id: string) => void
  backToGraph:  () => void

  // ── Derived helpers ───────────────────────────────────────────
  visibleNodes: () => KGNode[]
  visibleLinks: () => KGLink[]
  connectedIds: (id: string) => Set<string>
  connectedLinks:(id: string) => KGLink[]
}

// ── Topological sort helpers ──────────────────────────────────────────────────
/** Build prereq path to reach targetId via depends-on / syntactic-sugar edges */
function buildPath(targetId: string, nodes: KGNode[], links: KGLink[]): string[] {
  // Build reverse adjacency: dependencies of each node
  const deps: Record<string, string[]> = {}
  nodes.forEach(n => { deps[n.id] = [] })
  links.forEach(l => {
    if (l.type === 'depends-on' || l.type === 'syntactic-sugar') {
      deps[l.source] = [...(deps[l.source] || []), l.target]
    }
  })

  // BFS from target following deps
  const visited = new Set<string>()
  const queue = [targetId]
  const order: string[] = []
  while (queue.length) {
    const cur = queue.shift()!
    if (visited.has(cur)) continue
    visited.add(cur)
    order.unshift(cur) // prereqs come first
    ;(deps[cur] || []).forEach(d => { if (!visited.has(d)) queue.push(d) })
  }
  // Ensure target is last
  const filtered = order.filter(id => id !== targetId)
  return [...filtered, targetId]
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: computeInDegree(RAW_NODES, LINKS),
  links: LINKS,

  selectedNodeId: null,
  hoveredNodeId:  null,

  filterTypes: {
    'JS Syntax':  true,
    'JS Builtin': true,
    'JS Pattern': true,
  },

  activeView: 'graph',
  docNodeId:  null,

  // ── Timeline ──────────────────────────────────────────────────
  timelineYear: null,
  setTimelineYear: (year) => set({ timelineYear: year }),

  // ── Gravity ───────────────────────────────────────────────────
  gravityEnabled: true,
  toggleGravity: () => set(s => ({ gravityEnabled: !s.gravityEnabled })),

  // ── Learning path ─────────────────────────────────────────────
  learningPath: [],
  learningTarget: null,
  setLearningTarget: (id) => {
    if (!id) { set({ learningTarget: null, learningPath: [] }); return }
    get().buildLearningPath(id)
  },
  buildLearningPath: (targetId) => {
    const { nodes, links } = get()
    const path = buildPath(targetId, nodes, links)
    set({ learningTarget: targetId, learningPath: path })
  },

  // ── Actions ───────────────────────────────────────────────────
  selectNode: (id) => set({ selectedNodeId: id }),
  hoverNode:  (id) => set({ hoveredNodeId: id }),

  toggleFilter: (type) =>
    set(s => ({
      filterTypes: { ...s.filterTypes, [type]: !s.filterTypes[type] },
    })),

  openDoc: (id) => set({ activeView: 'doc', docNodeId: id }),
  backToGraph: () => set({ activeView: 'graph', docNodeId: null }),

  // ── Derived ───────────────────────────────────────────────────
  visibleNodes: () => {
    const { nodes, filterTypes, timelineYear } = get()
    return nodes.filter(n =>
      filterTypes[n.type] &&
      (timelineYear === null || n.year <= timelineYear)
    )
  },

  visibleLinks: () => {
    const { links, visibleNodes } = get()
    const visSet = new Set(visibleNodes().map(n => n.id))
    return links.filter(l => visSet.has(l.source) && visSet.has(l.target))
  },

  connectedIds: (id) => {
    const { links } = get()
    const ids = new Set([id])
    links.forEach(l => {
      if (l.source === id) ids.add(l.target)
      if (l.target === id) ids.add(l.source)
    })
    return ids
  },

  connectedLinks: (id) => {
    const { links } = get()
    return links.filter(l => l.source === id || l.target === id)
  },
}))
