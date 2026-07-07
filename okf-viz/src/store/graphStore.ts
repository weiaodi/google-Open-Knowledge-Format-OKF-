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
  docNodeId:  string | null   // which node's doc page to show

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
    const { nodes, filterTypes } = get()
    return nodes.filter(n => filterTypes[n.type])
  },

  visibleLinks: () => {
    const { links, visibleNodes } = get()
    const visSet = new Set(visibleNodes().map(n => n.id))
    return links.filter(l => visSet.has(l.source) && visSet.has(l.target))
  },

  /** IDs of the selected node + its direct neighbours */
  connectedIds: (id) => {
    const { links } = get()
    const ids = new Set([id])
    links.forEach(l => {
      if (l.source === id) ids.add(l.target)
      if (l.target === id) ids.add(l.source)
    })
    return ids
  },

  /** Links that touch the given node id */
  connectedLinks: (id) => {
    const { links } = get()
    return links.filter(l => l.source === id || l.target === id)
  },
}))
