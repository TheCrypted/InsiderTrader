import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { graphNodes, graphLinks, nodeColors, sectorColors } from '../utils/graphData';
import Container from '../components/shared/Container';

const GraphPage = () => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'congressman', 'bill'

  // Prepare graph data with positions and relationships
  const graphData = useMemo(() => {
    // Normalize node sizes (scale between 8 and 40)
    const sizes = graphNodes.map(n => n.size || 10);
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    const normalizeSize = (size) => {
      if (maxSize === minSize) return 20;
      return 8 + ((size - minSize) / (maxSize - minSize)) * 32;
    };

    const nodes = graphNodes.map(node => ({
      ...node,
      // Set initial positions for better layout
      x: Math.random() * 800 + 100,
      y: Math.random() * 600 + 100,
      // Normalized size
      normalizedSize: normalizeSize(node.size || 10),
      // Color based on type
      color: node.type === 'congressman' 
        ? nodeColors.congressman[node.party]
        : sectorColors[node.sector] || nodeColors.bill,
      // Add visual properties
      opacity: 1,
      strokeWidth: 2
    }));

    const links = graphLinks.map(link => ({
      ...link,
      source: typeof link.source === 'string' ? link.source : link.source.id,
      target: typeof link.target === 'string' ? link.target : link.target.id,
      // Visual link properties
      opacity: link.strength * 0.8
    }));

    return { nodes, links };
  }, []);

  // Filter nodes based on selection
  const filteredData = useMemo(() => {
    if (filter === 'all') return graphData;
    
    const filteredNodes = graphData.nodes.filter(node => node.type === filter);
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    
    // Keep links that connect to filtered nodes
    const filteredLinks = graphData.links.filter(link => 
      nodeIds.has(link.source) && nodeIds.has(link.target)
    );
    
    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  }, [graphData, filter]);

  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node || null);
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleNodeRightClick = useCallback((node, event) => {
    event.preventDefault();
    setSelectedNode(null);
  }, []);

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const getNodeLabel = (node) => {
    if (node.type === 'congressman') {
      return node.name;
    }
    return node.id;
  };

  const getNodeDetails = (node) => {
    if (!node) return null;

    if (node.type === 'congressman') {
      return (
        <div className="p-4 bg-white rounded-lg shadow-lg border-2 border-gray-200 max-w-sm">
          <div className="flex items-start gap-3 mb-3">
            {node.image && (
              <img 
                src={node.image} 
                alt={node.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{node.name}</h3>
              <p className="text-sm text-gray-600">{node.party} / {node.chamber}</p>
              <p className="text-xs text-gray-500">{node.state}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm border-t border-gray-200 pt-3">
            <div>
              <span className="text-gray-500">Net Worth:</span>
              <div className="font-semibold text-gray-900">{formatCurrency(node.netWorth)}</div>
            </div>
            <div>
              <span className="text-gray-500">Trade Volume:</span>
              <div className="font-semibold text-gray-900">{formatCurrency(node.tradeVolume)}</div>
            </div>
            <div>
              <span className="text-gray-500">Total Trades:</span>
              <div className="font-semibold text-gray-900">{node.totalTrades}</div>
            </div>
            <div>
              <Link
                to={`/congressman/${node.id}/trading`}
                className="text-xs c-btn c-btn--yellow px-3 py-1 mt-2 inline-block"
              >
                View Profile →
              </Link>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="p-4 bg-white rounded-lg shadow-lg border-2 border-gray-200 max-w-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{node.id}</h3>
          <p className="text-sm text-gray-700 mb-3">{node.title}</p>
          <div className="space-y-2 text-sm border-t border-gray-200 pt-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className="font-medium text-gray-900">{node.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cosponsors:</span>
              <span className="font-medium text-gray-900">{node.cosponsors}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sector:</span>
              <span className="font-medium text-gray-900">{node.sector}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Corporate Support:</span>
              <span className="font-medium text-gray-900">{formatCurrency(node.corporateSupport)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date:</span>
              <span className="font-medium text-gray-900">
                {new Date(node.date).toLocaleDateString()}
              </span>
            </div>
            <div className="pt-2">
              <Link
                to={`/legislation/${node.id}/bet`}
                className="text-xs c-btn c-btn--yellow px-3 py-1 inline-block"
              >
                Predict Outcome →
              </Link>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gresearch-grey-200 py-8">
      <Container>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors mb-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </Link>
              <h1 className="text-3xl font-light text-gray-900">Knowledge Graph</h1>
              <p className="text-sm text-gray-600 mt-1">
                Interactive visualization of bills, congressmen, and their relationships
              </p>
            </div>
            
            {/* Filters */}
            <div className="flex gap-2">
              {['all', 'congressman', 'bill'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                    filter === f
                      ? 'c-btn c-btn--yellow'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Graph Container */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden relative">
          <div className="w-full h-[600px] relative">
            <ForceGraph2D
              graphData={filteredData}
              nodeLabel={getNodeLabel}
              nodeRelSize={node => node.normalizedSize || 15}
              nodeVal={node => node.normalizedSize || 15}
              linkDirectionalArrowLength={6}
              linkDirectionalArrowRelPos={1}
              linkCurvature={0.15}
              linkColor={link => {
                const opacity = link.opacity || 0.2;
                return `rgba(0, 0, 0, ${opacity})`;
              }}
              linkWidth={link => (link.strength || 0.5) * 3}
              // Force simulation parameters to prevent overlap
              nodeRepulsion={d => {
                const baseSize = d.normalizedSize || 15;
                return -baseSize * 200; // Strong repulsion based on size
              }}
              linkDistance={link => {
                const sourceSize = typeof link.source === 'object' ? (link.source.normalizedSize || 15) : 15;
                const targetSize = typeof link.target === 'object' ? (link.target.normalizedSize || 15) : 15;
                return (sourceSize + targetSize) * 3 + 100; // Distance based on node sizes
              }}
              linkStrength={link => link.strength || 0.5}
              // Enable node dragging - react-force-graph-2d supports dragging by default
              // We just need to handle the drag events to lock positions
              onNodeDragEnd={node => {
                if (node) {
                  // Lock node position after dragging
                  node.fx = node.x;
                  node.fy = node.y;
                }
              }}
              onNodeDrag={node => {
                if (node) {
                  // Update fixed position while dragging
                  node.fx = node.x;
                  node.fy = node.y;
                }
              }}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const label = getNodeLabel(node);
                const size = node.normalizedSize || 15;
                
                // Determine if this node is connected to hovered node
                const isConnected = hoveredNode && hoveredNode.id !== node.id && 
                  filteredData.links.some(l => {
                    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
                    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
                    return (sourceId === hoveredNode.id && targetId === node.id) ||
                           (targetId === hoveredNode.id && sourceId === node.id);
                  });
                const isHovered = hoveredNode && hoveredNode.id === node.id;
                
                // Set opacity based on hover state
                const opacity = (isHovered || isConnected || !hoveredNode) ? 1 : 0.4;
                
                // Draw circle with opacity
                ctx.globalAlpha = opacity;
                ctx.fillStyle = node.color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                ctx.fill();
                
                // Add border for congressmen or highlight on hover
                ctx.globalAlpha = 1;
                if (node.type === 'congressman' || isHovered) {
                  ctx.strokeStyle = '#000000';
                  ctx.lineWidth = isHovered ? 3 : 2;
                  ctx.stroke();
                }
                
                // Highlight ring for hovered node
                if (isHovered) {
                  ctx.strokeStyle = node.color;
                  ctx.lineWidth = 4;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI, false);
                  ctx.stroke();
                }
                
                // Draw label
                if (globalScale > 1.5) {
                  ctx.fillStyle = isHovered ? '#000000' : '#333333';
                  ctx.font = `bold ${Math.max(10, size / 2)}px Arial`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(label, node.x, node.y + size + 12);
                }
              }}
              nodePointerAreaPaint={(node, color, ctx) => {
                // Define the interactive area for hover and drag detection
                const size = node.normalizedSize || 15;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, size + 5, 0, 2 * Math.PI, false);
                ctx.fill();
              }}
              onNodeHover={(node) => {
                handleNodeHover(node || null);
              }}
              onNodeClick={handleNodeClick}
              onNodeRightClick={handleNodeRightClick}
              cooldownTicks={150}
              onEngineStop={() => {
                // Graph settled
              }}
            />
            
            {/* Hover Tooltip */}
            {hoveredNode && (
              <div 
                className="absolute top-4 right-4 z-10 animate-fade-in pointer-events-none"
                style={{
                  pointerEvents: 'none'
                }}
              >
                {getNodeDetails(hoveredNode)}
              </div>
            )}

            {/* Selected Node Details */}
            {selectedNode && !hoveredNode && (
              <div 
                className="absolute top-4 right-4 z-10 animate-fade-in pointer-events-none"
                style={{
                  pointerEvents: 'none'
                }}
              >
                {getNodeDetails(selectedNode)}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-200 z-10">
            <div className="text-xs font-semibold text-gray-700 mb-2">Legend</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: nodeColors.congressman.Democratic }}></div>
                <span className="text-gray-600">Democratic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: nodeColors.congressman.Republican }}></div>
                <span className="text-gray-600">Republican</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gresearch-yellow"></div>
                <span className="text-gray-600">Bills</span>
              </div>
              <div className="pt-2 border-t border-gray-200 mt-2">
                <div className="text-gray-500 text-xs">Size = Activity/Support</div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 z-10">
            <div className="text-xs text-gray-600 space-y-1">
              <div>• Hover over nodes for details</div>
              <div>• Click to select</div>
              <div>• Right-click to deselect</div>
              <div>• Drag nodes to rearrange</div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default GraphPage;

