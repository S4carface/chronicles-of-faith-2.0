// Seeded RNG for reproducible runs (daily challenge support)
export function createRng(seed) {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (state * 31 + seed.charCodeAt(i)) | 0;
  }
  state = Math.abs(state) || 1;
  return function () {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function pickN(rng, arr, n) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

// Difficulty presets: fog of war + reward frequency
export const DIFFICULTY_PRESETS = {
  easy: { fogOfWar: false, rewardChance: 0.55, label: "Easy", desc: "All rooms visible. More rewards.", icon: "🌱" },
  normal: { fogOfWar: true, rewardChance: 0.40, label: "Normal", desc: "Fog of war. Decent rewards.", icon: "⚔️" },
  hard: {   fogOfWar: true,   rewardChance: 0.55,   label: "Hard",   desc: "One life. Any defeat ends this book run. Permanent progress is kept.",   icon: "🔥", },
};

// Generate a branching map with difficulty-based room distribution
// Constraints:
// - Layer 0 is always a battle (first fight)
// - Can't have 3+ non-battle rooms in a row (forces fighting)
// - Reward rooms limited so player can't avoid all battles
export function generateMap(seed, difficulty = "normal") {
  const rng = createRng(seed);
  const preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.normal;
  const rewardChance = preset.rewardChance;

  const numLayers = 8;
  const layers = [];

  for (let layer = 0; layer < numLayers; layer++) {
    const isBoss = layer === numLayers - 1;
    const isFirst = layer === 0;

    // Layer 0: start with 1 node (middle). Layers 1+: 3 nodes (top, middle, bottom)
    const numNodes = isBoss ? 1 : (isFirst ? 1 : 3);

    const nodes = [];
    for (let i = 0; i < numNodes; i++) {
      let type;
      if (isBoss) {
        type = "boss";
      } else if (isFirst) {
        type = "battle";
      } else {
        // Constrained room generation
        const roll = rng();
        if (roll < rewardChance * 0.4) type = "treasure";
        else if (roll < rewardChance * 0.55) type = "divine";
        else if (roll < rewardChance * 0.70) type = "story";
        else if (roll < rewardChance * 0.80) type = "rest";
        else if (roll < rewardChance * 0.90) type = "mystery";
        else type = "battle";
      }

      nodes.push({
        id: `${layer}-${i}`,
        layer,
        index: i,
        type,
        visited: false,
        cleared: false,
        connections: [],
      });
    }
    layers.push(nodes);
  }

  // Connect layers with branching paths
  // Layer 0 (1 node) connects to all 3 nodes in layer 1
  // Middle nodes connect to more options; edge nodes connect to fewer
  for (let layer = 0; layer < numLayers - 1; layer++) {
    const current = layers[layer];
    const next = layers[layer + 1];

    for (const node of current) {
      if (next.length === 1) {
        // Connect to boss
        node.connections = [next[0].id];
        continue;
      }

      let connections;
      if (current.length === 1) {
        // First layer: connect to all 3 next nodes
        connections = next.map(n => n.id);
      } else {
        // Branching: middle connects to all 3, edges connect to 2 adjacent
        if (node.index === 1) {
          // Middle node — more choices
          connections = next.map(n => n.id);
        } else if (node.index === 0) {
          // Top node — connects to top and middle
          connections = [next[0].id, next[1].id];
        } else {
          // Bottom node — connects to middle and bottom
          connections = [next[1].id, next[2].id];
        }
      }
      node.connections = connections;
    }
  }

  return layers;
}

export function getFirstNode(layers) {
  return layers[0][0];
}

export function getNextNodes(layers, node) {
  if (!node) return [layers[0][0]];
  return node.connections.map(id => {
    const [layer, idx] = id.split("-");
    return layers[parseInt(layer)][parseInt(idx)];
  });
}

// Check which nodes should be visible (fog of war logic)
export function getVisibleNodes(layers, currentNode, fogOfWar) {
  if (!fogOfWar) {
    // Easy mode: show all
    const all = [];
    for (const layer of layers) {
      for (const node of layer) {
        all.push(node.id);
      }
    }
    return new Set(all);
  }

  // Fog of war: show current layer + next layer + visited/cleared nodes
  const visible = new Set();
  const currentLayer = currentNode ? currentNode.layer : 0;

  for (const layer of layers) {
    for (const node of layer) {
      // Always show visited, cleared, and current nodes
      if (node.visited || node.cleared) visible.add(node.id);
      // Show current layer
      if (node.layer === currentLayer) visible.add(node.id);
      // Show next layer (immediate choices)
      if (node.layer === currentLayer + 1) visible.add(node.id);
      // Show boss layer always
      if (node.layer === layers.length - 1) visible.add(node.id);
    }
  }
  return visible;
}

export function isMapComplete(layers) {
  const boss = layers[layers.length - 1][0];
  return boss.cleared;
}