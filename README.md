# LabyrinthOS — Spatial File Encoding Engine

**Experimental computational storage where files become deterministic mazes; shortest paths encode reversible storage.**

## Concept

Traditional storage writes bytes to disk. LabyrinthOS transforms a file's binary data into a **deterministic branching maze**, then uses the **shortest path** through that maze as a reversible storage layer.

```
file → compress → encrypt → bits → maze grid → BFS solve → path
path → maze grid → bits → decrypt → decompress → original file
```

The maze is fully determined by the file contents; decoding reads the maze structure to perfectly reconstruct the original data.

## Architecture (v2)

```
Input file
  ↓
Deflate compression (zlib/pako)
  ↓
Optional XOR encryption (seeded keystream)
  ↓
64-bit header (original size + compressed size)
  ↓
Bit encoding into maze data walls
  ↓
Deterministic spanning tree (DFS, seeded from grid dimensions)
  ↓
Maze grid: tree walls (passages) + data walls (file bits)
  ↓
BFS shortest path from entry to exit
  ↓
Decode: read data walls → header → decompress → original file
```

### Key Design

- **Spanning tree** generated via randomized DFS seeded purely from grid dimensions ensures every maze is connected (entry to exit) regardless of data content
- **Non-tree walls** encode compressed file data — wall (1) or passage (0) per bit
- **Compression** (deflate) reduces data before encoding, producing smaller mazes
- **Determinism**: same file always produces the same maze
- **Reversibility**: maze structure encodes all information needed for reconstruction
- **SHA-256 validation** confirms bit-perfect reconstruction

### Data Capacity

For a grid of R×C rooms: `(R-1)×(C-1)` data bits are available. Grid dimensions are computed to be roughly square from the compressed data size plus 64-bit header.

## Live Demo

**https://labyrinth-os-xbmt.vercel.app**

The web interface runs the full engine client-side (TypeScript). Upload a file, optionally set a password, and watch it become a maze.

## Quickstart

### Python (reference implementation)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run demo
PYTHONPATH=src python3 examples/demo.py examples/sample.txt

# Run tests
pytest tests/
```

### Web frontend (deployed on Vercel)

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

## Project Structure

```
LabyrinthOS/
├── src/labyrinthos/
│   ├── maze_generator.py   # v2 spanning-tree maze + compression
│   ├── path_solver.py      # BFS shortest path
│   ├── decoder.py          # Maze → original file reconstruction
│   ├── file_ingestion.py   # File → bytes → bitstream
│   ├── crypto.py           # XOR encryption (legacy bit-level)
│   ├── compression.py      # Ratio metrics
│   ├── visualizer.py       # ASCII rendering
│   ├── maze_io.py          # Save/load maze as text
│   └── cli.py              # CLI interface
├── frontend/
│   ├── src/lib/labyrinthos/
│   │   ├── maze.ts         # Core engine (encode/decode/BFS)
│   │   ├── crypto.ts       # SHA-256
│   │   ├── bits.ts         # Byte/bit conversion
│   │   └── index.ts        # Exports
│   ├── src/components/
│   │   └── MazeCanvas.tsx   # Animated canvas renderer
│   ├── src/pages/
│   │   └── index.tsx        # Three-panel UI
│   └── package.json
├── tests/
│   ├── test_core.py         # Encode/decode roundtrip + validation
│   ├── test_file_ingestion.py
│   ├── test_compression.py
│   └── test_extras.py
├── examples/
│   ├── demo.py
│   └── sample.txt
└── vercel.json
```

## How It Works

### Encoding

1. **Compress** input file using deflate (zlib)
2. **Encrypt** (optional) compressed bytes via XOR with a deterministic keystream derived from password
3. **Build header**: 32-bit original size + 32-bit compressed size = 64 bits
4. **Compute grid**: `side = ceil(sqrt(header_bits + payload_bits)) + 2`
5. **Generate spanning tree**: randomized DFS seeded from `(rows * 100003 + cols * 10007 + 7)` — deterministic for any grid size, no data dependency
6. **Assign data bits** to non-tree walls in fixed order (vertical walls first, then horizontal, top-to-bottom left-to-right)
7. **Build maze grid**: `(2*rows+1) × (2*cols+1)` cells — room centres always open, tree walls always open, data walls set to bit value
8. **Open entry** `(1,0)` and **exit** `(H-2, W-1)`

### Decoding

1. **Derive grid dimensions** from maze size: `rows = (H-1)/2`, `cols = (W-1)/2`
2. **Regenerate spanning tree** (same deterministic algorithm)
3. **Read data walls** in same order → bit sequence
4. **Extract header** (first 64 bits) → original size, compressed size
5. **Extract payload** → compressed bytes
6. **Decrypt** (if password) → compressed bytes
7. **Decompress** → original file

### BFS Solver

Flat-array BFS from entry to exit. Pre-allocates parent array as `Int32Array` for performance. Finds true shortest path through the branching maze.

## Animation

The web UI provides three animation phases:

1. **Maze build**: walls appear progressively (row sweep)
2. **Path traversal**: shortest path highlights cell-by-cell with cyan→green gradient
3. **Validation**: SHA-256 match confirmation

Animations are frontend-only and do not affect backend computation.

## Testing

```bash
pytest tests/ -v
```

Tests cover:
- Encode/decode roundtrip (text, binary, empty, large files)
- Deterministic repeatability
- SHA-256 validation pass/fail
- Encryption roundtrip + wrong password
- Path existence
- Maze save/load
- Compression ratio computation

## Deployment

The frontend deploys to Vercel with `rootDirectory: frontend` set in project settings.

```bash
# Auto-deploys on push to main via GitHub integration
git push origin main
```

## Roadmap

- **Chunk processing**: split large files into independent maze blocks
- **Stronger encryption**: AES-256 key derivation replacing XOR
- **Hidden storage**: multiple valid paths encoding different files
- **Split-cloud mode**: maze seed remote + path local
- **Entropy-zone visualization**: color-code maze regions by data type
- **WebAssembly solver**: move BFS to WASM for large mazes
- **Streaming**: process files larger than memory

---

*Built as an experimental research prototype. Not for production use.*
