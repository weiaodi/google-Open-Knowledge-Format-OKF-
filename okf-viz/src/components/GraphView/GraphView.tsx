import React, { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { useGraphStore } from '@/store/graphStore'
import { KGNode, KGLink, EDGE_TYPE_COLOR, EDGE_TYPE_LABEL } from '@/data/js_syntax'
import styles from './GraphView.module.css'

// ─── Node sizing helpers ──────────────────────────────────────────────────────
const BASE_H = 22
const MAX_H  = 36

function nodeHalfH(n: KGNode, maxIn: number): number {
  if (maxIn === 0) return BASE_H
  return BASE_H + ((n.inDegree ?? 0) / maxIn) * (MAX_H - BASE_H)
}
function nodeHalfW(n: KGNode, maxIn: number): number {
  const labelW = n.label.length * 7 + 20
  const scaleW = nodeHalfH(n, maxIn) * 2.2
  return Math.max(labelW, scaleW) / 2
}

// ─── Glow helpers ────────────────────────────────────────────────────────────
function glowSigma(n: KGNode, maxReads: number)  { return 1.5 + (n.reads / maxReads) * 5 }
function glowOpacity(n: KGNode, maxReads: number) { return 0.20 + (n.reads / maxReads) * 0.38 }
function pulseAmpl(n: KGNode, maxReads: number)   { return 3 + (n.reads / maxReads) * 7 }

// ─── D3 simulation node/link types ───────────────────────────────────────────
interface SimNode extends KGNode { x: number; y: number; fx: number | null; fy: number | null }
// SimLink: source/target are SimNode objects after D3 resolves IDs
interface SimLink {
  source: SimNode
  target: SimNode
  type: KGLink['type']
  description: string
}

// ─── Component ───────────────────────────────────────────────────────────────
const GraphCanvas: React.FC = () => {
  const svgRef    = useRef<SVGSVGElement>(null)
  const simRef    = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const {
    visibleNodes, visibleLinks, selectedNodeId, connectedIds, connectedLinks,
    selectNode, openDoc, nodes: allNodes, links: allLinks,
    filterTypes, toggleFilter,
  } = useGraphStore()

  // ── Bootstrap D3 (runs once) ─────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const svg    = d3.select(svgRef.current)
    const W = canvas.clientWidth
    const H = canvas.clientHeight

    svg.attr('width', W).attr('height', H)

    const maxIn    = Math.max(...allNodes.map(n => n.inDegree ?? 0), 1)
    const maxReads = Math.max(...allNodes.map(n => n.reads), 1)

    // ── Defs ──────────────────────────────────────────────────────────────
    const defs = svg.append('defs')

    // Arrowhead (default, grey)
    defs.append('marker')
      .attr('id', 'arr').attr('viewBox', '0 -4 8 8')
      .attr('refX', 4).attr('refY', 0)
      .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#d1d5db')

    // Per-edge-type arrowheads (coloured, shown on selection)
    const edgeTypes = ['depends-on', 'syntactic-sugar', 'used-with', 'param-pattern', 'enables'] as const
    edgeTypes.forEach(et => {
      defs.append('marker')
        .attr('id', `arr-${et}`).attr('viewBox', '0 -4 8 8')
        .attr('refX', 4).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', EDGE_TYPE_COLOR[et])
    })

    // Per-node glow filters
    allNodes.forEach(n => {
      const sigma   = glowSigma(n, maxReads)
      const spread  = Math.ceil(sigma * 2.5)
      const f = defs.append('filter')
        .attr('id', `glow-${n.id}`)
        .attr('x', `-${spread}%`).attr('y', `-${spread}%`)
        .attr('width', `${100 + spread * 2}%`).attr('height', `${100 + spread * 2}%`)
      f.append('feGaussianBlur').attr('stdDeviation', sigma).attr('result', 'blur')
      f.append('feFlood').attr('flood-color', n.color).attr('flood-opacity', glowOpacity(n, maxReads)).attr('result', 'color')
      f.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow')
      const fm = f.append('feMerge')
      fm.append('feMergeNode').attr('in', 'glow')
      fm.append('feMergeNode').attr('in', 'SourceGraphic')
    })

    // Selected glow
    const fs = defs.append('filter').attr('id', 'glow-sel')
      .attr('x', '-25%').attr('y', '-25%').attr('width', '150%').attr('height', '150%')
    fs.append('feGaussianBlur').attr('stdDeviation', 5).attr('result', 'blur')
    fs.append('feFlood').attr('flood-color', '#1456f0').attr('flood-opacity', .5).attr('result', 'color')
    fs.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow')
    const fsm = fs.append('feMerge')
    fsm.append('feMergeNode').attr('in', 'glow')
    fsm.append('feMergeNode').attr('in', 'SourceGraphic')

    // ── Simulation ────────────────────────────────────────────────────────
    const simNodes = allNodes.map(n => ({ ...n, x: W/2, y: H/2, fx: null, fy: null })) as SimNode[]
    const simLinks = allLinks.map(l => ({ ...l })) as unknown as SimLink[]

    const sim = d3.forceSimulation<SimNode>(simNodes)
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks).id(d => d.id).distance(180).strength(.45))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide<SimNode>(n => nodeHalfW(n, maxIn) + pulseAmpl(n, maxReads) + 14))

    simRef.current = sim as unknown as d3.Simulation<SimNode, SimLink>

    // ── Zoom ──────────────────────────────────────────────────────────────
    const g = svg.append('g').attr('class', 'zoom-group')
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([.2, 3])
      .on('zoom', e => g.attr('transform', e.transform))
    svg.call(zoom)
    svg.on('click.deselect', () => selectNode(null))

    // ── Link layer ────────────────────────────────────────────────────────
    const linkG = g.append('g').attr('class', 'links')

    const linkGrp = linkG.selectAll<SVGGElement, SimLink>('g.link')
      .data(simLinks).enter().append('g').attr('class', 'link')

    // Line
    linkGrp.append('line')
      .attr('class', 'link-line')
      .attr('stroke', '#d1d5db').attr('stroke-width', 1.4)
      .attr('marker-end', 'url(#arr)').attr('opacity', .6)

    // Label (hidden by default)
    linkGrp.append('text')
      .attr('class', 'link-label')
      .attr('font-size', 10).attr('fill', '#9ca3af')
      .attr('text-anchor', 'middle').attr('opacity', 0)
      .text(l => EDGE_TYPE_LABEL[l.type])

    // ── Node layer ────────────────────────────────────────────────────────
    const nodeG = g.append('g').attr('class', 'nodes')

    const nodeGrp = nodeG.selectAll<SVGGElement, SimNode>('g.node')
      .data(simNodes).enter().append('g').attr('class', 'node')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, SimNode>()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('click', (e, d) => { e.stopPropagation(); selectNode(d.id) })
      .on('dblclick', (e, d) => { e.stopPropagation(); openDoc(d.id) })

    // Pulse ring
    nodeGrp.append('rect')
      .attr('class', 'pulse-ring')
      .attr('rx', 12).attr('ry', 12)
      .attr('width',  n => nodeHalfW(n, maxIn) * 2 + pulseAmpl(n, maxReads) * 2)
      .attr('height', n => nodeHalfH(n, maxIn) * 2 + pulseAmpl(n, maxReads) * 2)
      .attr('x', n => -nodeHalfW(n, maxIn) - pulseAmpl(n, maxReads))
      .attr('y', n => -nodeHalfH(n, maxIn) - pulseAmpl(n, maxReads))
      .attr('fill', 'none')
      .attr('stroke', n => n.color)
      .attr('stroke-width', n => .8 + (n.reads / maxReads) * 1.5)
      .attr('opacity', n => .18 + (n.reads / maxReads) * .25)
      .style('animation', 'pulse-rect 2.4s ease-in-out infinite')

    // Card background
    nodeGrp.append('rect')
      .attr('class', 'node-card')
      .attr('rx', 8).attr('ry', 8)
      .attr('width',  n => nodeHalfW(n, maxIn) * 2)
      .attr('height', n => nodeHalfH(n, maxIn) * 2)
      .attr('x', n => -nodeHalfW(n, maxIn))
      .attr('y', n => -nodeHalfH(n, maxIn))
      .attr('fill', '#fff')
      .attr('stroke', n => n.color)
      .attr('stroke-width', n => 1.5 + (n.inDegree ?? 0) * .4)
      .attr('filter', n => `url(#glow-${n.id})`)

    // Type label
    nodeGrp.append('text')
      .attr('class', 'node-type')
      .attr('text-anchor', 'middle')
      .attr('y', n => -nodeHalfH(n, maxIn) / 2 + 4)
      .attr('font-size', 9)
      .attr('fill', n => n.color)
      .attr('font-weight', '600')
      .attr('opacity', .75)
      .text(n => n.type)

    // Main label
    nodeGrp.append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', n => 11 + (n.inDegree ?? 0) * 1.0)
      .attr('font-weight', '700').attr('fill', '#1f2329')
      .text(n => n.label)

    // Read count
    nodeGrp.append('text')
      .attr('class', 'node-reads')
      .attr('text-anchor', 'middle')
      .attr('y', n => nodeHalfH(n, maxIn) - 9)
      .attr('font-size', 9).attr('fill', '#9ca3af')
      .text(n => `📖 ${(n.reads / 1000).toFixed(1)}k`)

    // ── Tick ──────────────────────────────────────────────────────────────
    sim.on('tick', () => {
      linkGrp.select<SVGLineElement>('.link-line')
        .attr('x1', l => l.source.x).attr('y1', l => l.source.y)
        .attr('x2', l => l.target.x).attr('y2', l => l.target.y)
      linkGrp.select<SVGTextElement>('.link-label')
        .attr('x', l => (l.source.x + l.target.x) / 2)
        .attr('y', l => (l.source.y + l.target.y) / 2 - 6)
      nodeGrp.attr('transform', n => `translate(${n.x},${n.y})`)

      // visibility
      const vn = new Set(visibleNodes().map(n => n.id))
      const vl = new Set(visibleLinks().map(l => `${l.source}->${l.target}`))
      nodeGrp.attr('display', n => vn.has(n.id) ? null : 'none')
      linkGrp.attr('display', l => vl.has(`${l.source.id}->${l.target.id}`) ? null : 'none')
    })

    // ── Selection highlighting (driven by store) ──────────────────────────
    // This effect is reactive — see the selection useEffect below
    // Store a reference map for the selection updater
    ;(svgRef.current as unknown as Record<string, unknown>)['__d3meta'] = {
      linkGrp, nodeGrp, simNodes, simLinks, zoom, svg, maxIn,
    }

    // resize
    const ro = new ResizeObserver(() => {
      const nw = canvas.clientWidth
      const nh = canvas.clientHeight
      svg.attr('width', nw).attr('height', nh)
      sim.force('center', d3.forceCenter(nw / 2, nh / 2)).restart()
    })
    ro.observe(canvas)

    return () => {
      sim.stop()
      ro.disconnect()
      svg.selectAll('*').remove()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])  // intentionally run once

  // ── React to selectedNodeId changes ──────────────────────────────────────
  useEffect(() => {
    const meta = (svgRef.current as unknown as Record<string, unknown>)?.['__d3meta'] as {
      linkGrp: d3.Selection<SVGGElement, SimLink, SVGGElement, unknown>
      nodeGrp: d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>
      maxIn: number
    } | undefined

    if (!meta) return
    const { linkGrp, nodeGrp } = meta

    if (!selectedNodeId) {
      // Clear highlight
      nodeGrp.selectAll<SVGRectElement, SimNode>('.node-card')
        .attr('opacity', 1).attr('filter', n => `url(#glow-${n.id})`)
      linkGrp.select<SVGLineElement>('.link-line')
        .attr('opacity', .6).attr('stroke', '#d1d5db').attr('marker-end', 'url(#arr)')
      linkGrp.select<SVGTextElement>('.link-label')
        .attr('opacity', 0)
      return
    }

    const conn  = connectedIds(selectedNodeId)
    const cLinks = connectedLinks(selectedNodeId)
    const cLinkSet = new Set(cLinks.map(l => `${l.source}->${l.target}`))

    // Dim/highlight nodes
    nodeGrp.selectAll<SVGRectElement, SimNode>('.node-card')
      .attr('opacity', n => conn.has(n.id) ? 1 : .2)
      .attr('filter', n => n.id === selectedNodeId ? 'url(#glow-sel)' : `url(#glow-${n.id})`)

    // Highlight connected links + show labels + coloured arrows
    linkGrp.select<SVGLineElement>('.link-line')
      .attr('opacity', (l: SimLink) => cLinkSet.has(`${l.source.id}->${l.target.id}`) ? 1 : .08)
      .attr('stroke', (l: SimLink) =>
        cLinkSet.has(`${l.source.id}->${l.target.id}`) ? EDGE_TYPE_COLOR[l.type] : '#d1d5db')
      .attr('stroke-width', (l: SimLink) =>
        cLinkSet.has(`${l.source.id}->${l.target.id}`) ? 2 : 1.4)
      .attr('marker-end', (l: SimLink) =>
        cLinkSet.has(`${l.source.id}->${l.target.id}`) ? `url(#arr-${l.type})` : 'url(#arr)')

    linkGrp.select<SVGTextElement>('.link-label')
      .attr('opacity', (l: SimLink) => cLinkSet.has(`${l.source.id}->${l.target.id}`) ? 1 : 0)
      .attr('fill', (l: SimLink) => EDGE_TYPE_COLOR[l.type])

  }, [selectedNodeId, connectedIds, connectedLinks])

  // ── React to filterTypes ─────────────────────────────────────────────────
  useEffect(() => {
    const meta = (svgRef.current as unknown as Record<string, unknown>)?.['__d3meta'] as {
      nodeGrp: d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>
      linkGrp: d3.Selection<SVGGElement, SimLink, SVGGElement, unknown>
    } | undefined

    if (!meta) return
    const { nodeGrp, linkGrp } = meta

    const vn = new Set(visibleNodes().map(n => n.id))
    nodeGrp.attr('display', (n: SimNode) => vn.has(n.id) ? null : 'none')
    linkGrp.attr('display', (l: SimLink) =>
      vn.has(l.source.id) && vn.has(l.target.id) ? null : 'none')
  }, [filterTypes, visibleNodes, visibleLinks])

  const resetLayout = useCallback(() => {
    simRef.current?.alpha(.8).restart()
  }, [])

  const typeKeys = ['JS Syntax', 'JS Builtin', 'JS Pattern'] as const
  const filterColorMap: Record<string, string> = {
    'JS Syntax':  '#1456f0',
    'JS Builtin': '#0d8050',
    'JS Pattern': '#c75000',
  }

  return (
    <div className={styles.graphView}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.title}>🕸 JS 知识图谱</span>
        <span className={styles.badge}>
          OKF · js_syntax · {visibleNodes().length} nodes
        </span>

        {/* Type filters */}
        <div className={styles.filters}>
          {typeKeys.map(t => (
            <button
              key={t}
              className={`${styles.filterBtn} ${filterTypes[t] ? styles.filterOn : ''}`}
              style={filterTypes[t] ? { background: filterColorMap[t] } : {}}
              onClick={() => toggleFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Graph search */}
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            type="text" placeholder="搜索节点…"
            onChange={e => {
              const q = e.target.value.trim().toLowerCase()
              if (!q) { selectNode(null); return }
              const m = allNodes.find(n =>
                n.label.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q))
              )
              if (m) selectNode(m.id)
            }}
          />
        </div>

        <button className={styles.toolBtn} onClick={resetLayout}>重置</button>
      </div>

      {/* Canvas */}
      <div className={styles.canvasWrap} ref={canvasRef} onClick={() => selectNode(null)}>
        <svg ref={svgRef} />

        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#3d9fde' }} />JS Syntax
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#52c41a' }} />JS Builtin
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: '#fa8c16' }} />JS Pattern
          </div>
          <div className={styles.legendDivider} />
          <div className={styles.legendItem} style={{ color: '#8a9099' }}>
            节点大小 = 被引用次数
          </div>
          <div className={styles.legendItem} style={{ color: '#8a9099' }}>
            光晕强度 = 阅读次数
          </div>
          <div className={styles.legendItem} style={{ color: '#8a9099' }}>
            双击节点查看文档
          </div>
        </div>

        {/* Stat */}
        <div className={styles.stat}>
          {visibleNodes().length} 节点 · {visibleLinks().length} 关系
        </div>

        {/* Edge type hint (shown when a node is selected) */}
        {selectedNodeId && (
          <div className={styles.edgeHint}>
            {connectedLinks(selectedNodeId).map((l, i) => (
              <div key={i} className={styles.edgeHintItem}>
                <span
                  className={styles.edgeHintDot}
                  style={{ background: EDGE_TYPE_COLOR[l.type] }}
                />
                <span className={styles.edgeHintType}>{EDGE_TYPE_LABEL[l.type]}</span>
                <span className={styles.edgeHintDesc}>{l.description.slice(0, 40)}…</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default GraphCanvas
