import { deflate, inflate } from 'pako';

// ============================================================
// LabyrinthOS v3 — Geometric Block Encoding
// ============================================================
//
// Each byte of data is encoded as a geometric pattern in a 3×3
// block of maze cells. The center cell is always open. The 8
// surrounding cells (clockwise from top-left) encode 1 byte:
//   bit 7: top-left     bit 6: top-center    bit 5: top-right
//   bit 0: mid-left     CENTER               bit 4: mid-right
//   bit 1: bottom-left  bit 2: bottom-center bit 3: bottom-right
//
// Routing: the 4 "side" data cells (bits 6,4,2,0 = top-center,
// mid-right, bottom-center, mid-left) are forced open whenever
// the spanning tree needs a corridor in that direction. These
// forced bits are tracked and SKIPPED during payload extraction,
// preserving all data. The 4 corner cells (bits 7,5,3,1) are
// never forced — they always encode real data.
//
// Effective density: ~6 bits/block on average (2 routing bits
// forced per spanning-tree edge), ~0.38 bits/cell vs v2's 0.25.
// ============================================================

// --- PRNG ---
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state; };
}

// --- Block geometry ---
// Block (br, bc) occupies rows [4br+1..4br+3], cols [4bc+1..4bc+3]
// Center: (4br+2, 4bc+2)  always open

function blockCenter(br: number, bc: number): [number, number] {
  return [4 * br + 2, 4 * bc + 2];
}

// 8 data cells in clockwise order from top-left.
// Index i → bit position (7-i) in the byte (MSB first).
function blockDataCells(br: number, bc: number): [number, number][] {
  const r = 4 * br + 1, c = 4 * bc + 1;
  return [
    [r,     c    ], // i=0 → bit 7: top-left
    [r,     c + 1], // i=1 → bit 6: top-center   ← routing UP
    [r,     c + 2], // i=2 → bit 5: top-right
    [r + 1, c + 2], // i=3 → bit 4: mid-right     ← routing RIGHT
    [r + 2, c + 2], // i=4 → bit 3: bottom-right
    [r + 2, c + 1], // i=5 → bit 2: bottom-center ← routing DOWN
    [r + 2, c    ], // i=6 → bit 1: bottom-left
    [r + 1, c    ], // i=7 → bit 0: mid-left      ← routing LEFT
  ];
}

// Gap cell connecting block (br,bc) to (br,bc+1) horizontally
function horizCorridor(br: number, bc: number): [number, number] {
  return [4 * br + 2, 4 * bc + 4];
}

// Gap cell connecting block (br,bc) to (br+1,bc) vertically
function vertCorridor(br: number, bc: number): [number, number] {
  return [4 * br + 4, 4 * bc + 2];
}

// --- Spanning tree on block grid (randomized DFS, seeded from dimensions) ---
// Edge IDs:
//   Horizontal (br,bc)→(br,bc+1): id = br*bCols + bc
//   Vertical   (br,bc)→(br+1,bc): id = bRows*bCols + br*bCols + bc
function generateBlockSpanningTree(bRows: number, bCols: number): Set<number> {
  const rng = createRng(bRows * 100003 + bCols * 10007 + 42);
  const visited = new Uint8Array(bRows * bCols);
  const treeEdges = new Set<number>();
  const stack = new Int32Array(bRows * bCols);
  let stackTop = 0;
  const nb = new Int32Array(4), ne = new Int32Array(4);

  stack[stackTop++] = 0; visited[0] = 1;

  while (stackTop > 0) {
    const idx = stack[stackTop - 1];
    const br = (idx / bCols) | 0, bc = idx % bCols;
    let n = 0;
    if (bc + 1 < bCols && !visited[idx + 1])      { nb[n] = idx + 1;       ne[n] = br * bCols + bc;                    n++; }
    if (br + 1 < bRows && !visited[idx + bCols])   { nb[n] = idx + bCols;   ne[n] = bRows * bCols + br * bCols + bc;    n++; }
    if (bc > 0         && !visited[idx - 1])       { nb[n] = idx - 1;       ne[n] = br * bCols + (bc - 1);              n++; }
    if (br > 0         && !visited[idx - bCols])   { nb[n] = idx - bCols;   ne[n] = bRows * bCols + (br - 1) * bCols + bc; n++; }

    if (n > 0) {
      for (let i = n - 1; i > 0; i--) {
        const j = rng() % (i + 1);
        let t = nb[i]; nb[i] = nb[j]; nb[j] = t;
        t = ne[i]; ne[i] = ne[j]; ne[j] = t;
      }
      visited[nb[0]] = 1; treeEdges.add(ne[0]); stack[stackTop++] = nb[0];
    } else { stackTop--; }
  }
  return treeEdges;
}

// --- Forced routing bitmasks ---
// For each block, certain bit positions are "routing bits" forced to 0
// so that spanning-tree corridors are traversable. These bits carry no
// payload data; encoder skips them, decoder ignores them.
//
// Bit positions forced per direction:
//   RIGHT edge → bit 4 (mid-right) of left block, bit 0 (mid-left) of right block
//   DOWN  edge → bit 2 (bottom-center) of top block, bit 6 (top-center) of bottom block
// Entry always forces bit 0 of block(0,0).
// Exit  always forces bit 4 of block(lastBr, lastBc).
function computeForcedMasks(bRows: number, bCols: number, treeEdges: Set<number>): Uint8Array {
  const masks = new Uint8Array(bRows * bCols);
  const hBase = bRows * bCols;

  for (const eid of treeEdges) {
    if (eid < hBase) {
      // Horizontal: (br,bc)→(br,bc+1)
      const br = (eid / bCols) | 0, bc = eid % bCols;
      masks[br * bCols + bc]       |= (1 << 4); // mid-right
      masks[br * bCols + (bc + 1)] |= (1 << 0); // mid-left
    } else {
      // Vertical: (br,bc)→(br+1,bc)
      const i = eid - hBase;
      const br = (i / bCols) | 0, bc = i % bCols;
      masks[br * bCols + bc]            |= (1 << 2); // bottom-center
      masks[(br + 1) * bCols + bc]      |= (1 << 6); // top-center
    }
  }
  // Entry: bit 0 (mid-left) of block(0,0) must always be open
  masks[0] |= (1 << 0);
  // Exit: bit 4 (mid-right) of last block must always be open
  masks[bRows * bCols - 1] |= (1 << 4);
  return masks;
}

// Total available payload bits across the block grid (excluding forced cells)
function totalAvailableBits(forcedMasks: Uint8Array): number {
  let bits = 0;
  for (let i = 0; i < forcedMasks.length; i++) {
    // Count non-forced bits (8 - popcount(mask))
    let m = forcedMasks[i];
    m = m - ((m >> 1) & 0x55);
    m = (m & 0x33) + ((m >> 2) & 0x33);
    bits += 8 - (((m + (m >> 4)) & 0x0f));
  }
  return bits;
}

// --- Encryption ---
function deriveKeyStream(password: string, length: number): Uint8Array {
  const enc = new TextEncoder();
  const pwdBytes = enc.encode(password);
  let seed = 5381;
  for (let i = 0; i < pwdBytes.length; i++) seed = ((seed << 5) + seed + pwdBytes[i]) >>> 0;
  const rng = createRng(seed);
  const s = new Uint8Array(length);
  for (let i = 0; i < length; i++) s[i] = (rng() >>> 16) & 0xff;
  return s;
}

function xorCrypt(data: Uint8Array, password: string): Uint8Array {
  const key = deriveKeyStream(password, data.length);
  const r = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) r[i] = data[i] ^ key[i];
  return r;
}

// --- Header: 8 bytes = [originalSize uint32 BE, compressedSize uint32 BE] ---
function buildHeader(orig: number, comp: number): Uint8Array {
  const h = new Uint8Array(8);
  const v = new DataView(h.buffer);
  v.setUint32(0, orig, false); v.setUint32(4, comp, false);
  return h;
}
function parseHeader(b: Uint8Array): { originalSize: number; compressedSize: number } {
  const v = new DataView(b.buffer, b.byteOffset, 8);
  return { originalSize: v.getUint32(0, false), compressedSize: v.getUint32(4, false) };
}

// ============================================================
// Public API
// ============================================================
export interface EncodeResult {
  maze: number[][];
  path: [number, number][];
  gridRows: number;
  gridCols: number;
  blockRows: number;
  blockCols: number;
  blocksUsed: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  mazeWidth: number;
  mazeHeight: number;
  pathLength: number;
  solveTimeMs: number;
  totalTimeMs: number;
  version: 'v3';
  bitsPerCell: number;
}

// ============================================================
// ENCODE
// ============================================================
export function encode(fileData: ArrayBuffer, password?: string): EncodeResult {
  const t0 = performance.now();
  const raw = new Uint8Array(fileData);
  const originalSize = raw.length;

  const compressed = deflate(raw);
  const compressedSize = compressed.length;
  const processed = password ? xorCrypt(compressed, password) : compressed;

  // Payload: 8-byte header + data
  const header = buildHeader(originalSize, compressedSize);
  const payload = new Uint8Array(8 + processed.length);
  payload.set(header, 0); payload.set(processed, 8);

  const numBits = payload.length * 8;

  // Size the grid: worst case ~4 available bits/block → need numBits/4 blocks
  // Use ceil(sqrt(numBits/4)) + 3 for comfortable padding
  const minBlocks = Math.ceil(numBits / 4);
  const side = Math.ceil(Math.sqrt(minBlocks)) + 3;
  const bRows = Math.max(side, 4);
  const bCols = Math.max(side, 4);

  // Build spanning tree
  const treeEdges = generateBlockSpanningTree(bRows, bCols);
  const forcedMasks = computeForcedMasks(bRows, bCols, treeEdges);

  // Verify capacity
  const available = totalAvailableBits(forcedMasks);
  if (available < numBits) {
    throw new Error(`Grid too small: need ${numBits} bits, have ${available}`);
  }

  // Build maze: (4*bRows+1) × (4*bCols+1), all walls
  const mazeH = 4 * bRows + 1;
  const mazeW = 4 * bCols + 1;
  const maze: number[][] = [];
  for (let i = 0; i < mazeH; i++) maze.push(new Array(mazeW).fill(1));

  // Open all block centers
  for (let bi = 0; bi < bRows * bCols; bi++) {
    const [cr, cc] = blockCenter((bi / bCols) | 0, bi % bCols);
    maze[cr][cc] = 0;
  }

  // Open spanning tree corridor cells
  const hBase = bRows * bCols;
  for (const eid of treeEdges) {
    if (eid < hBase) {
      const br = (eid / bCols) | 0, bc = eid % bCols;
      const [cr, cc] = horizCorridor(br, bc); maze[cr][cc] = 0;
    } else {
      const i = eid - hBase;
      const br = (i / bCols) | 0, bc = i % bCols;
      const [cr, cc] = vertCorridor(br, bc); maze[cr][cc] = 0;
    }
  }

  // Encode payload bits into blocks, skipping forced positions
  let payloadBit = 0; // index into payload bitstream

  for (let bi = 0; bi < bRows * bCols; bi++) {
    const br = (bi / bCols) | 0, bc = bi % bCols;
    const cells = blockDataCells(br, bc);
    const fmask = forcedMasks[bi];

    for (let ci = 0; ci < 8; ci++) {
      const bitPos = 7 - ci; // bit position in byte (7=MSB)
      const [cr, cc] = cells[ci];
      if (fmask & (1 << bitPos)) {
        maze[cr][cc] = 0; // forced open — routing cell
      } else {
        // Real data bit
        let bit = 0;
        if (payloadBit < numBits) {
          const byteIdx = (payloadBit / 8) | 0;
          const bPos = 7 - (payloadBit % 8);
          bit = (payload[byteIdx] >> bPos) & 1;
          payloadBit++;
        }
        maze[cr][cc] = bit;
      }
    }
  }

  // Entry and exit (border openings — routing cells already forced open)
  maze[2][0] = 0;                              // left border → block(0,0) mid-left [forced]
  maze[4 * (bRows - 1) + 2][mazeW - 1] = 0;   // right border ← last block mid-right [forced]

  // Solve
  const tSolve = performance.now();
  const path = solveMaze(maze);
  const solveTimeMs = performance.now() - tSolve;
  const totalTimeMs = performance.now() - t0;

  return {
    maze, path,
    gridRows: bRows, gridCols: bCols,
    blockRows: bRows, blockCols: bCols,
    blocksUsed: bRows * bCols,
    originalSize, compressedSize,
    compressionRatio: originalSize > 0 ? compressedSize / originalSize : 0,
    mazeWidth: mazeW, mazeHeight: mazeH,
    pathLength: path.length, solveTimeMs, totalTimeMs,
    version: 'v3',
    bitsPerCell: numBits / (mazeH * mazeW),
  };
}

// ============================================================
// DECODE
// ============================================================
export function decode(maze: number[][], password?: string): Uint8Array {
  const mazeH = maze.length, mazeW = maze[0].length;
  const bRows = (mazeH - 1) / 4, bCols = (mazeW - 1) / 4;

  if (!Number.isInteger(bRows) || !Number.isInteger(bCols) || bRows < 4 || bCols < 4) {
    throw new Error('Invalid v3 maze dimensions');
  }

  const treeEdges = generateBlockSpanningTree(bRows, bCols);
  const forcedMasks = computeForcedMasks(bRows, bCols, treeEdges);

  // Read all payload bits from non-forced cell positions
  const totalBits = totalAvailableBits(forcedMasks);
  const payloadBits = new Uint8Array(Math.ceil(totalBits / 8));
  let bitIdx = 0;

  for (let bi = 0; bi < bRows * bCols; bi++) {
    const br = (bi / bCols) | 0, bc = bi % bCols;
    const cells = blockDataCells(br, bc);
    const fmask = forcedMasks[bi];

    for (let ci = 0; ci < 8; ci++) {
      const bitPos = 7 - ci;
      if (fmask & (1 << bitPos)) continue; // skip forced routing cell
      const [cr, cc] = cells[ci];
      const byteIdx = (bitIdx / 8) | 0;
      const bPos = 7 - (bitIdx % 8);
      if (maze[cr][cc] & 1) payloadBits[byteIdx] |= (1 << bPos);
      bitIdx++;
    }
  }

  // Parse header (first 8 bytes of payload)
  const { originalSize, compressedSize } = parseHeader(payloadBits);
  if (originalSize > 100 * 1024 * 1024 || compressedSize > 100 * 1024 * 1024) {
    throw new Error('Invalid header: sizes out of range');
  }

  // Extract compressed data (bytes 8..8+compressedSize)
  const processed = payloadBits.slice(8, 8 + compressedSize);

  const compressed = password ? xorCrypt(processed, password) : processed;
  const raw = inflate(compressed);

  const result = new Uint8Array(originalSize);
  result.set(raw.subarray(0, originalSize));
  return result;
}

// ============================================================
// BFS SOLVER
// ============================================================
export function solveMaze(maze: number[][]): [number, number][] {
  const H = maze.length, W = maze[0].length;
  const parent = new Int32Array(H * W).fill(-2);

  // Entry: (2, 0)   Exit: (H-3, W-1)  [H = 4*bRows+1 → H-3 = center of last block row]
  const startIdx = 2 * W;
  const goalIdx  = (H - 3) * W + (W - 1);

  parent[startIdx] = -1;
  const queue = new Int32Array(H * W);
  let head = 0, tail = 0;
  queue[tail++] = startIdx;

  while (head < tail) {
    const idx = queue[head++];
    if (idx === goalIdx) break;
    const y = (idx / W) | 0, x = idx % W;
    const neighbors = [idx + 1, idx + W, idx - 1, idx - W];
    const valid = [x + 1 < W, y + 1 < H, x > 0, y > 0];
    for (let d = 0; d < 4; d++) {
      if (!valid[d]) continue;
      const n = neighbors[d];
      const ny = (n / W) | 0, nx = n % W;
      if (parent[n] === -2 && maze[ny][nx] === 0) { parent[n] = idx; queue[tail++] = n; }
    }
  }

  if (parent[goalIdx] === -2) throw new Error('No path found from entry to exit');

  const path: [number, number][] = [];
  let cur = goalIdx;
  while (cur !== -1) { path.push([(cur / W) | 0, cur % W]); cur = parent[cur]; }
  path.reverse();
  return path;
}
