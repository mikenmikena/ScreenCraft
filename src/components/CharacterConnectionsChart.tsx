import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CharacterRelationshipEdge,
  CharacterRelationshipPolarity,
  StoryProject,
} from '../types/story';
import {
  buildCharacterConnectionsGraph,
  canonicalPairKey,
  CharacterConnectionEdgeModel,
  CharacterGraphNode,
  computeRadialNodePositions,
  NODE_CARD_HEIGHT,
  NODE_CARD_WIDTH,
  normalizeCharacterName,
  POLARITY_META,
} from '../utils/characterConnections';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Compass,
  Eye,
  GitBranch,
  Link2,
  Maximize2,
  Network,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  Users,
  X,
  ZoomIn,
  ZoomOut,
  Heart,
  Crown,
} from 'lucide-react';

interface CharacterConnectionsChartProps {
  project: StoryProject;
  onUpdateRelationships: (relationships: CharacterRelationshipEdge[]) => void;
  onUpdateNodePositions: (positions: Record<string, { x: number; y: number }>) => void;
  onUpdateEdgePositions?: (positions: Record<string, { x: number; y: number }>) => void;
  onSelectScene: (sceneId: string) => void;
  onOpenCharacterBios?: () => void;
}

type PolarityFilter = 'all' | 'authored' | 'script_only' | CharacterRelationshipPolarity;

const POLARITY_ORDER: CharacterRelationshipPolarity[] = [
  'conflict',
  'alliance',
  'hierarchy',
  'emotional',
  'mystery',
  'neutral',
];

const getPolarityIcon = (polarity: CharacterRelationshipPolarity, className = 'w-3.5 h-3.5') => {
  switch (polarity) {
    case 'conflict':
      return <Swords className={className} />;
    case 'alliance':
      return <Shield className={className} />;
    case 'hierarchy':
      return <Crown className={className} />;
    case 'emotional':
      return <Heart className={className} />;
    case 'mystery':
      return <Eye className={className} />;
    case 'neutral':
    default:
      return <GitBranch className={className} />;
  }
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const CharacterConnectionsChart: React.FC<CharacterConnectionsChartProps> = ({
  project,
  onUpdateRelationships,
  onUpdateNodePositions,
  onUpdateEdgePositions,
  onSelectScene,
  onOpenCharacterBios,
}) => {
  const [sceneFilterId, setSceneFilterId] = useState<string>('all');
  const [polarityFilter, setPolarityFilter] = useState<PolarityFilter>('all');
  const [viewport, setViewport] = useState<{ panX: number; panY: number; scale: number }>({
    panX: 0,
    panY: 0,
    scale: 1,
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef<number>(1);
  scaleRef.current = viewport.scale;

  const [selectedNodeName, setSelectedNodeName] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [linkingFromNode, setLinkingFromNode] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add Relationship quick modal state
  const [newSourceChar, setNewSourceChar] = useState<string>('');
  const [newTargetChar, setNewTargetChar] = useState<string>('');
  const [newPolarity, setNewPolarity] = useState<CharacterRelationshipPolarity>('conflict');
  const [newDirection, setNewDirection] =
    useState<CharacterRelationshipEdge['direction']>('mutual');
  const [newLabel, setNewLabel] = useState('');
  const [newStoryDriver, setNewStoryDriver] = useState('');

  // Smooth local drag overrides before committing on pointerup (nodes + edge descriptors + canvas pan)
  const [dragOverrides, setDragOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [edgeDragOverrides, setEdgeDragOverrides] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [localEdgePositions, setLocalEdgePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const dragStateRef = useRef<{
    name: string;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const edgeDragStateRef = useRef<{
    pairKey: string;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const panStateRef = useRef<{
    startClientX: number;
    startClientY: number;
    originPanX: number;
    originPanY: number;
    moved: boolean;
  } | null>(null);
  const suppressEdgeClickPairRef = useRef<string | null>(null);
  const suppressNodeClickNameRef = useRef<string | null>(null);
  const suppressCanvasClickRef = useRef<boolean>(false);

  const graph = useMemo(
    () => buildCharacterConnectionsGraph(project, sceneFilterId),
    [project, sceneFilterId]
  );

  // Apply drag overrides live
  const displayNodes = useMemo(() => {
    return graph.nodes.map((node) => {
      const override = dragOverrides[node.name];
      return override ? { ...node, x: override.x, y: override.y } : node;
    });
  }, [graph.nodes, dragOverrides]);

  const nodeByName = useMemo(() => {
    const map = new Map<string, CharacterGraphNode>();
    displayNodes.forEach((n) => map.set(n.name, n));
    return map;
  }, [displayNodes]);

  const filteredEdges = useMemo(() => {
    return graph.edges.filter((edge) => {
      if (polarityFilter === 'all') return true;
      if (polarityFilter === 'authored') return edge.isAuthored;
      if (polarityFilter === 'script_only') return !edge.isAuthored;
      return edge.polarity === polarityFilter;
    });
  }, [graph.edges, polarityFilter]);

  const selectedEdge: CharacterConnectionEdgeModel | null = useMemo(() => {
    if (!selectedEdgeId) return null;
    return graph.edges.find((e) => e.id === selectedEdgeId) || null;
  }, [graph.edges, selectedEdgeId]);

  const selectedNode: CharacterGraphNode | null = useMemo(() => {
    if (!selectedNodeName) return null;
    return nodeByName.get(selectedNodeName) || null;
  }, [nodeByName, selectedNodeName]);

  // Cancel linking mode on Escape
  useEffect(() => {
    if (!linkingFromNode) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLinkingFromNode(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [linkingFromNode]);

  const effectiveSavedEdgePositions = project.characterEdgePositions || localEdgePositions;

  // Smooth mouse-wheel / trackpad zoom centered at cursor position (20% - 250%)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;

      setViewport((prev) => {
        const nextScale = Math.min(2.5, Math.max(0.2, prev.scale * factor));
        const worldX = (cursorX - prev.panX) / prev.scale;
        const worldY = (cursorY - prev.panY) / prev.scale;
        return {
          scale: nextScale,
          panX: cursorX - worldX * nextScale,
          panY: cursorY - worldY * nextScale,
        };
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Global pointer drag handling for infinite node, edge descriptor, and canvas pan repositioning
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const currentScale = scaleRef.current || 1;

      const drag = dragStateRef.current;
      if (drag) {
        const dx = (e.clientX - drag.startClientX) / currentScale;
        const dy = (e.clientY - drag.startClientY) / currentScale;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          drag.moved = true;
        }
        const nextX = Math.round(drag.originX + dx);
        const nextY = Math.round(drag.originY + dy);
        setDragOverrides((prev) => ({
          ...prev,
          [drag.name]: { x: nextX, y: nextY },
        }));
      }

      const edgeDrag = edgeDragStateRef.current;
      if (edgeDrag) {
        const dx = (e.clientX - edgeDrag.startClientX) / currentScale;
        const dy = (e.clientY - edgeDrag.startClientY) / currentScale;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          edgeDrag.moved = true;
        }
        const nextX = Math.round(edgeDrag.originX + dx);
        const nextY = Math.round(edgeDrag.originY + dy);
        setEdgeDragOverrides((prev) => ({
          ...prev,
          [edgeDrag.pairKey]: { x: nextX, y: nextY },
        }));
      }

      const pan = panStateRef.current;
      if (pan) {
        const dx = e.clientX - pan.startClientX;
        const dy = e.clientY - pan.startClientY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          pan.moved = true;
        }
        setViewport((prev) => ({
          ...prev,
          panX: pan.originPanX + dx,
          panY: pan.originPanY + dy,
        }));
      }
    };

    const handlePointerUp = () => {
      const drag = dragStateRef.current;
      if (drag) {
        dragStateRef.current = null;
        if (drag.moved) {
          suppressNodeClickNameRef.current = drag.name;
          setDragOverrides((current) => {
            const finalPos = current[drag.name];
            if (finalPos) {
              onUpdateNodePositions({
                ...(project.characterNodePositions || {}),
                ...current,
              });
            }
            return {};
          });
        } else {
          setDragOverrides({});
        }
      }

      const edgeDrag = edgeDragStateRef.current;
      if (edgeDrag) {
        edgeDragStateRef.current = null;
        if (edgeDrag.moved) {
          suppressEdgeClickPairRef.current = edgeDrag.pairKey;
          setEdgeDragOverrides((current) => {
            const finalPos = current[edgeDrag.pairKey];
            if (finalPos) {
              const merged = {
                ...(project.characterEdgePositions || localEdgePositions),
                ...current,
              };
              setLocalEdgePositions(merged);
              onUpdateEdgePositions?.(merged);
            }
            return {};
          });
        } else {
          setEdgeDragOverrides({});
        }
      }

      const pan = panStateRef.current;
      if (pan) {
        panStateRef.current = null;
        if (pan.moved) {
          suppressCanvasClickRef.current = true;
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    onUpdateNodePositions,
    onUpdateEdgePositions,
    project.characterNodePositions,
    project.characterEdgePositions,
    localEdgePositions,
  ]);

  // Persist or promote an edge update
  const upsertEdge = (
    edge: CharacterConnectionEdgeModel,
    patch: Partial<CharacterRelationshipEdge>
  ) => {
    const existingList = project.characterRelationships || [];
    const nowIso = new Date().toISOString();

    if (edge.isAuthored) {
      const updated = existingList.map((item) =>
        item.id === edge.id ? { ...item, ...patch, updatedAt: nowIso } : item
      );
      onUpdateRelationships(updated);
      return edge.id;
    }

    // Promoting a script-derived interaction to an authored story relationship
    const newId = `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newRel: CharacterRelationshipEdge = {
      id: newId,
      sourceCharacter: edge.sourceCharacter,
      targetCharacter: edge.targetCharacter,
      label: patch.label ?? edge.label,
      polarity: patch.polarity ?? (edge.polarity === 'neutral' ? 'conflict' : edge.polarity),
      direction: patch.direction ?? edge.direction,
      storyDriver: patch.storyDriver ?? edge.storyDriver,
      arcShift: patch.arcShift ?? edge.arcShift,
      updatedAt: nowIso,
    };
    onUpdateRelationships([...existingList, newRel]);
    setSelectedEdgeId(newId);
    return newId;
  };

  const removeAuthoredEdge = (edgeId: string) => {
    const next = (project.characterRelationships || []).filter((r) => r.id !== edgeId);
    onUpdateRelationships(next);
    setSelectedEdgeId(null);
  };

  const connectCharacters = (
    sourceRaw: string,
    targetRaw: string,
    options?: {
      polarity?: CharacterRelationshipPolarity;
      direction?: CharacterRelationshipEdge['direction'];
      label?: string;
      storyDriver?: string;
    }
  ) => {
    const source = normalizeCharacterName(sourceRaw);
    const target = normalizeCharacterName(targetRaw);
    if (!source || !target || source === target) return;

    const pKey = canonicalPairKey(source, target);
    const existingEdge = graph.edges.find((e) => e.pairKey === pKey);

    if (existingEdge) {
      const promotedId = upsertEdge(existingEdge, {
        ...(options?.polarity ? { polarity: options.polarity } : {}),
        ...(options?.direction ? { direction: options.direction } : {}),
        ...(options?.label ? { label: options.label } : {}),
        ...(options?.storyDriver ? { storyDriver: options.storyDriver } : {}),
      });
      setSelectedNodeName(null);
      setSelectedEdgeId(promotedId);
      return;
    }

    const newId = `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newRel: CharacterRelationshipEdge = {
      id: newId,
      sourceCharacter: source,
      targetCharacter: target,
      label: options?.label?.trim() || 'Narrative Dynamic',
      polarity: options?.polarity || 'conflict',
      direction: options?.direction || 'mutual',
      storyDriver: options?.storyDriver?.trim() || '',
      updatedAt: new Date().toISOString(),
    };
    onUpdateRelationships([...(project.characterRelationships || []), newRel]);
    setSelectedNodeName(null);
    setSelectedEdgeId(newId);
  };

  const handleNodeClick = (node: CharacterGraphNode) => {
    if (linkingFromNode) {
      if (linkingFromNode !== node.name) {
        connectCharacters(linkingFromNode, node.name);
      }
      setLinkingFromNode(null);
      return;
    }
    setSelectedEdgeId(null);
    setSelectedNodeName(node.name);
  };

  const handleAutoArrange = () => {
    const names = graph.nodes.map((n) => n.name);
    const arranged = computeRadialNodePositions(names);
    setDragOverrides({});
    setEdgeDragOverrides({});
    setLocalEdgePositions({});
    onUpdateNodePositions(arranged);
    onUpdateEdgePositions?.({});
    setViewport({ panX: 0, panY: 0, scale: 1 });
  };

  const zoomAtCenter = (factor: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : 420;
    const cy = rect ? rect.height / 2 : 280;
    setViewport((prev) => {
      const nextScale = Math.min(2.5, Math.max(0.2, prev.scale * factor));
      const worldX = (cx - prev.panX) / prev.scale;
      const worldY = (cy - prev.panY) / prev.scale;
      return {
        scale: nextScale,
        panX: cx - worldX * nextScale,
        panY: cy - worldY * nextScale,
      };
    });
  };

  const handleFitView = () => {
    if (displayNodes.length === 0) {
      setViewport({ panX: 0, panY: 0, scale: 1 });
      return;
    }
    const rect = viewportRef.current?.getBoundingClientRect();
    const vw = rect?.width || 840;
    const vh = rect?.height || 560;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    displayNodes.forEach((n) => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + NODE_CARD_WIDTH);
      maxY = Math.max(maxY, n.y + NODE_CARD_HEIGHT);
    });
    const padding = 64;
    const contentW = Math.max(200, maxX - minX + padding * 2);
    const contentH = Math.max(160, maxY - minY + padding * 2);
    const nextScale = Math.min(1.5, Math.max(0.2, Math.min(vw / contentW, vh / contentH)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setViewport({
      scale: nextScale,
      panX: vw / 2 - centerX * nextScale,
      panY: vh / 2 - centerY * nextScale,
    });
  };

  const handleResetEdgeDescriptorPosition = (pairKey: string) => {
    const next = { ...(project.characterEdgePositions || localEdgePositions) };
    delete next[pairKey];
    setLocalEdgePositions(next);
    onUpdateEdgePositions?.(next);
  };

  const handleOpenAddModal = (prefillSource?: string) => {
    const names = graph.nodes.map((n) => n.name);
    const src = prefillSource || selectedNodeName || names[0] || '';
    const tgt = names.find((n) => n !== src) || '';
    setNewSourceChar(src);
    setNewTargetChar(tgt);
    setNewPolarity('conflict');
    setNewDirection('mutual');
    setNewLabel('');
    setNewStoryDriver('');
    setIsAddModalOpen(true);
  };

  const handleSubmitNewRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceChar || !newTargetChar || newSourceChar === newTargetChar) return;
    connectCharacters(newSourceChar, newTargetChar, {
      polarity: newPolarity,
      direction: newDirection,
      label: newLabel.trim() || POLARITY_META[newPolarity].label,
      storyDriver: newStoryDriver.trim(),
    });
    setIsAddModalOpen(false);
  };

  // Compute curved SVG geometry between two node centers
  const getEdgeGeometry = (edge: CharacterConnectionEdgeModel, edgeIndex: number) => {
    const srcNode = nodeByName.get(edge.sourceCharacter);
    const tgtNode = nodeByName.get(edge.targetCharacter);
    if (!srcNode || !tgtNode) return null;

    const x1 = srcNode.x + NODE_CARD_WIDTH / 2;
    const y1 = srcNode.y + NODE_CARD_HEIGHT / 2;
    const x2 = tgtNode.x + NODE_CARD_WIDTH / 2;
    const y2 = tgtNode.y + NODE_CARD_HEIGHT / 2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;

    // Gentle curve alternating side subtly so crossing links separate visually
    const curveMagnitude = (edgeIndex % 2 === 0 ? 1 : -1) * Math.min(34, dist * 0.1);
    const mx = (x1 + x2) / 2 + nx * curveMagnitude;
    const my = (y1 + y2) / 2 + ny * curveMagnitude;

    // Trim endpoint slightly from center toward card boundary so arrowheads sit visibly outside card center
    const trimEnd = (ax: number, ay: number, bx: number, by: number, distOffset: number) => {
      const vx = bx - ax;
      const vy = by - ay;
      const len = Math.hypot(vx, vy) || 1;
      return {
        x: bx - (vx / len) * Math.min(distOffset, len * 0.38),
        y: by - (vy / len) * Math.min(distOffset, len * 0.38),
      };
    };

    const startTrimmed =
      edge.direction === 'target_to_source'
        ? trimEnd(mx, my, x1, y1, 56)
        : { x: x1, y: y1 };
    const endTrimmed =
      edge.direction === 'source_to_target'
        ? trimEnd(mx, my, x2, y2, 56)
        : { x: x2, y: y2 };

    const pathD = `M ${startTrimmed.x} ${startTrimmed.y} Q ${mx} ${my} ${endTrimmed.x} ${endTrimmed.y}`;

    // Quadratic Bezier midpoint at t=0.5
    const labelX = 0.25 * startTrimmed.x + 0.5 * mx + 0.25 * endTrimmed.x;
    const labelY = 0.25 * startTrimmed.y + 0.5 * my + 0.25 * endTrimmed.y;

    return { pathD, labelX, labelY };
  };

  const zoomPercent = Math.round(viewport.scale * 100);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#18181a] text-gray-200 text-xs select-none">
      {/* Control Toolbar */}
      <div className="bg-[#232326] border-b border-[#343438] px-4 py-2 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-gray-100 font-semibold pr-2 border-r border-[#38383d]">
            <Network className="w-4 h-4 text-[#ff8000]" />
            <span>Character Interactions & Story Cohesion</span>
          </div>

          {/* Scene Filter */}
          <select
            value={sceneFilterId}
            onChange={(e) => setSceneFilterId(e.target.value)}
            className="bg-[#161618] border border-[#3a3a40] rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-[#ff8000] max-w-[230px]"
            title="Filter interactions by scene"
          >
            <option value="all">All Scenes ({project.scenes.length})</option>
            {project.scenes.map((sc) => (
              <option key={sc.id} value={sc.id}>
                Sc. {sc.sceneNumber} — {sc.setting}
              </option>
            ))}
          </select>

          {/* Polarity & Source Filter */}
          <div className="flex items-center p-0.5 bg-[#161618] rounded border border-[#38383d]">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'conflict', label: 'Conflict' },
                { id: 'alliance', label: 'Alliance' },
                { id: 'hierarchy', label: 'Hierarchy' },
                { id: 'emotional', label: 'Bond' },
                { id: 'script_only', label: 'Unlinked Script' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPolarityFilter(f.id)}
                className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
                  polarityFilter === f.id
                    ? 'bg-[#2c2c31] text-[#ff8000] font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            disabled={graph.nodes.length < 2}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-black font-semibold rounded transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Relationship</span>
          </button>

          <button
            type="button"
            onClick={handleAutoArrange}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#2a2a2e] hover:bg-[#34343a] border border-[#3f3f46] rounded text-gray-200 transition-colors whitespace-nowrap"
            title="Reset character nodes into a balanced radial layout"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auto-Arrange</span>
          </button>

          <div className="flex items-center bg-[#161618] border border-[#3a3a40] rounded px-1 py-0.5 tabular-nums">
            <button
              type="button"
              onClick={() => zoomAtCenter(0.85)}
              className="p-1 text-gray-400 hover:text-white"
              title="Zoom out (or scroll wheel down)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport({ panX: 0, panY: 0, scale: 1 })}
              className="px-1.5 text-[11px] text-gray-300 font-mono hover:text-[#ff8000] min-w-[44px]"
              title="Reset zoom to 100% & origin"
            >
              {zoomPercent}%
            </button>
            <button
              type="button"
              onClick={() => zoomAtCenter(1.18)}
              className="p-1 text-gray-400 hover:text-white"
              title="Zoom in (or scroll wheel up)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-[#33333a] mx-1" />
            <button
              type="button"
              onClick={handleFitView}
              className="px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 hover:text-white hover:bg-[#24242a] rounded"
              title="Fit all character nodes into view"
            >
              Fit
            </button>
          </div>
        </div>
      </div>

      {/* Linking Banner when user clicks "Link" on a node */}
      {linkingFromNode && (
        <div className="bg-[#2c2114] border-b border-[#ff8000]/60 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-[#ff8000]" />
            <span>
              Select any target character node on the canvas to connect with{' '}
              <strong className="text-white">{linkingFromNode}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setLinkingFromNode(null)}
            className="text-amber-300 hover:text-white flex items-center gap-1 text-[11px]"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel (Esc)</span>
          </button>
        </div>
      )}

      {/* Main Split Workspace: Interactive Node Canvas + Story Cohesion Inspector */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Infinite Pan & Zoom Node-Based Canvas */}
        <div
          ref={viewportRef}
          className="flex-1 overflow-hidden relative bg-[#121214] cursor-grab active:cursor-grabbing"
          style={{
            backgroundImage: 'radial-gradient(#27272c 1px, transparent 1px)',
            backgroundSize: `${Math.max(8, 22 * viewport.scale)}px ${Math.max(
              8,
              22 * viewport.scale
            )}px`,
            backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
          }}
          onPointerDown={(e) => {
            // Pan when dragging empty canvas background or middle mouse button
            if (e.button === 1 || e.target === e.currentTarget) {
              panStateRef.current = {
                startClientX: e.clientX,
                startClientY: e.clientY,
                originPanX: viewport.panX,
                originPanY: viewport.panY,
                moved: false,
              };
            }
          }}
          onClick={(e) => {
            if (suppressCanvasClickRef.current) {
              suppressCanvasClickRef.current = false;
              return;
            }
            if (e.target === e.currentTarget) {
              setSelectedEdgeId(null);
              setSelectedNodeName(null);
            }
          }}
        >
          {graph.nodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400 space-y-2">
              <Users className="w-10 h-10 text-gray-600" />
              <p className="text-sm font-medium text-gray-200">
                No characters detected in this scope
              </p>
              <p className="text-xs text-gray-500 max-w-md">
                Add speaking characters or scene assignments in the screenplay editor to populate the interaction graph automatically.
              </p>
            </div>
          ) : (
            <div
              className="absolute left-0 top-0 origin-top-left pointer-events-none"
              style={{
                transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.scale})`,
              }}
            >
              {/* Unclipped Infinite World SVG Edges Layer */}
              <svg
                width={1}
                height={1}
                className="absolute left-0 top-0 overflow-visible pointer-events-none"
              >
                  <defs>
                    {POLARITY_ORDER.map((pol) => (
                      <React.Fragment key={pol}>
                        <marker
                          id={`arrow-end-${pol}`}
                          markerWidth="9"
                          markerHeight="9"
                          refX="8"
                          refY="4.5"
                          orient="auto"
                        >
                          <path d="M 0 1 L 8 4.5 L 0 8 z" fill={POLARITY_META[pol].stroke} />
                        </marker>
                        <marker
                          id={`arrow-start-${pol}`}
                          markerWidth="9"
                          markerHeight="9"
                          refX="1"
                          refY="4.5"
                          orient="auto"
                        >
                          <path d="M 8 1 L 0 4.5 L 8 8 z" fill={POLARITY_META[pol].stroke} />
                        </marker>
                      </React.Fragment>
                    ))}
                  </defs>

                  {filteredEdges.map((edge, idx) => {
                    const geom = getEdgeGeometry(edge, idx);
                    if (!geom) return null;
                    const meta = POLARITY_META[edge.polarity];
                    const isSelected = selectedEdge?.id === edge.id;
                    const isConnectedToSelectedNode =
                      selectedNodeName &&
                      (edge.sourceCharacter === selectedNodeName ||
                        edge.targetCharacter === selectedNodeName);
                    const dimmed =
                      (selectedNodeName && !isConnectedToSelectedNode) ||
                      (selectedEdge && !isSelected);

                    const baseStroke = isSelected
                      ? 3.5
                      : Math.min(3.5, 1.8 + edge.sharedScenes.length * 0.35);

                    const customDescPos =
                      edgeDragOverrides[edge.pairKey] || effectiveSavedEdgePositions[edge.pairKey];
                    const descX = customDescPos ? customDescPos.x : geom.labelX;
                    const descY = customDescPos ? customDescPos.y : geom.labelY;
                    const leaderDist = Math.hypot(descX - geom.labelX, descY - geom.labelY);

                    return (
                      <g
                        key={edge.id}
                        className="pointer-events-auto cursor-pointer"
                        style={{ opacity: dimmed ? 0.28 : 1, transition: 'opacity 150ms' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNodeName(null);
                          setSelectedEdgeId(edge.id);
                        }}
                      >
                        {/* Invisible wide hit target */}
                        <path
                          d={geom.pathD}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={16}
                        />
                        {/* Visible edge */}
                        <path
                          d={geom.pathD}
                          fill="none"
                          stroke={isSelected ? '#ff8000' : meta.stroke}
                          strokeWidth={baseStroke}
                          strokeDasharray={edge.isAuthored ? undefined : '6 4'}
                          markerEnd={
                            edge.direction === 'source_to_target'
                              ? `url(#arrow-end-${edge.polarity})`
                              : undefined
                          }
                          markerStart={
                            edge.direction === 'target_to_source'
                              ? `url(#arrow-start-${edge.polarity})`
                              : undefined
                          }
                        />
                        {/* Subtle leader tether when relationship descriptor is repositioned */}
                        {leaderDist > 14 && (
                          <>
                            <line
                              x1={geom.labelX}
                              y1={geom.labelY}
                              x2={descX}
                              y2={descY}
                              stroke={isSelected ? '#ff8000' : meta.stroke}
                              strokeWidth={1.25}
                              strokeDasharray="3 3"
                              opacity={0.75}
                            />
                            <circle
                              cx={geom.labelX}
                              cy={geom.labelY}
                              r={3}
                              fill={isSelected ? '#ff8000' : meta.stroke}
                              opacity={0.85}
                            />
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Draggable Edge Connection Descriptors */}
                {filteredEdges.map((edge, idx) => {
                  const geom = getEdgeGeometry(edge, idx);
                  if (!geom) return null;
                  const meta = POLARITY_META[edge.polarity];
                  const isSelected = selectedEdge?.id === edge.id;
                  const isConnectedToSelectedNode =
                    selectedNodeName &&
                    (edge.sourceCharacter === selectedNodeName ||
                      edge.targetCharacter === selectedNodeName);
                  const dimmed =
                    (selectedNodeName && !isConnectedToSelectedNode) ||
                    (selectedEdge && !isSelected);
                  const customDescPos =
                    edgeDragOverrides[edge.pairKey] || effectiveSavedEdgePositions[edge.pairKey];
                  const descX = customDescPos ? customDescPos.x : geom.labelX;
                  const descY = customDescPos ? customDescPos.y : geom.labelY;

                  return (
                    <button
                      key={`lbl-${edge.id}`}
                      type="button"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        suppressEdgeClickPairRef.current = null;
                        edgeDragStateRef.current = {
                          pairKey: edge.pairKey,
                          startClientX: e.clientX,
                          startClientY: e.clientY,
                          originX: descX,
                          originY: descY,
                          moved: false,
                        };
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (suppressEdgeClickPairRef.current === edge.pairKey) {
                          suppressEdgeClickPairRef.current = null;
                          return;
                        }
                        setSelectedNodeName(null);
                        setSelectedEdgeId(edge.id);
                      }}
                      style={{
                        left: `${descX}px`,
                        top: `${descY}px`,
                        transform: 'translate(-50%, -50%)',
                        opacity: dimmed ? 0.3 : 1,
                      }}
                      className={`pointer-events-auto absolute z-10 px-2 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 max-w-[180px] cursor-grab active:cursor-grabbing transition-shadow shadow-sm ${
                        isSelected
                          ? 'bg-[#2a1f14] border-[#ff8000] text-white scale-105'
                          : 'bg-[#18181b]/95 border-[#323238] text-gray-200 hover:border-gray-400'
                      }`}
                      title={`${edge.sourceCharacter} ↔ ${edge.targetCharacter}: ${edge.label} (Drag to reposition descriptor)`}
                    >
                      <span style={{ color: meta.stroke }} className="shrink-0">
                        {getPolarityIcon(edge.polarity, 'w-2.5 h-2.5')}
                      </span>
                      <span className="truncate">{edge.label}</span>
                      {edge.sharedScenes.length > 0 && (
                        <span className="text-[9px] text-gray-400 font-mono tabular-nums shrink-0">
                          ·{edge.sharedScenes.length}sc
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Draggable Character Nodes */}
                {displayNodes.map((node) => {
                  const isSelected = selectedNode?.name === node.name;
                  const isLinkOrigin = linkingFromNode === node.name;
                  const isLinkedToSelectedEdge =
                    selectedEdge &&
                    (selectedEdge.sourceCharacter === node.name ||
                      selectedEdge.targetCharacter === node.name);

                  const portraitSrc =
                    node.portraitUrl && !failedImages[node.portraitUrl]
                      ? node.portraitUrl
                      : undefined;

                  return (
                    <div
                      key={node.name}
                      style={{
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                        width: `${NODE_CARD_WIDTH}px`,
                        minHeight: `${NODE_CARD_HEIGHT}px`,
                      }}
                      onPointerDown={(e) => {
                        if ((e.target as HTMLElement).closest('[data-node-action="true"]')) {
                          return;
                        }
                        e.stopPropagation();
                        suppressNodeClickNameRef.current = null;
                        dragStateRef.current = {
                          name: node.name,
                          startClientX: e.clientX,
                          startClientY: e.clientY,
                          originX: node.x,
                          originY: node.y,
                          moved: false,
                        };
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (suppressNodeClickNameRef.current === node.name) {
                          suppressNodeClickNameRef.current = null;
                          return;
                        }
                        handleNodeClick(node);
                      }}
                      className={`pointer-events-auto absolute z-20 rounded-md p-2.5 cursor-grab active:cursor-grabbing transition-shadow bg-[#1b1b1f] border ${
                        isLinkOrigin
                          ? 'border-[#ff8000] ring-2 ring-[#ff8000]/40 shadow-xl'
                          : isSelected || isLinkedToSelectedEdge
                          ? 'border-[#ff8000] ring-1 ring-[#ff8000]/30 shadow-xl'
                          : 'border-[#33333a] hover:border-[#52525c] shadow-md'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Circular Portrait or Monogram */}
                        <div
                          className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-[#24242a] border-2"
                          style={{ borderColor: node.color }}
                        >
                          {portraitSrc ? (
                            <img
                              src={portraitSrc}
                              alt={node.name}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setFailedImages((prev) => ({ ...prev, [portraitSrc]: true }))
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span
                              className="text-[11px] font-bold tracking-wide"
                              style={{ color: node.color }}
                            >
                              {getInitials(node.name)}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-gray-100 leading-tight truncate">
                            {node.name}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate mt-0.5">
                            {node.roleType || 'Character'}
                            {node.actor ? ` · ${node.actor}` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Unboxed metrics + Connect button */}
                      <div className="mt-2.5 pt-2 border-t border-[#2a2a30] flex items-center justify-between gap-1 text-[10px] text-gray-400 tabular-nums">
                        <span className="truncate font-mono">
                          {node.scenesCount}sc · {node.dialogueLines}dl
                          {node.voiceOverLines > 0 ? ` · ${node.voiceOverLines}vo` : ''}
                        </span>
                        <button
                          type="button"
                          data-node-action="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLinkingFromNode((prev) =>
                              prev === node.name ? null : node.name
                            );
                          }}
                          className={`px-1.5 py-0.5 rounded border text-[10px] flex items-center gap-1 transition-colors shrink-0 ${
                            isLinkOrigin
                              ? 'bg-[#ff7700] border-[#ff7700] text-black font-semibold'
                              : 'bg-[#232328] hover:bg-[#303038] border-[#3c3c44] text-gray-300'
                          }`}
                          title={`Connect ${node.name} to another character`}
                        >
                          <Link2 className="w-2.5 h-2.5" />
                          <span>Link</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
          )}

          {/* Subtle Bottom-Left Legend Overlay */}
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-3 px-3 py-1.5 rounded bg-[#18181b]/95 border border-[#323238] text-[10px] text-gray-400 pointer-events-auto z-30">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-emerald-400 inline-block" />
              <span>Defined Dynamic</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t border-dashed border-zinc-400 inline-block" />
              <span>Script Co-Presence</span>
            </span>
            <span className="text-gray-500">
              · Drag nodes or labels anywhere · Drag background to pan · Scroll to zoom
            </span>
          </div>
        </div>

        {/* Right: Story Cohesion Inspector */}
        <aside className="w-96 bg-[#1b1b1d] border-l border-[#323238] flex flex-col min-h-0 shrink-0">
          {/* Inspector KPI Summary */}
          <div className="px-4 py-2.5 bg-[#202024] border-b border-[#323238] grid grid-cols-3 divide-x divide-[#323238] flex-shrink-0 tabular-nums">
            <div className="pr-2">
              <div className="text-[10px] text-gray-400">Characters</div>
              <div className="text-sm font-bold text-gray-100">{graph.stats.characterCount}</div>
            </div>
            <div className="px-3">
              <div className="text-[10px] text-gray-400">Interactions</div>
              <div className="text-sm font-bold text-cyan-400">{graph.stats.totalConnections}</div>
            </div>
            <div className="pl-3">
              <div className="text-[10px] text-gray-400">Story Cohesion</div>
              <div className="text-sm font-bold text-amber-400">
                {graph.stats.cohesionPercent}%
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedEdge ? (
              /* ---------------- EDGE / RELATIONSHIP INSPECTOR ---------------- */
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                      {selectedEdge.isAuthored
                        ? 'Story Relationship Dynamic'
                        : 'Script Interaction (Unlinked Intent)'}
                    </div>
                    <h3 className="text-sm font-bold text-gray-100 mt-1 flex items-center flex-wrap gap-1.5">
                      <span>{selectedEdge.sourceCharacter}</span>
                      {selectedEdge.direction === 'mutual' ? (
                        <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                      ) : selectedEdge.direction === 'source_to_target' ? (
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400 rotate-180" />
                      )}
                      <span>{selectedEdge.targetCharacter}</span>
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEdgeId(null)}
                    className="p-1 text-gray-400 hover:text-white rounded"
                    title="Back to cohesion overview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Explicit Polarity Status Indicator */}
                <div
                  className={`px-2.5 py-1.5 rounded border flex items-center justify-between text-[11px] ${
                    POLARITY_META[selectedEdge.polarity].chipBg
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    {getPolarityIcon(selectedEdge.polarity)}
                    <span>{POLARITY_META[selectedEdge.polarity].label}</span>
                  </span>
                  <span className="text-[10px] opacity-85">
                    {selectedEdge.isAuthored ? 'Authored' : 'Script-Detected'}
                  </span>
                </div>

                {/* Relationship Definition Form */}
                <div className="space-y-3 bg-[#151517] border border-[#2e2e34] rounded p-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Relationship Label
                    </label>
                    <input
                      type="text"
                      value={selectedEdge.label}
                      onChange={(e) => upsertEdge(selectedEdge, { label: e.target.value })}
                      placeholder="e.g. Institutional Rivals, Secret Allies"
                      className="w-full bg-[#1d1d21] border border-[#3a3a42] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000] select-text"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">
                        Story Polarity
                      </label>
                      <select
                        value={selectedEdge.polarity}
                        onChange={(e) =>
                          upsertEdge(selectedEdge, {
                            polarity: e.target.value as CharacterRelationshipPolarity,
                          })
                        }
                        className="w-full bg-[#1d1d21] border border-[#3a3a42] rounded px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                      >
                        {POLARITY_ORDER.map((pol) => (
                          <option key={pol} value={pol}>
                            {POLARITY_META[pol].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Direction</label>
                      <select
                        value={selectedEdge.direction}
                        onChange={(e) =>
                          upsertEdge(selectedEdge, {
                            direction: e.target.value as CharacterRelationshipEdge['direction'],
                          })
                        }
                        className="w-full bg-[#1d1d21] border border-[#3a3a42] rounded px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                      >
                        <option value="mutual">Mutual (↔)</option>
                        <option value="source_to_target">
                          {selectedEdge.sourceCharacter.split(' ')[0]} →{' '}
                          {selectedEdge.targetCharacter.split(' ')[0]}
                        </option>
                        <option value="target_to_source">
                          {selectedEdge.targetCharacter.split(' ')[0]} →{' '}
                          {selectedEdge.sourceCharacter.split(' ')[0]}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      How This Relationship Drives the Story
                    </label>
                    <textarea
                      rows={3}
                      value={selectedEdge.storyDriver}
                      onChange={(e) => upsertEdge(selectedEdge, { storyDriver: e.target.value })}
                      placeholder="Explain what each character wants from the other, the dramatic tension, and how it propels the plot..."
                      className="w-full bg-[#1d1d21] border border-[#3a3a42] rounded p-2 text-xs text-gray-100 leading-relaxed focus:outline-none focus:border-[#ff8000] select-text"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Arc Shift (Act 1 → Climax)
                    </label>
                    <input
                      type="text"
                      value={selectedEdge.arcShift || ''}
                      onChange={(e) => upsertEdge(selectedEdge, { arcShift: e.target.value })}
                      placeholder="e.g. Distrust → Uneasy Pact → Open Confrontation"
                      className="w-full bg-[#1d1d21] border border-[#3a3a42] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000] select-text"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {selectedEdge.isAuthored ? (
                      <button
                        type="button"
                        onClick={() => removeAuthoredEdge(selectedEdge.id)}
                        className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Defined Relationship</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          upsertEdge(selectedEdge, {
                            polarity: 'conflict',
                            label:
                              selectedEdge.dialogueExchanges > 0
                                ? 'Key Dialogue Dynamic'
                                : 'Shared Scene Tension',
                          })
                        }
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#ff7700] hover:bg-[#ff8c1a] text-black font-semibold rounded text-[11px]"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Promote to Story Link</span>
                      </button>
                    )}
                    {effectiveSavedEdgePositions[selectedEdge.pairKey] && (
                      <button
                        type="button"
                        onClick={() => handleResetEdgeDescriptorPosition(selectedEdge.pairKey)}
                        className="flex items-center gap-1 px-2 py-1 bg-[#24242a] hover:bg-[#303038] border border-[#3a3a44] text-gray-300 rounded text-[10px]"
                        title="Snap descriptor back to curve midpoint"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Label Pos</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Script Interaction Evidence */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-300 font-semibold">
                    <span>Script Interaction Evidence</span>
                    <span className="font-mono text-gray-400 tabular-nums">
                      {selectedEdge.sharedScenes.length} sc · {selectedEdge.dialogueExchanges} exch
                    </span>
                  </div>

                  {selectedEdge.sharedScenes.length === 0 ? (
                    <p className="text-[11px] text-gray-500 bg-[#151517] border border-[#2b2b30] rounded p-2.5">
                      No shared scenes detected yet in the screenplay. Use this off-screen relationship to motivate upcoming scenes or backstory tension.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedEdge.sharedScenes.map((sc) => (
                          <button
                            key={sc.id}
                            type="button"
                            onClick={() => onSelectScene(sc.id)}
                            className="px-2 py-1 rounded bg-[#232328] hover:bg-[#2d2d34] border border-[#3a3a42] text-[11px] text-amber-300 font-mono transition-colors"
                            title={`Jump to ${sc.heading}`}
                          >
                            Sc. {sc.sceneNumber}
                          </button>
                        ))}
                      </div>

                      {selectedEdge.samples.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {selectedEdge.samples.map((sm, idx) => (
                            <div
                              key={`${sm.sceneId}-${idx}`}
                              className="bg-[#151517] border border-[#2b2b30] rounded p-2.5 space-y-1"
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => onSelectScene(sm.sceneId)}
                                  className="text-amber-400 hover:underline font-mono font-semibold"
                                >
                                  Scene {sm.sceneNumber}
                                </button>
                                <span className="text-gray-500 truncate max-w-[190px]">
                                  {sm.kind === 'exchange'
                                    ? sm.isVoiceOver
                                      ? 'V.O. / Dialogue Exchange'
                                      : 'Direct Dialogue Exchange'
                                    : 'Scene Co-Appearance'}
                                </span>
                              </div>
                              {sm.kind === 'exchange' ? (
                                <div className="space-y-1 text-[11px] text-gray-300 leading-snug">
                                  <p>
                                    <span className="text-cyan-300 font-semibold">
                                      {sm.fromSpeaker}:
                                    </span>{' '}
                                    “{sm.fromText}”
                                  </p>
                                  <p>
                                    <span className="text-amber-300 font-semibold">
                                      {sm.toSpeaker}:
                                    </span>{' '}
                                    “{sm.toText}”
                                  </p>
                                </div>
                              ) : (
                                <p className="text-[11px] text-gray-400 truncate">
                                  {sm.sceneHeading}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : selectedNode ? (
              /* ---------------- CHARACTER NODE INSPECTOR ---------------- */
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-[#25252b] border-2"
                      style={{ borderColor: selectedNode.color }}
                    >
                      {selectedNode.portraitUrl && !failedImages[selectedNode.portraitUrl] ? (
                        <img
                          src={selectedNode.portraitUrl}
                          alt={selectedNode.name}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedImages((prev) => ({
                              ...prev,
                              [selectedNode.portraitUrl!]: true,
                            }))
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span
                          className="text-xs font-bold"
                          style={{ color: selectedNode.color }}
                        >
                          {getInitials(selectedNode.name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-100 truncate">
                        {selectedNode.name}
                      </h3>
                      <p className="text-[11px] text-gray-400 truncate">
                        {selectedNode.roleType || 'Character'}
                        {selectedNode.actor ? ` · ${selectedNode.actor}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedNodeName(null)}
                    className="p-1 text-gray-400 hover:text-white rounded"
                    title="Back to cohesion overview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Unboxed script footprint */}
                <div className="flex items-center gap-3 text-[11px] text-gray-300 bg-[#151517] border border-[#2b2b30] rounded px-3 py-2 tabular-nums">
                  <span>{selectedNode.scenesCount} Scenes</span>
                  <span className="text-gray-600">·</span>
                  <span>{selectedNode.dialogueLines} Dialogue</span>
                  <span className="text-gray-600">·</span>
                  <span>{selectedNode.voiceOverLines} V.O.</span>
                </div>

                {/* Story Arc & Tension from Project Bible */}
                <div className="bg-[#151517] border border-[#2b2b30] rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5" />
                      <span>Character Arc & Core Tension</span>
                    </span>
                    {onOpenCharacterBios && (
                      <button
                        type="button"
                        onClick={onOpenCharacterBios}
                        className="text-[10px] text-cyan-400 hover:underline"
                      >
                        Edit Bio →
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    {selectedNode.loglineSummary ||
                      'No bio summary yet in Project Bible. Map relationships below to clarify this character’s dramatic pressure points.'}
                  </p>
                  {selectedNode.arcStartToEnd && (
                    <div className="text-[11px] text-gray-400 pt-1 border-t border-[#26262c]">
                      <span className="text-gray-300 font-medium">Arc: </span>
                      {selectedNode.arcStartToEnd}
                    </div>
                  )}
                  {selectedNode.coreFlawOrTension && (
                    <div className="text-[11px] text-gray-400">
                      <span className="text-gray-300 font-medium">Flaw / Tension: </span>
                      {selectedNode.coreFlawOrTension}
                    </div>
                  )}
                </div>

                {/* Quick Connect Action */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal(selectedNode.name)}
                    disabled={graph.nodes.length < 2}
                    className="flex-1 py-1.5 px-3 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-black font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect Character</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkingFromNode(selectedNode.name)}
                    disabled={graph.nodes.length < 2}
                    className="py-1.5 px-3 bg-[#242429] hover:bg-[#2f2f36] border border-[#3c3c44] text-gray-200 rounded flex items-center gap-1 transition-colors"
                    title="Pick target node directly on canvas"
                  >
                    <Link2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pick on Canvas</span>
                  </button>
                </div>

                {/* Connected Characters List */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-gray-300">
                    Connected Dynamics (
                    {
                      graph.edges.filter(
                        (e) =>
                          e.sourceCharacter === selectedNode.name ||
                          e.targetCharacter === selectedNode.name
                      ).length
                    }
                    )
                  </div>

                  {graph.edges
                    .filter(
                      (e) =>
                        e.sourceCharacter === selectedNode.name ||
                        e.targetCharacter === selectedNode.name
                    )
                    .map((edge) => {
                      const other =
                        edge.sourceCharacter === selectedNode.name
                          ? edge.targetCharacter
                          : edge.sourceCharacter;
                      const meta = POLARITY_META[edge.polarity];
                      return (
                        <button
                          key={edge.id}
                          type="button"
                          onClick={() => {
                            setSelectedNodeName(null);
                            setSelectedEdgeId(edge.id);
                          }}
                          className="w-full text-left bg-[#151517] hover:bg-[#1e1e22] border border-[#2d2d34] hover:border-[#ff8000]/60 rounded p-2.5 space-y-1 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-gray-100 truncate">{other}</span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-medium shrink-0 ${meta.badgeText}`}
                            >
                              {getPolarityIcon(edge.polarity, 'w-3 h-3')}
                              <span>{meta.label}</span>
                            </span>
                          </div>
                          <div className="text-[11px] text-amber-300 truncate">{edge.label}</div>
                          {edge.storyDriver ? (
                            <p className="text-[11px] text-gray-400 line-clamp-2">
                              {edge.storyDriver}
                            </p>
                          ) : (
                            <p className="text-[10px] text-gray-500 italic">
                              No narrative driver defined yet — click to annotate
                            </p>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* ---------------- GRAPH OVERVIEW & STORY COHESION ---------------- */
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-100">Story Cohesion Inspector</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                    Click any character node or connection link to inspect script interactions and define how each relationship drives the plot.
                  </p>
                </div>

                {/* Cohesion Progress */}
                <div className="bg-[#151517] border border-[#2d2d34] rounded p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-300 font-semibold">Narrative Link Coverage</span>
                    <span className="font-mono text-amber-400 font-semibold tabular-nums">
                      {graph.stats.authoredCount}/{graph.stats.totalConnections} defined
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#27272d] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ff8000] transition-all"
                      style={{ width: `${graph.stats.cohesionPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 tabular-nums pt-0.5">
                    <span>{graph.stats.conflictCount} Conflict</span>
                    <span>{graph.stats.allianceCount} Alliance</span>
                    <span>{graph.stats.scriptDerivedCount} Unlinked Script Pairs</span>
                  </div>
                </div>

                {/* Cohesion Gaps */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-200 flex items-center gap-1.5">
                      {graph.cohesionGaps.length > 0 ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>Cohesion Gaps ({graph.cohesionGaps.length})</span>
                    </span>
                  </div>

                  {graph.cohesionGaps.length === 0 ? (
                    <p className="text-[11px] text-emerald-400/90 bg-[#151517] border border-emerald-900/50 rounded p-2.5">
                      All active character pairs have authored story drivers linking their scenes.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {graph.cohesionGaps.slice(0, 6).map((gap) => (
                        <div
                          key={gap.id}
                          className="bg-[#151517] border border-[#2d2d34] rounded p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-gray-100 truncate">
                              {gap.sourceCharacter} ↔ {gap.targetCharacter}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 shrink-0 tabular-nums">
                              {gap.sharedScenes.length}sc · {gap.dialogueExchanges}ex
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400">
                            {gap.isAuthored
                              ? 'Missing "How This Drives the Story" motivation.'
                              : 'Characters interact in the script without a defined narrative dynamic.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNodeName(null);
                              setSelectedEdgeId(gap.id);
                            }}
                            className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                          >
                            Define Dynamic →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Authored Story Dynamics List */}
                {graph.edges.some((e) => e.isAuthored) && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-gray-300">
                      Defined Story Relationships
                    </div>
                    <div className="space-y-1.5">
                      {graph.edges
                        .filter((e) => e.isAuthored)
                        .map((edge) => {
                          const meta = POLARITY_META[edge.polarity];
                          return (
                            <button
                              key={edge.id}
                              type="button"
                              onClick={() => {
                                setSelectedNodeName(null);
                                setSelectedEdgeId(edge.id);
                              }}
                              className="w-full text-left bg-[#151517] hover:bg-[#1e1e22] border border-[#2d2d34] rounded px-2.5 py-2 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="font-semibold text-gray-100 truncate">
                                  {edge.sourceCharacter} ↔ {edge.targetCharacter}
                                </span>
                                <span className={`${meta.badgeText} shrink-0 flex items-center gap-1 text-[10px]`}>
                                  {getPolarityIcon(edge.polarity, 'w-2.5 h-2.5')}
                                  <span>{edge.label}</span>
                                </span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Add Relationship Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#222226] border border-[#42424a] rounded-lg shadow-2xl w-full max-w-md overflow-hidden text-xs text-gray-200">
            <div className="px-4 py-3 bg-[#1a1a1d] border-b border-[#34343c] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-[#ff8000]" />
                <span className="font-bold text-sm text-gray-100">
                  Add Character Story Relationship
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewRelationship} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Character A</label>
                  <select
                    value={newSourceChar}
                    onChange={(e) => setNewSourceChar(e.target.value)}
                    className="w-full bg-[#161618] border border-[#3a3a42] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  >
                    {graph.nodes.map((n) => (
                      <option key={n.name} value={n.name}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Character B</label>
                  <select
                    value={newTargetChar}
                    onChange={(e) => setNewTargetChar(e.target.value)}
                    className="w-full bg-[#161618] border border-[#3a3a42] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  >
                    {graph.nodes
                      .filter((n) => n.name !== newSourceChar)
                      .map((n) => (
                        <option key={n.name} value={n.name}>
                          {n.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Story Polarity</label>
                  <select
                    value={newPolarity}
                    onChange={(e) =>
                      setNewPolarity(e.target.value as CharacterRelationshipPolarity)
                    }
                    className="w-full bg-[#161618] border border-[#3a3a42] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  >
                    {POLARITY_ORDER.filter((p) => p !== 'neutral').map((pol) => (
                      <option key={pol} value={pol}>
                        {POLARITY_META[pol].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Direction</label>
                  <select
                    value={newDirection}
                    onChange={(e) =>
                      setNewDirection(e.target.value as CharacterRelationshipEdge['direction'])
                    }
                    className="w-full bg-[#161618] border border-[#3a3a42] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                  >
                    <option value="mutual">Mutual (↔)</option>
                    <option value="source_to_target">A → B</option>
                    <option value="target_to_source">B → A</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Dynamic Label
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Whistleblower vs. Oversight Chair"
                  className="w-full bg-[#161618] border border-[#3a3a42] rounded px-2.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  How This Relationship Drives the Story
                </label>
                <textarea
                  rows={3}
                  value={newStoryDriver}
                  onChange={(e) => setNewStoryDriver(e.target.value)}
                  placeholder="What conflict, leverage, or emotional stakes bind these two characters?"
                  className="w-full bg-[#161618] border border-[#3a3a42] rounded p-2 text-xs text-gray-100 focus:outline-none focus:border-[#ff8000]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#32323a]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-[#2d2d34] hover:bg-[#383840] text-gray-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSourceChar || !newTargetChar || newSourceChar === newTargetChar}
                  className="px-4 py-1.5 bg-[#ff7700] hover:bg-[#ff8c1a] disabled:opacity-40 text-black font-semibold rounded"
                >
                  Save Relationship
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
