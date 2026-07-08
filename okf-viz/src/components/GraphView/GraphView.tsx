import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useGraphStore } from '@/store/graphStore'
import { KGNode, KGLink, EDGE_TYPE_COLOR } from '@/data/js_syntax'
import Timeline from '@/components/Timeline/Timeline'
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
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const {
    visibleNodes, visibleLinks, selectedNodeId, connectedIds, connectedLinks,
    selectNode, hoverNode, hoveredNodeId, openDoc,
    nodes: allNodes, links: allLinks,
    filterTypes, toggleFilter, timelineYear,
    gravityEnabled,
    learningPath,
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

    defs.append('marker')
      .attr('id', 'arr').attr('viewBox', '0 -4 8 8')
      .attr('refX', 4).attr('refY', 0)
      .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#dde2ea')

    const edgeTypes = ['depends-on', 'syntactic-sugar', 'used-with', 'param-pattern', 'enables'] as const
    edgeTypes.forEach(et => {
      defs.append('marker')
        .attr('id', `arr-${et}`).attr('viewBox', '0 -4 8 8')
        .attr('refX', 4).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', EDGE_TYPE_COLOR[et])
    })

    // Learning path arrow (gold)
    defs.append('marker')
      .attr('id', 'arr-path').attr('viewBox', '0 -4 8 8')
      .attr('refX', 4).attr('refY', 0)
      .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', '#f59e0b')

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

    const fs = defs.append('filter').attr('id', 'glow-sel')
      .attr('x', '-25%').attr('y', '-25%').attr('width', '150%').attr('height', '150%')
    fs.append('feGaussianBlur').attr('stdDeviation', 5).attr('result', 'blur')
    fs.append('feFlood').attr('flood-color', '#1456f0').attr('flood-opacity', .5).attr('result', 'color')
    fs.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow')
    const fsm = fs.append('feMerge')
    fsm.append('feMergeNode').attr('in', 'glow')
    fsm.append('feMergeNode').attr('in', 'SourceGraphic')

    // Path node glow (gold)
    const fp = defs.append('filter').attr('id', 'glow-path')
      .attr('x', '-25%').attr('y', '-25%').attr('width', '150%').attr('height', '150%')
    fp.append('feGaussianBlur').attr('stdDeviation', 6).attr('result', 'blur')
    fp.append('feFlood').attr('flood-color', '#f59e0b').attr('flood-opacity', .6).attr('result', 'color')
    fp.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow')
    const fpm = fp.append('feMerge')
    fpm.append('feMergeNode').attr('in', 'glow')
    fpm.append('feMergeNode').attr('in', 'SourceGraphic')

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
    svg.on('click.deselect', () => { selectNode(null); hoverNode(null) })

    // ── Link layer ────────────────────────────────────────────────────────
    const linkG = g.append('g').attr('class', 'links')
    const linkGrp = linkG.selectAll<SVGGElement, SimLink>('g.link')
      .data(simLinks).enter().append('g').attr('class', 'link')

    linkGrp.append('line')
      .attr('class', 'link-line')
      .attr('stroke', '#dde2ea').attr('stroke-width', 1.4)
      .attr('marker-end', 'none').attr('opacity', .5)


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
      .on('mouseover', (_e, d) => { hoverNode(d.id) })
      .on('mouseout',  () => { hoverNode(null) })

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
      .attr('font-size', 9).attr('fill', n => n.color).attr('font-weight', '600').attr('opacity', .75)
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
      .attr('font-size', 9).attr('fill', '#8f959e')
      .text(n => `📖 ${(n.reads / 1000).toFixed(1)}k`)

    // Year badge (shown in timeline mode)
    nodeGrp.append('text')
      .attr('class', 'node-year')
      .attr('text-anchor', 'middle')
      .attr('y', n => -nodeHalfH(n, maxIn) + 10)
      .attr('font-size', 8).attr('fill', '#bbbfc4').attr('opacity', 0)
      .text(n => `ES${n.year}`)

    // ── Tick ──────────────────────────────────────────────────────────────
    sim.on('tick', () => {
      linkGrp.select<SVGLineElement>('.link-line')
        .attr('x1', l => l.source.x).attr('y1', l => l.source.y)
        .attr('x2', l => l.target.x).attr('y2', l => l.target.y)
      nodeGrp.attr('transform', n => `translate(${n.x},${n.y})`)

      const vn = new Set(visibleNodes().map(n => n.id))
      const vl = new Set(visibleLinks().map(l => `${l.source}->${l.target}`))
      nodeGrp.attr('display', n => vn.has(n.id) ? null : 'none')
      linkGrp.attr('display', l => vl.has(`${l.source.id}->${l.target.id}`) ? null : 'none')
    })

    // Store meta reference
    ;(svgRef.current as unknown as Record<string, unknown>)['__d3meta'] = {
      linkGrp, nodeGrp, simNodes, simLinks, zoom, svg, maxIn,
    }

    // Resize
    const ro = new ResizeObserver(() => {
      const nw = canvas.clientWidth; const nh = canvas.clientHeight
      svg.attr('width', nw).attr('height', nh)
      sim.force('center', d3.forceCenter(nw / 2, nh / 2)).restart()
    })
    ro.observe(canvas)

    return () => { sim.stop(); ro.disconnect(); svg.selectAll('*').remove() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Selection highlight ───────────────────────────────────────────────────
  useEffect(() => {
    const meta = getMeta(svgRef)
    if (!meta) return
    const { linkGrp, nodeGrp } = meta

    if (!selectedNodeId) {
      nodeGrp.selectAll<SVGRectElement, SimNode>('.node-card')
        .attr('opacity', 1).attr('filter', n => `url(#glow-${n.id})`)
      linkGrp.select<SVGLineElement>('.link-line')
        .attr('opacity', .5).attr('stroke', '#dde2ea')
      return
    }

    const conn   = connectedIds(selectedNodeId)
    const cLinks = connectedLinks(selectedNodeId)
    const cSet   = new Set(cLinks.map(l => `${l.source}->${l.target}`))

    nodeGrp.selectAll<SVGRectElement, SimNode>('.node-card')
      .attr('opacity', n => conn.has(n.id) ? 1 : .2)
      .attr('filter', n => n.id === selectedNodeId ? 'url(#glow-sel)' : `url(#glow-${n.id})`)

    linkGrp.select<SVGLineElement>('.link-line')
      .attr('opacity', (l: SimLink) => cSet.has(`${l.source.id}->${l.target.id}`) ? 1 : .08)
      .attr('stroke', (l: SimLink) =>
        cSet.has(`${l.source.id}->${l.target.id}`) ? EDGE_TYPE_COLOR[l.type] : '#dde2ea')
      .attr('stroke-width', (l: SimLink) =>
        cSet.has(`${l.source.id}->${l.target.id}`) ? 2 : 1.4)
  }, [selectedNodeId, connectedIds, connectedLinks])

  // ── Filter/timeline visibility ────────────────────────────────────────────
  useEffect(() => {
    const meta = getMeta(svgRef)
    if (!meta) return
    const { nodeGrp, linkGrp } = meta
    const vn = new Set(visibleNodes().map(n => n.id))

    nodeGrp
      .attr('display', (n: SimNode) => vn.has(n.id) ? null : 'none')
      .transition().duration(300)
      .attr('opacity', (n: SimNode) => vn.has(n.id) ? 1 : 0)

    linkGrp.attr('display', (l: SimLink) =>
      vn.has(l.source.id) && vn.has(l.target.id) ? null : 'none')

    // Show year badge in timeline mode
    nodeGrp.selectAll<SVGTextElement, SimNode>('.node-year')
      .attr('opacity', timelineYear !== null ? .8 : 0)
  }, [filterTypes, timelineYear, visibleNodes, visibleLinks])

  // ── Gravity field (hover attraction) ─────────────────────────────────────
  useEffect(() => {
    const meta = getMeta(svgRef)
    if (!meta) return
    const sim = simRef.current
    if (!sim || !gravityEnabled) return

    if (!hoveredNodeId) {
      // Remove custom gravity forces
      sim.force('gravity-attract', null)
      sim.force('gravity-repel', null)
      sim.alpha(.3).restart()
      return
    }

    // Compute connected set
    const conn = connectedIds(hoveredNodeId)

    // Attract connected, repel others
    sim.force('gravity-attract',
      d3.forceManyBody<SimNode>()
        .strength((n: SimNode) => conn.has(n.id) && n.id !== hoveredNodeId ? -80 : 0)
    )
    sim.force('gravity-repel',
      d3.forceManyBody<SimNode>()
        .strength((n: SimNode) => !conn.has(n.id) ? 60 : 0)
    )
    sim.alpha(.4).restart()

    return () => {
      if (simRef.current) {
        simRef.current.force('gravity-attract', null)
        simRef.current.force('gravity-repel', null)
      }
    }
  }, [hoveredNodeId, gravityEnabled, connectedIds])

  // ── Learning path highlight ───────────────────────────────────────────────
  useEffect(() => {
    const meta = getMeta(svgRef)
    if (!meta) return
    const { nodeGrp, linkGrp } = meta

    if (learningPath.length === 0) return

    const pathSet = new Set(learningPath)

    // Build path link pairs
    const pathLinkSet = new Set<string>()
    for (let i = 0; i < learningPath.length - 1; i++) {
      pathLinkSet.add(`${learningPath[i]}->${learningPath[i+1]}`)
    }

    // Pulse animation on path nodes
    nodeGrp.selectAll<SVGRectElement, SimNode>('.node-card')
      .attr('filter', n =>
        pathSet.has(n.id)
          ? 'url(#glow-path)'
          : `url(#glow-${n.id})`
      )
      .attr('stroke', n => pathSet.has(n.id) ? '#f59e0b' : n.color)
      .attr('stroke-width', n => pathSet.has(n.id) ? 2.5 : 1.5 + (n.inDegree ?? 0) * .4)

    // Highlight path edges
    linkGrp.select<SVGLineElement>('.link-line')
      .attr('stroke', (l: SimLink) =>
        pathLinkSet.has(`${l.source.id}->${l.target.id}`) ? '#f59e0b' : '#dde2ea')
      .attr('stroke-width', (l: SimLink) =>
        pathLinkSet.has(`${l.source.id}->${l.target.id}`) ? 2.5 : 1.4)
      .attr('opacity', (l: SimLink) =>
        pathLinkSet.has(`${l.source.id}->${l.target.id}`) ? 1 : .3)

    // Animate path in sequence using step labels
    const pathSteps = nodeGrp.filter((n: SimNode) => pathSet.has(n.id))
    pathSteps.selectAll<SVGCircleElement, SimNode>('.path-step-badge').remove()
    learningPath.forEach((id, i) => {
      nodeGrp.filter((n: SimNode) => n.id === id)
        .append('circle')
        .attr('class', 'path-step-badge')
        .attr('r', 9)
        .attr('cx', (n: SimNode) => nodeHalfW(n, Math.max(...useGraphStore.getState().nodes.map(x => x.inDegree ?? 0), 1)))
        .attr('cy', (n: SimNode) => -nodeHalfH(n, Math.max(...useGraphStore.getState().nodes.map(x => x.inDegree ?? 0), 1)))
        .attr('fill', '#f59e0b')
        .attr('stroke', '#fff').attr('stroke-width', 1.5)
        .append('title').text(`步骤 ${i + 1}`)
    })
    nodeGrp.filter((n: SimNode) => pathSet.has(n.id))
      .append('text')
      .attr('class', 'path-step-badge')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('font-size', 8).attr('font-weight', '800').attr('fill', '#fff')
      .attr('x', (n: SimNode) => nodeHalfW(n, Math.max(...useGraphStore.getState().nodes.map(x => x.inDegree ?? 0), 1)))
      .attr('y', (n: SimNode) => -nodeHalfH(n, Math.max(...useGraphStore.getState().nodes.map(x => x.inDegree ?? 0), 1)))
      .text((_n: SimNode) => {
        const idx = learningPath.findIndex(id => id === _n.id)
        return idx >= 0 ? `${idx + 1}` : ''
      })

    return () => {
      // Clear path badges on unmount/reset
      const m = getMeta(svgRef)
      if (!m) return
      m.nodeGrp.selectAll('.path-step-badge').remove()
      m.nodeGrp.selectAll<SVGRectElement, SimNode>('.node-card')
        .attr('filter', n => `url(#glow-${n.id})`)
        .attr('stroke', n => n.color)
        .attr('stroke-width', n => 1.5 + (n.inDegree ?? 0) * .4)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learningPath])


  const typeKeys = ['JS Syntax', 'JS Builtin', 'JS Pattern'] as const
  const filterColorMap: Record<string, string> = {
    'JS Syntax':  '#336aea',
    'JS Builtin': '#06a35a',
    'JS Pattern': '#e07d22',
  }

  return (
    <div className={styles.graphView}>
      {/* Toolbar — type filters only */}
      <div className={styles.toolbar}>
        <span className={styles.title}>JS 知识图谱</span>
        <span className={styles.badge}>
          {visibleNodes().length} / {allNodes.length} 个概念
        </span>
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
      </div>

      {/* Canvas */}
      <div
        className={styles.canvasWrap}
        ref={canvasRef}
        onClick={() => selectNode(null)}
        onMouseMove={e => {
          const rect = canvasRef.current?.getBoundingClientRect()
          if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }}
      >
        <svg ref={svgRef} />

        <div className={styles.stat}>
          {visibleNodes().length} 节点 · {visibleLinks().length} 关系
          {timelineYear && <span> · ≤ {timelineYear}</span>}
        </div>

        {/* Timeline — floating card top-right */}
        <Timeline />

        {/* Hover tooltip */}
        {hoveredNodeId && (() => {
          const n = allNodes.find(x => x.id === hoveredNodeId)
          if (!n) return null
          const canvasEl = canvasRef.current
          if (!canvasEl) return null
          const canvasW = canvasEl.clientWidth
          // Flip left if near right edge
          const flipX = mousePos.x > canvasW - 230
          return (
            <div
              className={styles.tooltip}
              style={{
                left:  flipX ? undefined : mousePos.x + 14,
                right: flipX ? canvasW - mousePos.x + 14 : undefined,
                top:   mousePos.y - 10,
              }}
              onMouseEnter={() => hoverNode(n.id)}
              onMouseLeave={() => hoverNode(null)}
            >
              <div className={styles.ttHeader}>
                <span className={styles.ttDot} style={{ background: n.color }} />
                <span className={styles.ttLabel}>{n.label}</span>
                <span className={styles.ttType} style={{ color: n.color }}>{n.type}</span>
              </div>
              <p className={styles.ttDesc}>{n.description}</p>
              <div className={styles.ttMeta}>
                <span>📖 {(n.reads / 1000).toFixed(1)}k 阅读</span>
                <span>🔗 {connectedIds(n.id).size - 1} 个关联</span>
                <span>⏱ {n.learnMins} 分钟</span>
              </div>
              {n.tags.length > 0 && (
                <div className={styles.ttTags}>
                  {n.tags.slice(0, 4).map(t => (
                    <span key={t} className={styles.ttTag}>{t}</span>
                  ))}
                </div>
              )}
              <div className={styles.ttHint}>点击查看详情 · 双击打开文档</div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ── Helper ────────────────────────────────────────────────────────────────────
type D3Meta = {
  linkGrp: d3.Selection<SVGGElement, SimLink, SVGGElement, unknown>
  nodeGrp: d3.Selection<SVGGElement, SimNode, SVGGElement, unknown>
  simNodes: SimNode[]
  simLinks: SimLink[]
  maxIn: number
}
function getMeta(svgRef: React.RefObject<SVGSVGElement>): D3Meta | undefined {
  return (svgRef.current as unknown as Record<string, unknown>)?.['__d3meta'] as D3Meta | undefined
}

export default GraphCanvas
