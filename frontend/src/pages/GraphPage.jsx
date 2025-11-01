import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import Header from '../components/Header';
import { graphNodes as mockGraphNodes, graphLinks as mockGraphLinks, nodeColors, sectorColors } from '../utils/graphData';
import { getRecentBills, getAllRepresentativesBasic, loadTradesForBatch } from '../utils/api';
import Container from '../components/shared/Container';
import LoadingSpinner from '../components/shared/LoadingSpinner';

const GraphPage = () => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'congressman', 'bill'
  const [loading, setLoading] = useState(true);
  const [apiNodes, setApiNodes] = useState([]);
  const [apiLinks, setApiLinks] = useState([]);

  // Fetch API data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching graph data from APIs...');
        
        // Fetch bills and congressmen in parallel
        const [billsResponse, congressmenResponse] = await Promise.all([
          getRecentBills(),
          getAllRepresentativesBasic()
        ]);
        
        console.log(`Fetched ${billsResponse.length} bills and ${congressmenResponse.length} congressmen`);
        
        // Transform bills into graph node format
        const billNodes = billsResponse.map((bill, index) => {
          // Extract sector from title (simple heuristic - can be improved)
          const titleLower = (bill.title || '').toLowerCase();
          let sector = 'Business';
          if (titleLower.includes('tech') || titleLower.includes('digital') || titleLower.includes('data') || titleLower.includes('ai')) {
            sector = 'Technology';
          } else if (titleLower.includes('health') || titleLower.includes('medicare') || titleLower.includes('medical')) {
            sector = 'Healthcare';
          } else if (titleLower.includes('energy') || titleLower.includes('oil') || titleLower.includes('renewable')) {
            sector = 'Energy';
          } else if (titleLower.includes('financial') || titleLower.includes('bank') || titleLower.includes('tax')) {
            sector = 'Financials';
          } else if (titleLower.includes('defense') || titleLower.includes('military') || titleLower.includes('security')) {
            sector = 'Defense';
          }
          
          // Use bill_id as id, ensure it matches format
          const billId = bill.bill_id || `BILL${index}`;
          
          return {
            id: billId,
            type: 'bill',
            title: bill.title || 'Untitled Bill',
            status: bill.latest_action?.text || 'Pending',
            sector: sector,
            date: bill.latest_action?.date || new Date().toISOString().split('T')[0],
            cosponsors: Math.floor(Math.random() * 50) + 10, // Mock cosponsor count (API doesn't provide)
            corporateSupport: Math.floor(Math.random() * 2000000) + 500000, // Mock support
            committees: [], // Mock committees
            size: Math.floor(Math.random() * 30) + 20, // Size based on cosponsors
            url: bill.url
          };
        });
        
        // Transform congressmen into graph node format
        // First, get trade stats for a sample of congressmen (top 50 by activity for performance)
        const sampleSize = Math.min(50, congressmenResponse.length);
        const congressmenWithTrades = await loadTradesForBatch(
          congressmenResponse.slice(0, sampleSize)
        );
        
        // Map all congressmen, using trade stats where available
        const congressmanMap = new Map();
        congressmenWithTrades.forEach(rep => {
          congressmanMap.set(rep.id, rep);
        });
        
        const congressmanNodes = congressmenResponse.map((rep) => {
          const repWithTrades = congressmanMap.get(rep.id) || rep;
          
          // Calculate size based on trade volume and total trades
          const tradeVolume = repWithTrades.tradeVolume || 0;
          const totalTrades = repWithTrades.totalTrades || 0;
          const size = Math.min(50, Math.max(10, Math.sqrt(tradeVolume / 1000000) + (totalTrades / 5)));
          
          // Get net worth from mock data if available (API doesn't provide)
          const mockData = mockGraphNodes.find(n => n.type === 'congressman' && n.id === rep.id);
          
          return {
            id: rep.id,
            type: 'congressman',
            name: rep.name,
            party: rep.party,
            chamber: rep.chamber,
            state: rep.state,
            image: rep.image,
            netWorth: mockData?.netWorth || Math.floor(Math.random() * 50000000) + 1000000,
            tradeVolume: tradeVolume,
            totalTrades: totalTrades,
            size: size
          };
        });
        
        // Combine API nodes
        const allApiNodes = [...congressmanNodes, ...billNodes];
        setApiNodes(allApiNodes);
        
        // Create links between bills and congressmen
        // For now, create random connections (in the future, this could use actual sponsor/cosponsor data)
        const links = [];
        const apiCongressmanIds = congressmanNodes.map(c => c.id);
        const apiBillIds = billNodes.map(b => b.id);
        
        // Create some sponsor links (random assignment for now)
        apiBillIds.forEach((billId, index) => {
          if (apiCongressmanIds.length > 0) {
            const sponsorIndex = index % apiCongressmanIds.length;
            links.push({
              source: apiCongressmanIds[sponsorIndex],
              target: billId,
              type: 'sponsor',
              strength: 1.0
            });
            
            // Add a few random cosponsors per bill
            const numCosponsors = Math.floor(Math.random() * 5) + 2;
            for (let i = 0; i < numCosponsors && i < apiCongressmanIds.length - 1; i++) {
              const cosponsorIndex = (sponsorIndex + i + 1) % apiCongressmanIds.length;
              links.push({
                source: apiCongressmanIds[cosponsorIndex],
                target: billId,
                type: 'cosponsor',
                strength: 0.5 + Math.random() * 0.3
              });
            }
          }
        });
        
        setApiLinks(links);
        console.log(`Created ${links.length} links between ${allApiNodes.length} nodes`);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching graph data:', error);
        setLoading(false);
        // Fall back to empty arrays (will use mock data)
        setApiNodes([]);
        setApiLinks([]);
      }
    };
    
    fetchData();
  }, []);

  // Group nodes for better clustering
  const getNodeGroup = (node) => {
    if (node.type === 'congressman') {
      // Group congressmen by party
      return node.party === 'Democratic' ? 'dem' : 'rep';
    } else {
      // Group bills by sector
      return node.sector || 'other';
    }
  };

  // Calculate group positions (circular layout around center)
  const groupPositions = useMemo(() => {
    const groups = {
      dem: { angle: Math.PI / 4, radius: 200 },
      rep: { angle: (3 * Math.PI) / 4, radius: 200 },
      Technology: { angle: -Math.PI / 4, radius: 250 },
      Financials: { angle: -Math.PI / 2, radius: 250 },
      Energy: { angle: Math.PI / 2, radius: 250 },
      Healthcare: { angle: Math.PI, radius: 250 },
      Business: { angle: (5 * Math.PI) / 4, radius: 250 },
      Defense: { angle: (7 * Math.PI) / 4, radius: 250 },
      other: { angle: 0, radius: 200 }
    };
    return groups;
  }, []);

  // Prepare graph data with positions and relationships
  const graphData = useMemo(() => {
    // Combine API nodes with mock nodes (prioritize API data, fall back to mock)
    const combinedNodes = apiNodes.length > 0 ? apiNodes : mockGraphNodes;
    const combinedLinks = apiLinks.length > 0 ? apiLinks : mockGraphLinks;
    
    // Normalize node sizes (scale between 8 and 40)
    const sizes = combinedNodes.map(n => n.size || 10);
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    const normalizeSize = (size) => {
      if (maxSize === minSize) return 20;
      return 8 + ((size - minSize) / (maxSize - minSize)) * 32;
    };

    // Count nodes per group for positioning
    const groupCounts = {};
    combinedNodes.forEach(node => {
      const group = getNodeGroup(node);
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    });

    let groupIndices = {};
    const nodes = combinedNodes.map(node => {
      const group = getNodeGroup(node);
      const groupIdx = groupIndices[group] || 0;
      groupIndices[group] = groupIdx + 1;
      
      // Calculate position in group (circular arrangement)
      const groupPos = groupPositions[group] || groupPositions.other;
      const nodesInGroup = groupCounts[group] || 1;
      const angleOffset = (2 * Math.PI * groupIdx) / nodesInGroup;
      const angle = groupPos.angle + angleOffset;
      
      // Add some random scatter within group
      const scatterRadius = 30 + Math.random() * 20;
      const scatterAngle = Math.random() * 2 * Math.PI;
      
      const centerX = 400; // Center of canvas (assuming ~800px width)
      const centerY = 300; // Center of canvas (assuming ~600px height)
      
      const x = centerX + Math.cos(angle) * groupPos.radius + Math.cos(scatterAngle) * scatterRadius;
      const y = centerY + Math.sin(angle) * groupPos.radius + Math.sin(scatterAngle) * scatterRadius;

      return {
        ...node,
        // Initial positions based on grouping
        x,
        y,
        // Normalized size
        normalizedSize: normalizeSize(node.size || 10),
        // Color based on type
        color: node.type === 'congressman' 
          ? nodeColors.congressman[node.party]
          : sectorColors[node.sector] || nodeColors.bill,
        // Group for clustering
        group: group,
        // Add visual properties
        opacity: 1,
        strokeWidth: 2
      };
    });

    const links = combinedLinks.map(link => ({
      ...link,
      source: typeof link.source === 'string' ? link.source : link.source.id,
      target: typeof link.target === 'string' ? link.target : link.target.id,
      // Visual link properties
      opacity: link.strength * 0.8
    }));

    return { nodes, links };
  }, [groupPositions, apiNodes, apiLinks]);

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

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="min-h-screen bg-gresearch-grey-200">
        <Header />
        <Container>
          <div className="flex items-center justify-center min-h-[80vh]">
            <LoadingSpinner size="lg" />
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gresearch-grey-200">
      <Header />
      <div className="py-8">
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
              // Enhanced force simulation parameters for better physics
              nodeRepulsion={d => {
                const baseSize = d.normalizedSize || 15;
                // Strong repulsion but not so strong it prevents dragging
                // Reduced from 800 to allow more natural movement
                return -baseSize * 500;
              }}
              linkDistance={link => {
                const sourceNode = typeof link.source === 'object' ? link.source : filteredData.nodes.find(n => n.id === link.source);
                const targetNode = typeof link.target === 'object' ? link.target : filteredData.nodes.find(n => n.id === link.target);
                const sourceSize = sourceNode?.normalizedSize || 15;
                const targetSize = targetNode?.normalizedSize || 15;
                // Minimum distance is sum of radii + padding
                return (sourceSize + targetSize) * 2.5 + 120;
              }}
              linkStrength={link => {
                // Lighter link strength so nodes can be dragged without snapping back
                return (link.strength || 0.5) * 0.2;
              }}
              // Add many-body force for better spacing
              warmupTicks={100}
              cooldownTicks={200}
              // Enable node dragging - keep nodes where user drags them
              onNodeDrag={node => {
                if (node) {
                  // Fix position while dragging
                  node.fx = node.x;
                  node.fy = node.y;
                }
              }}
              onNodeDragEnd={node => {
                if (node) {
                  // Keep node fixed at dragged position so it stays where user puts it
                  node.fx = node.x;
                  node.fy = node.y;
                  // Mark as user-positioned
                  node.userPositioned = true;
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
              onNodeClick={(node, event) => {
                // Double-click to unlock node position (allow physics to move it again)
                if (event.detail === 2 && node.userPositioned) {
                  node.fx = null;
                  node.fy = null;
                  node.userPositioned = false;
                } else {
                  handleNodeClick(node);
                }
              }}
              onNodeRightClick={(node, event) => {
                event.preventDefault();
                // Right-click to unlock node position
                if (node.userPositioned) {
                  node.fx = null;
                  node.fy = null;
                  node.userPositioned = false;
                } else {
                  setSelectedNode(null);
                }
              }}
              onEngineStop={() => {
                // Graph settled - allow more iterations for better layout
              }}
            />
            
            {/* Hover Tooltip */}
            {hoveredNode && (
              <div 
                className="absolute top-4 right-4 z-10 animate-fade-in"
                style={{
                  pointerEvents: 'auto'
                }}
              >
                {getNodeDetails(hoveredNode)}
              </div>
            )}

            {/* Selected Node Details */}
            {selectedNode && !hoveredNode && (
              <div 
                className="absolute top-4 right-4 z-10 animate-fade-in"
                style={{
                  pointerEvents: 'auto'
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
              <div>• Drag nodes to rearrange (stays in place)</div>
              <div>• Double-click or right-click to unlock</div>
            </div>
          </div>
        </div>
      </Container>
      </div>
    </div>
  );
};

export default GraphPage;

