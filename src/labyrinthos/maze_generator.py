"""
LabyrinthOS v2 — Spanning-tree maze with data encoding.

The maze uses a deterministic DFS spanning tree (seeded from grid dimensions)
for guaranteed connectivity. Non-tree walls encode compressed file data.
"""
import zlib
import hashlib
from typing import List, Tuple, Set, Optional

# --- Seeded PRNG (LCG, matches TypeScript implementation) ---

def create_rng(seed: int):
    state = seed & 0xFFFFFFFF
    def rng():
        nonlocal state
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        return state
    return rng


# --- Wall ID scheme ---
# Vertical walls (between rows r and r+1 at column c):
#   id = r * cols + c
# Horizontal walls (between columns c and c+1 at row r):
#   id = (rows-1)*cols + r*(cols-1) + c

def vert_wall_id(r: int, c: int, cols: int) -> int:
    return r * cols + c

def horiz_wall_id(r: int, c: int, rows: int, cols: int) -> int:
    return (rows - 1) * cols + r * (cols - 1) + c

def wall_id_to_cell(wid: int, rows: int, cols: int) -> Tuple[int, int]:
    vert_count = (rows - 1) * cols
    if wid < vert_count:
        r = wid // cols
        c = wid % cols
        return (2 * r + 2, 2 * c + 1)
    else:
        hid = wid - vert_count
        cw = cols - 1
        r = hid // cw
        c = hid % cw
        return (2 * r + 1, 2 * c + 2)


# --- Deterministic spanning tree (randomized DFS, seeded from grid dims) ---

def generate_spanning_tree(rows: int, cols: int) -> Set[int]:
    rng = create_rng(rows * 100003 + cols * 10007 + 7)
    total_rooms = rows * cols
    visited = bytearray(total_rooms)
    tree: Set[int] = set()
    stack = [0]
    visited[0] = 1

    while stack:
        room_idx = stack[-1]
        r = room_idx // cols
        c = room_idx % cols
        neighbors = []

        if c + 1 < cols and not visited[room_idx + 1]:
            neighbors.append((room_idx + 1, horiz_wall_id(r, c, rows, cols)))
        if r + 1 < rows and not visited[room_idx + cols]:
            neighbors.append((room_idx + cols, vert_wall_id(r, c, cols)))
        if c > 0 and not visited[room_idx - 1]:
            neighbors.append((room_idx - 1, horiz_wall_id(r, c - 1, rows, cols)))
        if r > 0 and not visited[room_idx - cols]:
            neighbors.append((room_idx - cols, vert_wall_id(r - 1, c, cols)))

        if neighbors:
            # Fisher-Yates shuffle
            for i in range(len(neighbors) - 1, 0, -1):
                j = rng() % (i + 1)
                neighbors[i], neighbors[j] = neighbors[j], neighbors[i]
            nr, wid = neighbors[0]
            visited[nr] = 1
            tree.add(wid)
            stack.append(nr)
        else:
            stack.pop()

    return tree


def enumerate_data_walls(rows: int, cols: int, tree: Set[int]) -> List[int]:
    total = (rows - 1) * cols + rows * (cols - 1)
    return [wid for wid in range(total) if wid not in tree]


# --- Encryption (XOR with seeded keystream, matches TS) ---

def derive_key_stream(password: str, length: int) -> bytes:
    pwd_bytes = password.encode('utf-8')
    seed = 5381
    for b in pwd_bytes:
        seed = ((seed << 5) + seed + b) & 0xFFFFFFFF
    rng = create_rng(seed)
    return bytes([(rng() >> 16) & 0xFF for _ in range(length)])


def xor_crypt(data: bytes, password: str) -> bytes:
    key = derive_key_stream(password, len(data))
    return bytes(a ^ b for a, b in zip(data, key))


# --- Header: 32-bit originalSize + 32-bit compressedSize = 64 bits ---

HEADER_BITS = 64

def encode_header(original_size: int, compressed_size: int) -> List[int]:
    bits = []
    for i in range(31, -1, -1):
        bits.append((original_size >> i) & 1)
    for i in range(31, -1, -1):
        bits.append((compressed_size >> i) & 1)
    return bits

def decode_header(bits: List[int]) -> Tuple[int, int]:
    original_size = 0
    for i in range(32):
        original_size = (original_size << 1) | (bits[i] & 1)
    compressed_size = 0
    for i in range(32, 64):
        compressed_size = (compressed_size << 1) | (bits[i] & 1)
    return original_size, compressed_size


# --- Byte <-> Bit conversion ---

def bytes_to_bits(data: bytes) -> List[int]:
    bits = []
    for b in data:
        for i in range(7, -1, -1):
            bits.append((b >> i) & 1)
    return bits

def bits_to_bytes(bits: List[int], byte_count: int) -> bytes:
    out = bytearray(byte_count)
    for i in range(byte_count):
        byte = 0
        base = i * 8
        for j in range(8):
            idx = base + j
            byte = (byte << 1) | (bits[idx] & 1 if idx < len(bits) else 0)
        out[i] = byte
    return bytes(out)


# --- ENCODE ---

def generate_maze(data: bytes, password: Optional[str] = None) -> List[List[int]]:
    """Encode file data into a branching maze."""
    original_size = len(data)

    # Compress
    compressed = zlib.compress(data)
    compressed_size = len(compressed)

    # Encrypt
    processed = xor_crypt(compressed, password) if password else compressed

    # Build data bits
    header_bits = encode_header(original_size, compressed_size)
    payload_bits = bytes_to_bits(processed)
    all_bits = header_bits + payload_bits

    # Grid dimensions
    import math
    needed = len(all_bits)
    side = int(math.ceil(math.sqrt(needed))) + 2
    grid_rows = max(side, 4)
    grid_cols = max(side, 4)

    # Spanning tree
    tree = generate_spanning_tree(grid_rows, grid_cols)
    data_walls = enumerate_data_walls(grid_rows, grid_cols, tree)

    # Build maze grid
    maze_h = 2 * grid_rows + 1
    maze_w = 2 * grid_cols + 1
    maze = [[1] * maze_w for _ in range(maze_h)]

    # Open room centres
    for r in range(grid_rows):
        for c in range(grid_cols):
            maze[2 * r + 1][2 * c + 1] = 0

    # Open tree walls
    for wid in tree:
        mr, mc = wall_id_to_cell(wid, grid_rows, grid_cols)
        maze[mr][mc] = 0

    # Set data walls
    for i, wid in enumerate(data_walls):
        bit = all_bits[i] if i < len(all_bits) else 0
        mr, mc = wall_id_to_cell(wid, grid_rows, grid_cols)
        maze[mr][mc] = bit

    # Entry and exit
    maze[1][0] = 0
    maze[maze_h - 2][maze_w - 1] = 0

    return maze


# --- DECODE ---

def decode_maze(maze: List[List[int]], password: Optional[str] = None) -> bytes:
    """Reconstruct original file from maze."""
    maze_h = len(maze)
    maze_w = len(maze[0])
    grid_rows = (maze_h - 1) // 2
    grid_cols = (maze_w - 1) // 2

    tree = generate_spanning_tree(grid_rows, grid_cols)
    data_walls = enumerate_data_walls(grid_rows, grid_cols, tree)

    # Read data bits
    all_bits = []
    for wid in data_walls:
        mr, mc = wall_id_to_cell(wid, grid_rows, grid_cols)
        all_bits.append(maze[mr][mc] & 1)

    # Header
    original_size, compressed_size = decode_header(all_bits)

    # Extract payload
    payload_bits = all_bits[HEADER_BITS:HEADER_BITS + compressed_size * 8]
    processed = bits_to_bytes(payload_bits, compressed_size)

    # Decrypt
    compressed = xor_crypt(processed, password) if password else processed

    # Decompress
    raw = zlib.decompress(compressed)
    return raw[:original_size]


# Legacy API compatibility
def seed_from_bytes(data: bytes) -> int:
    h = hashlib.sha256(data).digest()
    return int.from_bytes(h[:8], "big")
