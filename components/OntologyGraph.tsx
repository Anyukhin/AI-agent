
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, OntologyNode } from '../types';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, Info, X, RefreshCw, Database } from 'lucide-react';

interface OntologyGraphProps {
  data: GraphData;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export const OntologyGraph: React.FC<OntologyGraphProps> = ({ data, onRefresh, isRefreshing = false }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphHeight, setGraphHeight] = useState(700); 
  const [selectedNode, setSelectedNode] = useState<OntologyNode | null>(null);
  const zoomRef = useRef<any>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 1600; 
    const height = 1000; 

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "width: 100%; height: 100%; font: 12px 'Inter', sans-serif; cursor: grab;");

    const g = svg.append("g").attr("class", "main-group");

    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);
    zoomRef.current = zoom;

    const simulation = d3.forceSimulation<d3.SimulationNodeDatum & OntologyNode>(data.nodes as any)
      .force("link", d3.forceLink<d3.SimulationNodeDatum & OntologyNode, any>(data.links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-600))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(80));

    const link = g.append("g")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", 0.3)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", 2);

    const node = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .attr("class", "node-group")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedNode(d as OntologyNode);
        event.stopPropagation();
      })
      .call(d3.drag<SVGGElement, d3.SimulationNodeDatum & OntologyNode, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    node.append("circle")
      .attr("r", (d: any) => d.group === 'Characteristic' ? 18 : 14)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2.5)
      .attr("fill", (d: any) => d.group === 'Characteristic' ? "#3b82f6" : "#ef4444")
      .attr("filter", "drop-shadow(0 6px 4px rgb(0 0 0 / 0.4))")
      .transition()
      .duration(500)
      .attr("r", (d: any) => d.group === 'Characteristic' ? 20 : 16);

    const labels = node.append("text")
      .attr("x", 24)
      .attr("y", "0.31em")
      .attr("fill", "#f8fafc")
      .style("font-weight", "700")
      .style("font-size", "14px")
      .text((d: any) => d.label);

    labels.clone(true).lower()
      .attr("fill", "none")
      .attr("stroke", "#020617")
      .attr("stroke-width", 1.2)
      .attr("stroke-linejoin", "round");
      
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    svg.on("click", () => setSelectedNode(null));

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
      svg.style("cursor", "grabbing");
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
      svg.style("cursor", "grab");
    }

    svg.call(zoom.transform as any, d3.zoomIdentity.translate(width/8, height/8).scale(0.75));

    return () => {
      simulation.stop();
    };
  }, [data]);

  const handleZoom = (type: 'in' | 'out' | 'reset') => {
    const svg = d3.select(svgRef.current);
    if (type === 'reset') {
      svg.transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity.scale(0.75).translate(200, 150));
    } else {
      svg.transition().duration(300).call(zoomRef.current.scaleBy, type === 'in' ? 1.3 : 0.7);
    }
  };

  return (
    <div ref={containerRef} className="relative bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col group/container">
      <div 
        style={{ height: `${graphHeight}px` }}
        className="relative transition-all duration-500 ease-in-out w-full"
      >
        {isRefreshing && (
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm z-30 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-blue-500" size={48} />
              <span className="text-white font-bold tracking-widest uppercase text-sm">Загрузка из Neo4j...</span>
            </div>
          </div>
        )}

        <svg ref={svgRef} className="w-full h-full block" />

        <div className="absolute top-6 left-6 flex flex-col gap-3 z-10">
          <div className="flex flex-col bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-2xl">
            <button onClick={() => handleZoom('in')} className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors" title="Zoom In"><ZoomIn size={20} /></button>
            <button onClick={() => handleZoom('out')} className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors" title="Zoom Out"><ZoomOut size={20} /></button>
            <div className="h-px bg-slate-700 mx-1"></div>
            <button onClick={() => handleZoom('reset')} className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors" title="Reset View"><RotateCcw size={20} /></button>
          </div>

          <div className="flex flex-col bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-2xl">
            <button onClick={() => setGraphHeight(prev => Math.min(1500, prev + 200))} className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors" title="Expand Window"><Maximize2 size={20} /></button>
            <button onClick={() => setGraphHeight(prev => Math.max(500, prev - 200))} className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors" title="Shrink Window"><Minimize2 size={20} /></button>
          </div>

          <div className="flex flex-col bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-2xl">
            <button 
              onClick={onRefresh} 
              disabled={isRefreshing}
              className={`p-2 hover:bg-slate-800 text-blue-400 rounded-lg transition-all ${isRefreshing ? 'opacity-50' : ''}`} 
              title="Загрузить из Neo4j"
            >
              <Database size={20} />
            </button>
          </div>
        </div>

        {selectedNode && (
          <div className="absolute top-6 right-6 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-6 animate-in slide-in-from-right-8 duration-300 z-20">
            <div className="flex justify-between items-start mb-4">
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedNode.group === 'Characteristic' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                {selectedNode.group}
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{selectedNode.label}</h3>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Определение</span>
                <p className="text-sm text-slate-300 leading-relaxed">{selectedNode.definition || 'Нет определения'}</p>
              </div>
              {selectedNode.rationale && (
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Обоснование</span>
                  <p className="text-sm text-slate-400 italic">{selectedNode.rationale}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-5 bg-slate-900/80 text-xs text-slate-400 flex flex-wrap items-center gap-6 border-t border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white/20 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div> 
          <span className="font-bold text-slate-300 tracking-tight">Characteristic (C)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white/20 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div> 
          <span className="font-bold text-slate-300 tracking-tight">Rule (R)</span>
        </div>
        <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Info size={14} />
          <span>Нажмите на узел для деталей. Используйте колесо мыши для зума. Кнопка БД загружает граф из Neo4j.</span>
        </div>
        <div className="ml-auto flex items-center gap-2 font-mono text-[10px] bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
          <span className="opacity-40">VIEWPORT:</span> {graphHeight}PX
        </div>
      </div>
    </div>
  );
};

// Loader icon for the overlay
const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
  <RefreshCw className={`${className} animate-spin`} size={size} />
);
