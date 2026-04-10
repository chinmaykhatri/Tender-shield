'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

// ═══════════════════════════════════════════════════════════
// TenderShield — Shell Company Network Graph
// D3.js force-directed graph showing company relationships
// ═══════════════════════════════════════════════════════════

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  risk: number;
  bids: number;
  flagged: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  type: string;
  strength: number;
  detail: string;
}

function riskColor(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 45) return '#f59e0b';
  return '#22c55e';
}

export default function NetworkGraphPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{ nodes: GraphNode[]; links: GraphLink[]; stats: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);

  useEffect(() => {
    fetch('/api/network-graph')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const renderGraph = useCallback(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 500;

    // Create zoom behavior
    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    // Build simulation
    const nodes: GraphNode[] = data.nodes.map(n => ({ ...n }));
    const links: GraphLink[] = data.links.map(l => ({ ...l }));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(120).strength(d => d.strength * 0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => d.strength > 0.7 ? 'rgba(239,68,68,0.5)' : 'rgba(148,163,184,0.2)')
      .attr('stroke-width', d => 1 + d.strength * 3)
      .attr('stroke-dasharray', d => d.type === 'Bid Pattern Match' ? '6,3' : 'none')
      .style('cursor', 'pointer')
      .on('mouseover', function (_, d) {
        d3.select(this).attr('stroke', '#6366f1').attr('stroke-width', 4);
        setHoveredLink(d);
      })
      .on('mouseout', function (_, d) {
        d3.select(this)
          .attr('stroke', d.strength > 0.7 ? 'rgba(239,68,68,0.5)' : 'rgba(148,163,184,0.2)')
          .attr('stroke-width', 1 + d.strength * 3);
        setHoveredLink(null);
      });

    // Link labels
    const linkLabels = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('font-size', 8)
      .attr('fill', 'rgba(148,163,184,0.5)')
      .attr('text-anchor', 'middle')
      .text(d => d.type);

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (_, d) => setSelectedNode(prev => prev?.id === d.id ? null : d));

    // Apply drag behavior (cast needed for D3 type compatibility)
    (node as any).call(d3.drag<any, GraphNode>()
      .on('start', (event: any, d: any) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event: any, d: any) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event: any, d: any) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      })
    );

    // Node circles
    node.append('circle')
      .attr('r', d => 14 + Math.min(d.bids, 15))
      .attr('fill', d => `${riskColor(d.risk)}20`)
      .attr('stroke', d => riskColor(d.risk))
      .attr('stroke-width', d => d.flagged ? 3 : 1.5);

    // Flagged pulse ring
    node.filter(d => d.flagged)
      .append('circle')
      .attr('r', d => 18 + Math.min(d.bids, 15))
      .attr('fill', 'none')
      .attr('stroke', d => riskColor(d.risk))
      .attr('stroke-width', 1)
      .attr('opacity', 0.3)
      .style('animation', 'pulse 2s infinite');

    // Node labels
    node.append('text')
      .attr('dy', d => -(18 + Math.min(d.bids, 15)))
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('font-weight', 600)
      .attr('fill', '#e2e8f0')
      .text(d => d.label.length > 20 ? d.label.slice(0, 18) + '…' : d.label);

    // Risk score inside node
    node.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('font-weight', 800)
      .attr('fill', d => riskColor(d.risk))
      .text(d => d.risk);

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      linkLabels
        .attr('x', d => ((d.source as GraphNode).x! + (d.target as GraphNode).x!) / 2)
        .attr('y', d => ((d.source as GraphNode).y! + (d.target as GraphNode).y!) / 2);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [data]);

  useEffect(() => { renderGraph(); }, [renderGraph]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#94a3b8' }}>Building network graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>🕵️ Shell Company Network Graph</h1>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>
          Interactive fraud relationship visualizer — drag nodes, hover edges for details
        </p>
      </div>

      {/* Stats bar */}
      {data?.stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { icon: '🏢', label: 'Companies', value: data.stats.total_companies, color: '#6366f1' },
            { icon: '🔗', label: 'Flagged Links', value: data.stats.flagged_connections, color: '#ef4444' },
            { icon: '⚠️', label: 'Risk Clusters', value: data.stats.high_risk_clusters, color: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span>{s.icon}</span>
                <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>{s.label}</span>
              </div>
              <p style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 300px' : '1fr', gap: 16 }}>
        {/* Graph */}
        <div className="card-glass" style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
          <svg
            ref={svgRef}
            style={{ width: '100%', height: 520, background: 'rgba(0,0,0,0.2)' }}
          />
          {/* Legend */}
          <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 16, fontSize: 10, color: '#64748b' }}>
            {[
              { color: '#ef4444', label: 'High Risk (70+)' },
              { color: '#f59e0b', label: 'Medium (45-69)' },
              { color: '#22c55e', label: 'Low (<45)' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${l.color}`, background: `${l.color}20` }} />
                {l.label}
              </div>
            ))}
          </div>

          {/* Hovered link tooltip */}
          {hoveredLink && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(99,102,241,0.3)',
              fontSize: 11, maxWidth: 220,
            }}>
              <p style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 4 }}>{hoveredLink.type}</p>
              <p style={{ color: '#94a3b8' }}>{hoveredLink.detail}</p>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9, color: '#64748b' }}>Strength:</span>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${hoveredLink.strength * 100}%`, background: hoveredLink.strength > 0.7 ? '#ef4444' : '#6366f1' }} />
                </div>
                <span style={{ fontSize: 9, color: '#94a3b8' }}>{Math.round(hoveredLink.strength * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Selected node detail panel */}
        {selectedNode && (
          <div className="card-glass" style={{ padding: 20, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Company Details</h3>
              <button onClick={() => setSelectedNode(null)} style={{ color: '#64748b', cursor: 'pointer', background: 'none', border: 'none', fontSize: 16 }}>✕</button>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{selectedNode.label}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                <p style={{ fontSize: 9, color: '#64748b' }}>Risk Score</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: riskColor(selectedNode.risk) }}>{selectedNode.risk}</p>
              </div>
              <div style={{ padding: 10, borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                <p style={{ fontSize: 9, color: '#64748b' }}>Total Bids</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{selectedNode.bids}</p>
              </div>
            </div>

            {selectedNode.flagged && (
              <div style={{ padding: 10, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#f87171' }}>🚩 Flagged for Investigation</p>
                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                  This entity has suspicious bid patterns or shared identifiers with flagged companies.
                </p>
              </div>
            )}

            {/* Show connected entities */}
            <h4 style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>CONNECTIONS</h4>
            {data?.links
              .filter(l => {
                const src = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
                const tgt = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
                return src === selectedNode.id || tgt === selectedNode.id;
              })
              .map((l, i) => {
                const src = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
                const other = src === selectedNode.id
                  ? (typeof l.target === 'string' ? l.target : (l.target as GraphNode).id)
                  : src;
                return (
                  <div key={i} style={{
                    padding: 8, borderRadius: 8, marginBottom: 6,
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 600 }}>{other.replace(/-/g, ' ')}</p>
                    <p style={{ fontSize: 9, color: '#6366f1' }}>{l.type}</p>
                    <p style={{ fontSize: 9, color: '#64748b' }}>{l.detail}</p>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.1; transform: scale(1.1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
