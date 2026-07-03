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

// Generate a branching map: layers of nodes connected by paths
// Slay the Spire style — 7 layers, 2-3 nodes each, boss at the end
export function generateMap(seed) {
  const rng = createRng(seed);
  const numLayers = 7;
  const layers = [];

  for (let layer = 0; layer < numLayers; layer++) {
    const isBoss = layer === numLayers - 1;
    const numNodes = isBoss ? 1 : Math.floor(rng() * 2) + 2; // 2 or 3

    const nodes = [];
    for (let i = 0; i < numNodes; i++) {
      let type;
      if (isBoss) {
        type = "boss";
      } else if (layer === 0) {
        type = "battle";
      } else {
        const roll = rng();
        if (roll < 0.45) type = "battle";
        else if (roll < 0.6) type = "treasure";
        else if (roll < 0.72) type = "divine";
        else if (roll < 0.85) type = "story";
        else if (roll < 0.93) type = "rest";
        else type = "mystery";
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

  // Connect layers — each node connects to 1-2 nodes in the next layer
  for (let layer = 0; layer < numLayers - 1; layer++) {
    const current = layers[layer];
    const next = layers[layer + 1];

    for (const node of current) {
      // Connect to nearest node(s) in next layer
      const numConnections = rng() < 0.3 && next.length > 1 ? 2 : 1;
      const available = next.map((_, i) => i).sort((a, b) =>
        Math.abs(a - node.index) - Math.abs(b - node.index)
      );
      const chosen = available.slice(0, numConnections);
      node.connections = chosen.map(i => `${layer + 1}-${i}`);
    }
  }

  return layers;
}

export function getFirstNode(layers) {
  return layers[0][0];
}

export function getNextNodes(layers, node) {
  return node.connections.map(id => {
    const [layer, idx] = id.split("-");
    return layers[parseInt(layer)][parseInt(idx)];
  });
}

export function isMapComplete(layers) {
  const boss = layers[layers.length - 1][0];
  return boss.cleared;
}