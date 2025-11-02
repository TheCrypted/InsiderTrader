import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import Header from '../components/Header';
import { graphNodes as mockGraphNodes, graphLinks as mockGraphLinks, nodeColors, sectorColors } from '../utils/graphData';
import { getRecentBills, getAllRepresentativesBasic, loadTradesForBatch, getGraphData } from '../utils/api';
import Container from '../components/shared/Container';
import LoadingSpinner from '../components/shared/LoadingSpinner';

const GraphPage = () => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'congressman', 'bill'
  const [loading, setLoading] = useState(true);
  const [apiNodes, setApiNodes] = useState([]);
  const [apiLinks, setApiLinks] = useState([]);

  // Fetch graph data from /graph endpoint
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching graph data from /graph endpoint...');
        
        // Fetch graph data from API (includes nodes and edges)
        // Don't pass any limits - let API return all available data
        const graphResponse = await getGraphData();
        
        if (graphResponse.nodes.length === 0 && graphResponse.edges.length === 0) {
          console.log('No graph data from API, using mock data as fallback');
          setApiNodes([]);
          setApiLinks([]);
          setLoading(false);
          return;
        }
        
        console.log(`Fetched ${graphResponse.nodes.length} nodes and ${graphResponse.edges.length} edges from /graph endpoint`);
        
        if (graphResponse.nodes.length === 0) {
          console.error('No nodes received from API!');
          setLoading(false);
          return;
        }
        
        // Transform API nodes to match expected format
        const transformedNodes = graphResponse.nodes.map((node) => {
          if (node.type === 'bill') {
            // Extract sector from policy_area or infer from label
            const policyArea = node.policy_area || '';
            const labelLower = (node.label || '').toLowerCase();
            let sector = 'General';
            if (policyArea.includes('Technology') || policyArea.includes('Science') || labelLower.includes('tech') || labelLower.includes('digital') || labelLower.includes('ai')) {
              sector = 'Technology';
            } else if (policyArea.includes('Health') || policyArea.includes('Medical') || labelLower.includes('health')) {
              sector = 'Healthcare';
            } else if (policyArea.includes('Energy') || policyArea.includes('Environment') || labelLower.includes('energy')) {
              sector = 'Energy';
            } else if (policyArea.includes('Finance') || policyArea.includes('Banking') || labelLower.includes('financial')) {
              sector = 'Financials';
            } else if (policyArea.includes('Defense') || policyArea.includes('Military') || labelLower.includes('defense')) {
              sector = 'Defense';
            } else if (policyArea.includes('Business') || labelLower.includes('business')) {
              sector = 'Business';
            }
            
            // Extract bill ID from id format "bill:S.1241"
            const billId = node.bill_id || node.id.replace('bill:', '');
            
            return {
              id: node.id, // Keep original id format for linking
              billId: billId, // Also store normalized bill ID
              type: 'bill',
              title: node.label || billId,
              status: 'Pending', // API doesn't provide status
              sector: sector,
              date: node.introduced_date || new Date().toISOString().split('T')[0],
              cosponsors: 0, // API doesn't provide in nodes
              policy_area: node.policy_area,
              corporateSupport: 0, // Not provided by API
              committees: [],
              size: 20, // Default size, can be calculated based on edges later
            };
          } else if (node.type === 'person') {
            // Extract bioguide_id from id format "person:G000359"
            const bioguideId = node.bioguide_id || node.id.replace('person:', '');
            
            // Parse name from label like "Sen. Graham, Lindsey [R-SC] (R-SC)"
            // Or "Rep. Smith, John [D-CA-5] (D-CA-5)"
            let name = 'Unknown';
            if (node.label) {
              // Try to extract name - usually before the first bracket or parenthesis
              const nameMatch = node.label.match(/^(Sen\.|Rep\.)\s+(.+?)(?:\s+\[|$)/);
              if (nameMatch && nameMatch[2]) {
                name = nameMatch[2].trim();
              } else {
                // Fallback: split by '(' or '[' and take first part
                name = node.label.split(/[\[\(]/)[0].replace(/^(Sen\.|Rep\.)\s+/, '').trim();
              }
            }
            
            // Map party: R -> Republican, D -> Democratic, I -> Independent, etc.
            let party = node.party;
            if (party === 'R') {
              party = 'Republican';
            } else if (party === 'D') {
              party = 'Democratic';
            } else if (party === 'I') {
              party = 'Independent';
            }
            
            // Determine chamber: district === null means Senate, otherwise House
            const chamber = node.district === null ? 'Senate' : 'House';
            
            return {
              id: node.id, // Keep original id format for linking (e.g., "person:G000359")
              bioguideId: bioguideId, // Store for fetching additional data (e.g., "G000359")
              type: 'congressman',
              name: name,
              party: party, // Full party name for color mapping
              chamber: chamber,
              state: node.state || 'Unknown',
              district: node.district,
              image: null, // Will be fetched separately if needed
              netWorth: 0, // Not provided by API
              tradeVolume: 0, // Not provided by API
              totalTrades: 0, // Not provided by API
              size: 15, // Default size, will be updated based on edge count
            };
          }
          console.warn(`Unknown node type: ${node.type}`, node);
          return null;
        }).filter(Boolean); // Remove any null entries
        
        console.log(`Transformed ${transformedNodes.length} nodes (filtered from ${graphResponse.nodes.length} original nodes)`);
        
        // Count edges per node to calculate sizes
        const nodeEdgeCounts = {};
        graphResponse.edges.forEach(edge => {
          nodeEdgeCounts[edge.source] = (nodeEdgeCounts[edge.source] || 0) + 1;
          nodeEdgeCounts[edge.target] = (nodeEdgeCounts[edge.target] || 0) + 1;
        });
        
        // Update node sizes based on edge connections
        transformedNodes.forEach(node => {
          const edgeCount = nodeEdgeCounts[node.id] || 0;
          if (node.type === 'bill') {
            node.size = Math.min(40, Math.max(15, 15 + edgeCount * 2));
          } else {
            node.size = Math.min(30, Math.max(10, 10 + edgeCount * 1.5));
          }
        });
        
        setApiNodes(transformedNodes);
        
        // Transform edges to match expected format
        const transformedLinks = graphResponse.edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          type: edge.relation || 'cosponsor', // 'sponsor' or 'cosponsor'
          strength: edge.relation === 'sponsor' ? 1.0 : 0.6, // Sponsor links stronger
        }));
        
        console.log(`Transformed ${transformedLinks.length} links (from ${graphResponse.edges.length} original edges)`);
        
        // Validate that link sources/targets exist in transformed nodes
        const nodeIdSet = new Set(transformedNodes.map(n => n.id));
        
        // Log sample node IDs and link IDs for debugging
        if (transformedNodes.length > 0) {
          console.log(`Sample node IDs (first 5):`, transformedNodes.slice(0, 5).map(n => n.id));
        }
        if (transformedLinks.length > 0) {
          console.log(`Sample link source/target IDs (first 5):`, transformedLinks.slice(0, 5).map(l => `${l.source} -> ${l.target}`));
        }
        
        // Check for format mismatches
        const sampleLink = transformedLinks[0];
        if (sampleLink) {
          const linkHasBillFormat = sampleLink.target?.startsWith('bill:') || sampleLink.source?.startsWith('bill:');
          const linkHasPersonFormat = sampleLink.target?.startsWith('person:') || sampleLink.source?.startsWith('person:');
          const nodeHasBillFormat = transformedNodes.some(n => n.id.startsWith('bill:'));
          const nodeHasPersonFormat = transformedNodes.some(n => n.id.startsWith('person:'));
          
          if ((linkHasBillFormat || linkHasPersonFormat) && (nodeHasBillFormat || nodeHasPersonFormat)) {
            console.log(`✓ Link and node ID formats match (using "bill:" and "person:" prefixes)`);
          } else {
            console.error(`❌ FORMAT MISMATCH! Links use "${sampleLink.source}" format, but nodes use different format!`);
          }
        }
        
        // Count how many links match vs don't match
        let validCount = 0;
        let invalidCount = 0;
        const firstInvalidLinks = [];
        
        const validLinks = transformedLinks.filter(link => {
          const hasSource = nodeIdSet.has(link.source);
          const hasTarget = nodeIdSet.has(link.target);
          if (!hasSource || !hasTarget) {
            invalidCount++;
            if (invalidCount <= 5) {
              firstInvalidLinks.push({ source: link.source, target: link.target, hasSource, hasTarget });
            }
            return false;
          }
          validCount++;
          return true;
        });
        
        if (invalidCount > 0) {
          console.error(`❌ ${invalidCount} invalid links found (${validCount} valid)!`);
          console.error(`   First 5 invalid links:`, firstInvalidLinks);
          console.error(`   Sample valid node IDs:`, Array.from(nodeIdSet).slice(0, 10));
        } else {
          console.log(`✓ All ${validLinks.length} links are valid!`);
        }
        
        // IMPORTANT: Only set links if we have valid ones, otherwise empty array
        // This prevents mixing API nodes with mock links later
        setApiLinks(validLinks);
        console.log(`Final: ${transformedNodes.length} nodes and ${validLinks.length} links`);
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
      // Group congressmen by party (handle both full names and abbreviations)
      const party = node.party || '';
      if (party === 'Democratic' || party === 'D') {
        return 'dem';
      } else if (party === 'Republican' || party === 'R') {
        return 'rep';
      } else if (party === 'Independent' || party === 'I') {
        return 'ind'; // Independent
      }
      return 'rep'; // Default to rep for unknown parties
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
      ind: { angle: Math.PI / 2, radius: 180 }, // Independent (smaller group)
      Technology: { angle: -Math.PI / 4, radius: 250 },
      Financials: { angle: -Math.PI / 2, radius: 250 },
      Energy: { angle: Math.PI / 2, radius: 250 },
      Healthcare: { angle: Math.PI, radius: 250 },
      Business: { angle: (5 * Math.PI) / 4, radius: 250 },
      Defense: { angle: (7 * Math.PI) / 4, radius: 250 },
      General: { angle: 0, radius: 250 },
      other: { angle: 0, radius: 200 }
    };
    return groups;
  }, []);

  // Prepare graph data with positions and relationships
  const graphData = useMemo(() => {
    // CRITICAL: NEVER mix API nodes with mock links or vice versa - they have different ID formats!
    // API nodes use IDs like "bill:S.1241", "person:G000359"
    // Mock links use IDs like "H.R.1234", "P000197" - they won't match!
    
    let combinedNodes, combinedLinks;
    
    console.log(`\n=== GRAPH DATA PREPARATION ===`);
    console.log(`API nodes: ${apiNodes.length}, API links: ${apiLinks.length}`);
    console.log(`Mock nodes: ${mockGraphNodes.length}, Mock links: ${mockGraphLinks.length}`);
    
    if (apiNodes.length > 0) {
      // We have API nodes - MUST use API links only (even if empty), NEVER mock links
      combinedNodes = apiNodes;
      combinedLinks = apiLinks; // Use API links even if empty (better than wrong format mock links)
      
      // Verify we're not accidentally using mock links
      if (apiLinks.length === 0 && mockGraphLinks.length > 0) {
        console.warn('⚠ WARNING: Have API nodes but NO valid API links. Using empty links array (NOT mock links).');
        console.warn(`  This means all ${apiLinks.length} API links were filtered out during validation.`);
        if (apiNodes.length > 0) {
          console.warn(`  Sample API node IDs:`, apiNodes.slice(0, 5).map(n => n.id));
        }
      } else if (apiLinks.length > 0) {
        console.log('✓ Using API nodes with API links (matching ID formats)');
      }
    } else {
      // No API nodes - use mock data (nodes + links have matching ID formats)
      combinedNodes = mockGraphNodes;
      combinedLinks = mockGraphLinks;
      console.log('Using MOCK data (API fetch may have failed or returned no data)');
    }
    
    // Final validation: Check if we're accidentally mixing formats
    if (combinedNodes.length > 0 && combinedLinks.length > 0) {
      const sampleNodeId = combinedNodes[0].id;
      const sampleLinkSource = combinedLinks[0].source;
      const hasPrefixMatch = (sampleNodeId.startsWith('bill:') || sampleNodeId.startsWith('person:')) === 
                             (sampleLinkSource.startsWith('bill:') || sampleLinkSource.startsWith('person:'));
      if (!hasPrefixMatch) {
        console.error(`❌ CRITICAL: Format mismatch detected!`);
        console.error(`   Node ID format: ${sampleNodeId}`);
        console.error(`   Link source format: ${sampleLinkSource}`);
        console.error(`   This will cause all links to be invalid!`);
      }
    }
    
    console.log(`Final: ${combinedNodes.length} nodes (${apiNodes.length > 0 ? 'API' : 'MOCK'}) and ${combinedLinks.length} links (${apiLinks.length > 0 ? 'API' : 'MOCK'})`);
    console.log(`=== END GRAPH DATA PREPARATION ===\n`);
    
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
          ? (nodeColors.congressman[node.party] || (node.party === 'Republican' || node.party === 'R' ? nodeColors.congressman.Republican : nodeColors.congressman.Democratic))
          : (sectorColors[node.sector] || nodeColors.bill),
        // Group for clustering
        group: group,
        // Add visual properties
        opacity: 1,
        strokeWidth: 2
      };
    });

    // Create a map of node IDs for quick lookup to validate links
    const nodeIdMap = new Map(combinedNodes.map(n => [n.id, n]));
    
    const links = combinedLinks
      .map(link => {
        // Ensure source and target are string IDs
        const sourceId = typeof link.source === 'string' ? link.source : (link.source?.id || link.source);
        const targetId = typeof link.target === 'string' ? link.target : (link.target?.id || link.target);
        
        // Only include links where both nodes exist (prevents broken links)
        if (!sourceId || !targetId) {
          console.warn(`Skipping link with missing IDs: source=${sourceId}, target=${targetId}`);
          return null;
        }
        if (!nodeIdMap.has(sourceId)) {
          console.warn(`Skipping link - source node missing: ${sourceId}`);
          return null;
        }
        if (!nodeIdMap.has(targetId)) {
          console.warn(`Skipping link - target node missing: ${targetId}`);
          return null;
        }
        
        return {
          ...link,
          source: sourceId,
          target: targetId,
          // Visual link properties
          opacity: (link.strength || 0.6) * 0.8
        };
      })
      .filter(Boolean); // Remove any null links

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
      return node.name || node.id.replace('person:', '');
    }
    // For bills, use billId if available, otherwise extract from id
    return node.billId || node.id.replace('bill:', '');
  };

  const getNodeDetails = (node) => {
    if (!node) return null;

    if (node.type === 'congressman') {
      // Use bioguideId for link if available, otherwise use id (which might be "person:XXXXX")
      const congressmanId = node.bioguideId || node.id.replace('person:', '');
      
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
              <div className="font-semibold text-gray-900">{node.netWorth > 0 ? formatCurrency(node.netWorth) : 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-500">Trade Volume:</span>
              <div className="font-semibold text-gray-900">{node.tradeVolume > 0 ? formatCurrency(node.tradeVolume) : 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-500">Total Trades:</span>
              <div className="font-semibold text-gray-900">{node.totalTrades > 0 ? node.totalTrades : 'N/A'}</div>
            </div>
            <div>
              <Link
                to={`/congressman/${congressmanId}/trading`}
                className="text-xs c-btn c-btn--yellow px-3 py-1 mt-2 inline-block"
              >
                View Profile →
              </Link>
            </div>
          </div>
        </div>
      );
    } else {
      // Use billId for link if available, otherwise extract from id (which might be "bill:S.1241")
      const billId = node.billId || node.id.replace('bill:', '').replace(/^HR\./, 'H.R.').replace(/^S\./, 'S.');
      
      return (
        <div className="p-4 bg-white rounded-lg shadow-lg border-2 border-gray-200 max-w-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{billId}</h3>
          <p className="text-sm text-gray-700 mb-3">{node.title}</p>
          <div className="space-y-2 text-sm border-t border-gray-200 pt-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className="font-medium text-gray-900">{node.status || 'Pending'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cosponsors:</span>
              <span className="font-medium text-gray-900">{node.cosponsors > 0 ? node.cosponsors : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sector:</span>
              <span className="font-medium text-gray-900">{node.sector || node.policy_area || 'General'}</span>
            </div>
            {node.policy_area && (
              <div className="flex justify-between">
                <span className="text-gray-500">Policy Area:</span>
                <span className="font-medium text-gray-900">{node.policy_area}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Date:</span>
              <span className="font-medium text-gray-900">
                {node.date ? new Date(node.date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="pt-2">
              <Link
                to={`/legislation/${billId}/bet`}
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
          <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
            <LoadingSpinner size="lg" />
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 mb-2">Constructing Knowledge Graph</p>
              <p className="text-sm text-gray-600">
                This may take up to 30 seconds while we fetch all bills, congressmen, and their relationships...
              </p>
            </div>
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
                <div className="text-gray-500 text-xs">Nodes: {filteredData.nodes.length} | Links: {filteredData.links.length}</div>
                <div className="text-gray-500 text-xs mt-1">Size = Activity/Support</div>
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

