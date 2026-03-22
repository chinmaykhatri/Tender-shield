// ─────────────────────────────────────────────────
// FILE: app/ai-monitor/cartel-graph/page.tsx
// TYPE: CLIENT PAGE
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: D3-style force-directed graph using pure SVG + requestAnimationFrame
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface GraphNode {
  id: string; type: string; label: string; trust_score?: number; risk_level?: string;
  tenders_bid?: number; ministry?: string; fraud_flags?: number; status?: string;
  value_crore?: number; risk_score?: number; companies?: string[]; role?: string;
  x: number; y: number; vx: number; vy: number;
}

interface GraphEdge {
  source: string; target: string; type: string; weight: number; label: string; fraud_flag: boolean;
}

interface CartelGroup {
  id: string; name: string; members: string[]; member_ids: string[];
  tenders_involved: number; total_value_crore: number; confidence: number; evidence: string[];
}

function getNodeColor(node: GraphNode): string {
  if (node.type === 'PERSON') return '#ef4444';
  if (node.type === 'TENDER') {
    if (node.status === 'FROZEN') return '#ef4444';
    if (node.status === 'AWARDED') return '#22c55e';
    return '#3b82f6';
  }
  const ts = node.trust_score || 50;
  if (ts > 70) return '#22c55e';
  if (ts > 40) return '#f59e0b';
  return '#ef4444';
}

function getNodeRadius(node: GraphNode): number {
  if (node.type === 'PERSON') return 14;
  if (node.type === 'TENDER') return 22;
  return 12 + Math.min((node.tenders_bid || 1) * 2, 16);
}

function getEdgeColor(edge: GraphEdge): string {
  if (edge.type === 'SHARED_DIRECTOR') return '#ef4444';
  if (edge.type === 'SUSPECTED_CARTEL') return '#f97316';
  if (edge.fraud_flag) return '#f59e0b';
  return '#4a4a6a';
}

export default function CartelGraphPage() {
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightCartels, setHighlightCartels] = useState(false);
  const [filter, setFilter] = useState('all');
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ node: GraphNode | null; active: boolean }>({ node: null, active: false });

  useEffect(() => {
    fetch('/api/cartel-graph')
      .then(r => r.json())
      .then(d => { setGraphData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Initialize positions
  useEffect(() => {
    if (!graphData) return;
    const w = 800, h = 500;
    nodesRef.current = graphData.nodes.map((n: any, i: number) => ({
      ...n,
      x: w / 2 + (Math.cos(i * 2 * Math.PI / graphData.nodes.length) * 180) + (Math.random() - 0.5) * 50,
      y: h / 2 + (Math.sin(i * 2 * Math.PI / graphData.nodes.length) * 150) + (Math.random() - 0.5) * 50,
      vx: 0, vy: 0,
    }));
    runSimulation();
    return () => cancelAnimationFrame(animRef.current);
  }, [graphData]);

  const runSimulation = useCallback(() => {
    const nodes = nodesRef.current;
    const edges = graphData?.edges || [];
    const w = 800, h = 500;
    let alpha = 1;

    const tick = () => {
      if (alpha < 0.01) { alpha = 0.01; }
      alpha *= 0.995;

      // Forces
      for (let i = 0; i < nodes.length; i++) {
        // Center gravity
        nodes[i].vx += (w / 2 - nodes[i].x) * 0.001 * alpha;
        nodes[i].vy += (h / 2 - nodes[i].y) * 0.001 * alpha;

        // Repulsion
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (80 / (dist * dist)) * alpha * 50;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx += fx; nodes[i].vy += fy;
          nodes[j].vx -= fx; nodes[j].vy -= fy;
        }
      }

      // Edge attraction
      for (const edge of edges) {
        const s = nodes.find((n: GraphNode) => n.id === edge.source);
        const t = nodes.find((n: GraphNode) => n.id === edge.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const strength = edge.weight * 0.003 * alpha;
        const targetDist = 120;
        const force = (dist - targetDist) * strength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx; s.vy += fy;
        t.vx -= fx; t.vy -= fy;
      }

      // Apply velocity + friction
      for (const node of nodes) {
        if (dragRef.current.active && dragRef.current.node?.id === node.id) continue;
        node.vx *= 0.8; node.vy *= 0.8;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(30, Math.min(w - 30, node.x));
        node.y = Math.max(30, Math.min(h - 30, node.y));
      }

      // Render
      renderGraph();
      animRef.current = requestAnimationFrame(tick);
    };

    tick();
  }, [graphData]);

  const renderGraph = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !graphData) return;
    const nodes = nodesRef.current;
    const edges = graphData.edges;
    const cartelIds = highlightCartels ? graphData.cartel_groups.flatMap((cg: CartelGroup) => cg.member_ids) : [];

    // Build SVG content
    let content = '<defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';

    // Cartel circles
    if (highlightCartels) {
      for (const cg of graphData.cartel_groups) {
        const memberNodes = nodes.filter((n: GraphNode) => cg.member_ids.includes(n.id));
        if (memberNodes.length === 0) continue;
        const cx = memberNodes.reduce((s: number, n: GraphNode) => s + n.x, 0) / memberNodes.length;
        const cy = memberNodes.reduce((s: number, n: GraphNode) => s + n.y, 0) / memberNodes.length;
        const maxDist = Math.max(...memberNodes.map((n: GraphNode) => Math.sqrt((n.x - cx) ** 2 + (n.y - cy) ** 2)));
        content += `<circle cx="${cx}" cy="${cy}" r="${maxDist + 40}" fill="${cg.confidence > 0.8 ? '#ef444410' : '#f9731610'}" stroke="${cg.confidence > 0.8 ? '#ef4444' : '#f97316'}" stroke-width="1.5" stroke-dasharray="6 3"/>`;
        content += `<text x="${cx}" y="${cy - maxDist - 48}" text-anchor="middle" fill="${cg.confidence > 0.8 ? '#ef4444' : '#f97316'}" font-size="10" font-weight="bold">${cg.name} (${Math.round(cg.confidence * 100)}%)</text>`;
      }
    }

    // Edges
    for (const edge of edges) {
      if (filter === 'fraud' && !edge.fraud_flag) continue;
      const s = nodes.find((n: GraphNode) => n.id === edge.source);
      const t = nodes.find((n: GraphNode) => n.id === edge.target);
      if (!s || !t) continue;
      const color = getEdgeColor(edge);
      const opacity = highlightCartels ? (edge.fraud_flag ? 1 : 0.15) : 0.6;
      const sw = Math.max(1, edge.weight * 0.8);
      const dash = edge.type === 'SUSPECTED_CARTEL' ? 'stroke-dasharray="5 3"' : '';
      content += `<line x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" stroke="${color}" stroke-width="${sw}" opacity="${opacity}" ${dash}/>`;
    }

    // Nodes
    for (const node of nodes) {
      if (filter === 'fraud' && node.risk_level === 'LOW') continue;
      const r = getNodeRadius(node);
      const color = getNodeColor(node);
      const opacity = highlightCartels && !cartelIds.includes(node.id) && node.type === 'COMPANY' ? 0.2 : 1;
      const isSelected = selectedNode?.id === node.id;
      const glow = node.risk_level === 'CRITICAL' || isSelected ? 'filter="url(#glow)"' : '';

      if (node.type === 'TENDER') {
        // Diamond
        const s = r * 0.7;
        content += `<polygon points="${node.x},${node.y - s} ${node.x + s},${node.y} ${node.x},${node.y + s} ${node.x - s},${node.y}" fill="${color}20" stroke="${color}" stroke-width="2" opacity="${opacity}" ${glow} style="cursor:pointer" data-id="${node.id}"/>`;
      } else if (node.type === 'PERSON') {
        // Star shape (simplified as circle with double ring)
        content += `<circle cx="${node.x}" cy="${node.y}" r="${r}" fill="${color}30" stroke="${color}" stroke-width="2" opacity="${opacity}" ${glow} style="cursor:pointer" data-id="${node.id}"/>`;
        content += `<circle cx="${node.x}" cy="${node.y}" r="${r + 4}" fill="none" stroke="${color}" stroke-width="1" opacity="${opacity * 0.4}" stroke-dasharray="3 2"/>`;
      } else {
        content += `<circle cx="${node.x}" cy="${node.y}" r="${r}" fill="${color}20" stroke="${color}" stroke-width="${isSelected ? 3 : 2}" opacity="${opacity}" ${glow} style="cursor:pointer" data-id="${node.id}"/>`;
      }

      // Label
      const fontSize = node.type === 'TENDER' ? 9 : 10;
      content += `<text x="${node.x}" y="${node.y + r + 14}" text-anchor="middle" fill="#a0a0c0" font-size="${fontSize}" opacity="${opacity}">${node.label.length > 16 ? node.label.substring(0, 14) + '…' : node.label}</text>`;

      // Trust score badge
      if (node.type === 'COMPANY' && node.trust_score !== undefined) {
        content += `<text x="${node.x}" y="${node.y + 4}" text-anchor="middle" fill="${color}" font-size="9" font-weight="bold" opacity="${opacity}">${node.trust_score}</text>`;
      }
    }

    svg.innerHTML = content;
  }, [graphData, selectedNode, highlightCartels, filter]);

  // Click handler
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const nodeId = target.getAttribute('data-id') || target.parentElement?.getAttribute('data-id');
    if (nodeId) {
      const node = nodesRef.current.find(n => n.id === nodeId);
      setSelectedNode(node || null);
    } else {
      setSelectedNode(null);
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const node = nodesRef.current.find(n => {
      const r = getNodeRadius(n);
      return Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2) < r + 5;
    });
    if (node) {
      dragRef.current = { node, active: true };
      setSelectedNode(node);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragRef.current.active || !dragRef.current.node || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    dragRef.current.node.x = e.clientX - rect.left;
    dragRef.current.node.y = e.clientY - rect.top;
    dragRef.current.node.vx = 0;
    dragRef.current.node.vy = 0;
  };

  const handleMouseUp = () => { dragRef.current = { node: null, active: false }; };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading cartel network data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">🕸️ Multi-Tender Cartel Detection</h1>
            <p className="text-[var(--text-secondary)]">
              Connections across {graphData?.summary?.total_tenders} tenders and {graphData?.summary?.total_companies} companies · ₹{graphData?.summary?.total_value_at_risk_crore} Cr at risk
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilter(f => f === 'all' ? 'fraud' : 'all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === 'fraud' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'}`}>
              {filter === 'fraud' ? '🔴 Fraud Only' : '⚪ Show All'}
            </button>
            <button onClick={() => setHighlightCartels(!highlightCartels)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${highlightCartels ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]' : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)]'}`}>
              {highlightCartels ? '🟣 Cartels Highlighted' : '🕸️ Highlight Cartels'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Graph */}
          <div className="lg:col-span-3 card-glass p-4">
            <svg ref={svgRef} width="800" height="500" className="w-full h-auto rounded-xl bg-[#0a0a1a]"
              onClick={handleSvgClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: dragRef.current.active ? 'grabbing' : 'default' }}
            />
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-[var(--text-secondary)] justify-center">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#22c55e] inline-block" /> Trusted</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#f59e0b] inline-block" /> Medium</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block" /> Critical</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rotate-45 inline-block" style={{ width: 10, height: 10 }} /> Tender</span>
              <span>── Bid &nbsp; <span className="text-red-400">━━ Shared Director</span> &nbsp; <span className="text-orange-400">┈┈ Cartel</span></span>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Selected node detail */}
            {selectedNode ? (
              <div className="card-glass p-5 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm truncate">{selectedNode.label}</h3>
                  <button onClick={() => setSelectedNode(null)} className="text-[var(--text-secondary)] hover:text-white text-sm">✕</button>
                </div>

                {selectedNode.type === 'COMPANY' && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Trust Score</span>
                      <span className="font-bold" style={{ color: getNodeColor(selectedNode) }}>{selectedNode.trust_score}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Fraud Flags</span>
                      <span className="text-red-400 font-semibold">{selectedNode.fraud_flags}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Tenders Bid</span>
                      <span>{selectedNode.tenders_bid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Ministry</span>
                      <span>{selectedNode.ministry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Risk Level</span>
                      <span className="badge text-xs" style={{
                        background: `${getNodeColor(selectedNode)}15`,
                        color: getNodeColor(selectedNode)
                      }}>{selectedNode.risk_level}</span>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'TENDER' && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Status</span>
                      <span className="font-bold" style={{ color: getNodeColor(selectedNode) }}>{selectedNode.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Risk Score</span>
                      <span className="text-red-400 font-bold">{selectedNode.risk_score}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Value</span>
                      <span>₹{selectedNode.value_crore} Cr</span>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'PERSON' && (
                  <div className="space-y-2 text-sm">
                    <p className="text-red-400 font-semibold">{selectedNode.role}</p>
                    <p className="text-[var(--text-secondary)]">Companies:</p>
                    {selectedNode.companies?.map((c: string) => (
                      <p key={c} className="text-xs ml-2">• {c}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card-glass p-5 text-center">
                <p className="text-3xl mb-2">👆</p>
                <p className="text-sm text-[var(--text-secondary)]">Click any node in the graph to see details</p>
                <p className="text-xs text-[var(--accent)] mt-1">Drag nodes to rearrange</p>
              </div>
            )}

            {/* Cartel groups */}
            <div className="card-glass p-5">
              <h3 className="font-semibold mb-3 text-sm">🚨 Detected Cartel Groups</h3>
              <div className="space-y-3">
                {graphData?.cartel_groups?.map((cg: CartelGroup) => (
                  <div key={cg.id} className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold">{cg.name}</p>
                      <span className="text-xs font-mono text-red-400">{Math.round(cg.confidence * 100)}%</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {cg.members.join(' + ')}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {cg.tenders_involved} tenders · ₹{cg.total_value_crore} Cr
                    </p>
                    <div className="mt-2 space-y-1">
                      {cg.evidence.map((e: string, i: number) => (
                        <p key={i} className="text-[10px] text-red-400/80">⚠ {e}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary stats */}
            <div className="card-glass p-5">
              <h3 className="font-semibold mb-3 text-sm">📊 Network Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Companies</span>
                  <span className="font-bold">{graphData?.summary?.total_companies}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Tenders</span>
                  <span className="font-bold">{graphData?.summary?.total_tenders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Cartels Found</span>
                  <span className="font-bold text-red-400">{graphData?.summary?.total_cartels}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Value at Risk</span>
                  <span className="font-bold text-[var(--saffron)]">₹{graphData?.summary?.total_value_at_risk_crore} Cr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Cross-Ministry</span>
                  <span className="text-red-400 font-semibold">{graphData?.summary?.cross_ministry ? 'YES' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="/dashboard" className="text-[var(--accent)] text-sm hover:underline">← Back to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
