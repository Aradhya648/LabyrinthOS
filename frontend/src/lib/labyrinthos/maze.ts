import { deflate, inflate } from 'pako';

// ============================================================
// LabyrinthOS v2 — Spanning Tree Maze with Data Encoding
// ============================================================
//
// Architecture:
//   file → compress → encrypt → header+bits → maze grid
//   maze grid → bits → header → decrypt → decompress → file
//
// The maze uses a deterministic spanning tree (randomized DFS
// seeded purely from grid dimensions) for guaranteed connectivity.
// Non-tree walls encode the compressed, optionally encrypted file data.
// ============================================================

// --- Seeded PRNG (Linear Congruential Generator) ---

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state;
  };
}

// --- Wall ID scheme ---
// Vertical walls (between rows r and r+1 at column c):
//   id = r * cols + c, for r in [0..rows-2], c in [0..cols-1]
// Horizontal walls (between columns c and c+1 at row r):
//   id = (rows-1)*cols + r*(cols-1) + c, for r in [0..rows-1], c in [0..cols-2]

function vertWallId(r: number, c: number, cols: number): number {
  return r * cols + c;
}

function horizWallId(r: number, c: number, rows: number, cols: number): number {
  return (rows - 1) * cols + r * (cols - 1) + c;
}

function wallIdToCell(id: number, rows: number, cols: number): [number, number] {
  const vertCount = (rows - 1) * cols;
  if (id < vertCount) {
    const r = (id / cols) | 0;
    const c = id % cols;
    return [2 * r + 2, 2 * c + 1];
  } else {
    const hId = id - vertCount;
    const cw = cols - 1;
    const r = (hId / cw) | 0;
    const c = hId % cw;
    return [2 * r + 1, 2 * c + 2];
  }
}

// --- Deterministic spanning tree via randomized DFS ---
// Seeded from grid dimensions only — no data dependency.

function generateSpanningTree(rows: number, cols: number): Set<number> {
  const rng = createRng(rows * 100003 + cols * 10007 + 7);
  const totalRooms = rows * cols;
  const visited = new Uint8Array(totalRooms);
  const tree = new Set<number>();
  const stack = new Int32Array(totalRooms);
  let stackTop = 0;

  stack[stackTop++] = 0;
  visited[0] = 1;

  const nRoom = new Int32Array(4);
  const nWall = new Int32Array(4);

  while (stackTop > 0) {
    const roomIdx = stack[stackTop - 1];
    const r = (roomIdx / cols) | 0;
    const c = roomIdx % cols;
    let nCount = 0;

    if (c + 1 < cols && !visited[roomIdx + 1]) {
      nRoom[nCount] = roomIdx + 1;
      nWall[nCount] = horizWallId(r, c, rows, cols);
      nCount++;
    }
    if (r + 1 < rows && !visited[roomIdx + cols]) {
      nRoom[nCount] = roomIdx + cols;
      nWall[nCount] = vertWallId(r, c, cols);
      nCount++;
    }
    if (c > 0 && !visited[roomIdx - 1]) {
      nRoom[nCount] = roomIdx - 1;
      nWall[nCount] = horizWallId(r, c - 1, rows, cols);
      nCount++;
    }
    if (r > 0 && !visited[roomIdx - cols]) {
      nRoom[nCount] = roomIdx - cols;
      nWall[nCount] = vertWallId(r - 1, c, cols);
      nCount++;
    }

    if (nCount > 0) {
      for (let i = nCount - 1; i > 0; i--) {
        const j = rng() % (i + 1);
        let tmp: number;
        tmp = nRoom[i]; nRoom[i] = nRoom[j]; nRoom[j] = tmp;
        tmp = nWall[i]; nWall[i] = nWall[j]; nWall[j] = tmp;
      }
      visited[nRoom[0]] = 1;
      tree.add(nWall[0]);
      stack[stackTop++] = nRoom[0];
    } else {
      stackTop--;
    }
  }

  return tree;
}

// --- Data wall enumeration (deterministic order) ---

function enumerateDataWalls(rows: number, cols: number, tree: Set<number>): Int32Array {
  const totalWalls = (rows - 1) * cols + rows * (cols - 1);
  const buf = new Int32Array(totalWalls);
  let count = 0;
  for (let id = 0; id < totalWalls; id++) {
    if (!tree.has(id)) buf[count++] = id;
  }
  return buf.subarray(0, count);
}

// --- Encryption (XOR with seeded keystream) ---

function deriveKeyStream(password: string, length: number): Uint8Array {
  const enc = new TextEncoder();
  const pwdBytes = enc.encode(password);
  let seed = 5381;
  for (let i = 0; i < pwdBytes.length; i++) {
    seed = ((seed << 5) + seed + pwdBytes[i]) >>> 0;
  }
  const rng = createRng(seed);
  const stream = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    stream[i] = (rng() >>> 16) & 0xff;
  }
  return stream;
}

function xorCrypt(data: Uint8Array, password: string): Uint8Array {
  const key = deriveKeyStream(password, data.length);
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i];
  }
  return result;
}

// --- Header: 32-bit originalSize + 32-bit compressedSize = 64 bits ---

const HEADER_BITS = 64;

function encodeHeader(originalSize: number, compressedSize: number): number[] {
  const bits = new Array(64);
  for (let i = 0; i < 32; i++) bits[i] = (originalSize >>> (31 - i)) & 1;
  for (let i = 0; i < 32; i++) bits[32 + i] = (compressedSize >>> (31 - i)) & 1;
  return bits;
}

function decodeHeader(bits: number[]): { originalSize: number; compressedSize: number } {
  let originalSize = 0;
  for (let i = 0; i < 32; i++) originalSize = ((originalSize << 1) | (bits[i] & 1)) >>> 0;
  let compressedSize = 0;
  for (let i = 0; i < 32; i++) compressedSize = ((compressedSize << 1) | (bits[32 + i] & 1)) >>> 0;
  return { originalSize, compressedSize };
}

// --- Byte ↔ Bit helpers ---

function bytesToBits(data: Uint8Array): number[] {
  const bits = new Array(data.length * 8);
  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    const base = i * 8;
    bits[base] = (b >> 7) & 1;
    bits[base + 1] = (b >> 6) & 1;
    bits[base + 2] = (b >> 5) & 1;
    bits[base + 3] = (b >> 4) & 1;
    bits[base + 4] = (b >> 3) & 1;
    bits[base + 5] = (b >> 2) & 1;
    bits[base + 6] = (b >> 1) & 1;
    bits[base + 7] = b & 1;
  }
  return bits;
}

function bitsToBytes(bits: number[], byteCount: number): Uint8Array {
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    let byte = 0;
    const base = i * 8;
    for (let j = 0; j < 8; j++) {
      const idx = base + j;
      byte = (byte << 1) | (idx < bits.length ? (bits[idx] & 1) : 0);
    }
    bytes[i] = byte;
  }
  return bytes;
}

// ============================================================
// ENCODE
// ============================================================

export interface EncodeResult {
  maze: number[][];
  path: [number, number][];
  gridRows: number;
  gridCols: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  mazeWidth: number;
  mazeHeight: number;
  pathLength: number;
  solveTimeMs: number;
  totalTimeMs: number;
}

export function encode(fileData: ArrayBuffer, password?: string): EncodeResult {
  const t0 = performance.now();
  const raw = new Uint8Array(fileData);
  const originalSize = raw.length;

  // 1. Compress
  const compressed = deflate(raw);
  const compressedSize = compressed.length;

  // 2. Encrypt
  const processed = password ? xorCrypt(compressed, password) : compressed;

  // 3. Build data bits: header + payload
  const headerBits = encodeHeader(originalSize, compressedSize);
  const payloadBits = bytesToBits(processed);
  const allBits = new Array(HEADER_BITS + payloadBits.length);
  for (let i = 0; i < HEADER_BITS; i++) allBits[i] = headerBits[i];
  for (let i = 0; i < payloadBits.length; i++) allBits[HEADER_BITS + i] = payloadBits[i];

  // 4. Grid dimensions
  const needed = allBits.length;
  const side = Math.ceil(Math.sqrt(needed)) + 2;
  const gridRows = Math.max(side, 4);
  const gridCols = Math.max(side, 4);

  // 5. Spanning tree
  const tree = generateSpanningTree(gridRows, gridCols);

  // 6. Data walls
  const dataWalls = enumerateDataWalls(gridRows, gridCols, tree);

  // 7. Build maze grid
  const mazeH = 2 * gridRows + 1;
  const mazeW = 2 * gridCols + 1;
  const maze: number[][] = [];
  for (let i = 0; i < mazeH; i++) maze.push(new Array(mazeW).fill(1));

  // Open room centres
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      maze[2 * r + 1][2 * c + 1] = 0;
    }
  }

  // Open tree walls (guaranteed passages)
  for (const wid of tree) {
    const [mr, mc] = wallIdToCell(wid, gridRows, gridCols);
    maze[mr][mc] = 0;
  }

  // Set data walls: bit value → wall state (1 = wall, 0 = passage)
  for (let i = 0; i < dataWalls.length; i++) {
    const bit = i < allBits.length ? allBits[i] : 0;
    const [mr, mc] = wallIdToCell(dataWalls[i], gridRows, gridCols);
    maze[mr][mc] = bit;
  }

  // Entry and exit
  maze[1][0] = 0;
  maze[mazeH - 2][mazeW - 1] = 0;

  // 8. Solve
  const tSolve = performance.now();
  const path = solveMaze(maze);
  const solveTimeMs = performance.now() - tSolve;
  const totalTimeMs = performance.now() - t0;

  return {
    maze,
    path,
    gridRows,
    gridCols,
    originalSize,
    compressedSize,
    compressionRatio: originalSize > 0 ? compressedSize / originalSize : 0,
    mazeWidth: mazeW,
    mazeHeight: mazeH,
    pathLength: path.length,
    solveTimeMs,
    totalTimeMs,
  };
}

// ============================================================
// DECODE
// ============================================================

export function decode(maze: number[][], password?: string): Uint8Array {
  const mazeH = maze.length;
  const mazeW = maze[0].length;
  const gridRows = (mazeH - 1) / 2;
  const gridCols = (mazeW - 1) / 2;

  if (!Number.isInteger(gridRows) || !Number.isInteger(gridCols) || gridRows < 2 || gridCols < 2) {
    throw new Error('Invalid maze dimensions');
  }

  const tree = generateSpanningTree(gridRows, gridCols);
  const dataWalls = enumerateDataWalls(gridRows, gridCols, tree);

  // Read data bits from maze
  const allBits: number[] = new Array(dataWalls.length);
  for (let i = 0; i < dataWalls.length; i++) {
    const [mr, mc] = wallIdToCell(dataWalls[i], gridRows, gridCols);
    allBits[i] = maze[mr][mc] & 1;
  }

  // Header
  const { originalSize, compressedSize } = decodeHeader(allBits);

  // Extract payload
  const payloadBits = allBits.slice(HEADER_BITS, HEADER_BITS + compressedSize * 8);
  const processed = bitsToBytes(payloadBits, compressedSize);

  // Decrypt
  const compressed = password ? xorCrypt(processed, password) : processed;

  // Decompress and copy into a fresh ArrayBuffer-backed Uint8Array
  const raw = inflate(compressed);
  const result = new Uint8Array(originalSize);
  result.set(raw.subarray(0, originalSize));
  return result;
}

// ============================================================
// BFS SOLVER (optimised flat-array)
// ============================================================

export function solveMaze(maze: number[][]): [number, number][] {
  const H = maze.length;
  const W = maze[0].length;
  const size = H * W;

  const parent = new Int32Array(size).fill(-2);
  const startIdx = 1 * W + 0;
  const goalIdx = (H - 2) * W + (W - 1);

  parent[startIdx] = -1;
  const queue = new Int32Array(size);
  let head = 0;
  let tail = 0;
  queue[tail++] = startIdx;

  while (head < tail) {
    const idx = queue[head++];
    if (idx === goalIdx) break;

    const y = (idx / W) | 0;
    const x = idx % W;

    if (x + 1 < W) {
      const n = idx + 1;
      if (parent[n] === -2 && maze[y][x + 1] === 0) { parent[n] = idx; queue[tail++] = n; }
    }
    if (y + 1 < H) {
      const n = idx + W;
      if (parent[n] === -2 && maze[y + 1][x] === 0) { parent[n] = idx; queue[tail++] = n; }
    }
    if (x > 0) {
      const n = idx - 1;
      if (parent[n] === -2 && maze[y][x - 1] === 0) { parent[n] = idx; queue[tail++] = n; }
    }
    if (y > 0) {
      const n = idx - W;
      if (parent[n] === -2 && maze[y - 1][x] === 0) { parent[n] = idx; queue[tail++] = n; }
    }
  }

  if (parent[goalIdx] === -2) {
    throw new Error('No path found from entry to exit');
  }

  const path: [number, number][] = [];
  let cur = goalIdx;
  while (cur !== -1) {
    path.push([(cur / W) | 0, cur % W]);
    cur = parent[cur];
  }
  path.reverse();
  return path;
}
