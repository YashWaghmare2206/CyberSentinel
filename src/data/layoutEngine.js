// The real topology has 43 nodes and isn't a clean tree, so hand-placed
// coordinates don't scale. Instead we auto-layer nodes left-to-right by
// their shortest directed-hop distance from the public entry points, which
// mirrors how the attack actually flows through the network.
import { buildGraph, COMMON_ENTRY_POINTS } from "./graphEngine";

const TIER_X_STEP = 230;
const ROW_Y_STEP = 108;
const CANVAS_Y_OFFSET = 40;

function bfsLevels(graph, sources) {
  const levels = new Map();
  const queue = [];
  for (const s of sources) {
    if (!graph.nodes.has(s)) continue;
    levels.set(s, 0);
    queue.push(s);
  }
  let head = 0;
  while (head < queue.length) {
    const u = queue[head++];
    const level = levels.get(u);
    for (const { to } of graph.adjacency.get(u) ?? []) {
      if (!levels.has(to)) {
        levels.set(to, level + 1);
        queue.push(to);
      }
    }
  }
  return levels;
}

let _layout = null;

/**
 * Computes { [nodeId]: {x, y} } once, tiering nodes by shortest hop
 * distance from the union of all canonical entry points. Nodes never
 * reached from any entry point (isolated / inbound-only) fall back to a
 * tier based on their type so nothing overlaps at the origin.
 */
export function computeLayout() {
  if (_layout) return _layout;
  const graph = buildGraph();
  const levels = bfsLevels(graph, Object.keys(COMMON_ENTRY_POINTS));

  const TYPE_FALLBACK_TIER = { public: 0, internal: 3, control: 3, data: 5, critical: 7 };
  const maxKnownTier = Math.max(0, ...levels.values());

  const tierOf = (id) => {
    if (levels.has(id)) return levels.get(id);
    const type = graph.nodes.get(id)?.type;
    return (TYPE_FALLBACK_TIER[type] ?? 4) + maxKnownTier;
  };

  const byTier = new Map();
  for (const id of graph.nodes.keys()) {
    const t = tierOf(id);
    if (!byTier.has(t)) byTier.set(t, []);
    byTier.get(t).push(id);
  }

  const positions = {};
  for (const [tier, ids] of byTier) {
    ids.sort();
    const count = ids.length;
    ids.forEach((id, i) => {
      const y = i * ROW_Y_STEP - ((count - 1) * ROW_Y_STEP) / 2 + CANVAS_Y_OFFSET + 260;
      positions[id] = { x: tier * TIER_X_STEP, y };
    });
  }

  _layout = positions;
  return positions;
}
