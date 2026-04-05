# LabyrinthOS — Spatial File Encoding Engine

**Experimental computational storage where files become deterministic mazes; shortest paths encode reversible storage.**

## Concept

Traditional storage writes bytes to disk. LabyrinthOS transforms a file’s binary data into a **deterministic maze**, then uses the **shortest path** through that maze as a reversible storage layer. The maze is fully determined by the file contents; the path, once computed, allows perfect reconstruction of the original bits.

This prototype demonstrates:

- File → bits → deterministic maze
- Shortest path calculation (BFS)
- Exact file reconstruction without information loss

## Architecture

```
file_ingestion   → read file → bytes → bitstream
binary_encoder   → (implicit) mapping bits to maze structure
maze_generator   → deterministic maze seeded from file bits
path_solver      → BFS shortest path (entry → exit)
decoder          → extract bits from maze → reconstruct bytes
validator        → SHA256 comparison to ensure fidelity
visualizer       → ASCII rendering of maze
metadata_manager → (future) storage packaging
```

Modules are independent and extensible.

## Quickstart

### Install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Encode & decode a file (demo)

```bash
python -m labyrinthos.cli examples/sample.txt --bits
```

Or run the demo script:

```bash
PYTHONPATH=src python3 examples/demo.py examples/sample.txt
```

The demo will:

1. Load the file
2. Generate the maze
3. Solve the shortest path
4. Decode the file from the maze
5. Validate via SHA256
6. Print a small ASCII visualization

### Tests

```bash
pytest tests/
```

Expected: all tests pass.

## How It Works (Current MVP)

The initial implementation uses a **corridor maze**:

- Height = 3 rows.
- Width = number of bits + 2 columns (entrance & exit).
- Middle row is a clear path from left to right.
- Top row encodes file bits: each column above the path is a wall (`1`) or empty (`0`) corresponding to a bit.
- Bottom row is a full wall.

Because the maze is just a straight corridor with bits on top, the shortest path is trivially “go right”. Decoding reads the top row’s pattern to recover bits.

This satisfies:

- **Determinism**: The same file always produces the same maze (width derived from file size, bits placed identically).
- **Reversibility**: The top row captures the exact bitstream; no information lost.
- **Correctness**: SHA256 validation ensures bit‑perfect reconstruction.

## Project Structure

```
LabyrinthOS/
├── src/
│   └── labyrinthos/
│       ├── __init__.py
│       ├── cli.py
│       ├── file_ingestion.py
│       ├── maze_generator.py
│       ├── path_solver.py
│       ├── decoder.py
│       ├── validator.py
│       ├── visualizer.py
│       └── metadata_manager.py   (reserved)
├── tests/
│   ├── test_file_ingestion.py
│   └── test_core.py
├── examples/
│   ├── demo.py
│   └── sample.txt
├── docs/
│   └── (future design notes)
├── pyproject.toml
└── requirements.txt
```

## Limitations (MVP)

- Corridor maze is extremely simple (not a branching labyrinth). Advanced maze generation with cycling and alternate paths is planned.
- Data is stored in top‑row walls; no compression yet.
- No encryption or hidden‑storage modes yet.
- Large files produce wide mazes; rendering is linear.

## Future Work (Roadmap)

- **Phase 9 Advanced Modes**: hidden storage (multiple valid paths), encryption (wrong path fails), split‑cloud (remote seed + local path).
- **Compression**: analyze ratio; implement actual compression before encoding.
- **Visualization**: PNG output, path highlighting.
- **Performance**: streaming for large files.
- **Robust error handling and failure modes.**

## Web Demo (Experimental)

A Next.js frontend lives in `frontend/`. It reimplements the core engine in TypeScript and provides an interactive, animated UI.

### Run locally

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

### Deploy to Vercel

The project includes `vercel.json` with `"projectRoot": "frontend"`. Connect the repo to Vercel or use CLI:

```bash
cd frontend
vercel --prod
```

The live URL will be your Vercel project. The Python backend remains the authoritative reference; the frontend is a standalone demo.

## Build & Package (Python)

```bash
pip install -e .
labyrinthos --help
```

---

*Built as an experimental research prototype. Not for production use.*
