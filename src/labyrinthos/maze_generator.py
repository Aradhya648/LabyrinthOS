import hashlib
from typing import List, Tuple

from .file_ingestion import bytes_to_bitstream

def seed_from_bytes(data: bytes) -> int:
    """Derive an integer seed from file bytes using SHA256."""
    h = hashlib.sha256(data).digest()
    return int.from_bytes(h[:8], "big")

def deterministic_rand(seed: int) -> callable:
    """Return a simple deterministic random number generator (LCG)."""
    a = 1664525
    c = 1013904223
    m = 2**32
    state = seed % m
    def randi():
        nonlocal state
        state = (a * state + c) % m
        return state
    return randi

def dimensions_from_seed(seed: int, min_size: int = 11, max_size: int = 31) -> Tuple[int, int]:
    """Determine maze width/height from seed, within bounds."""
    rng = deterministic_rand(seed)
    w = min_size + rng() % (max_size - min_size + 1)
    h = min_size + rng() % (max_size - min_size + 1)
    return w, h

def generate_maze(data: bytes, password: str = None) -> List[List[int]]:
    """
    Deterministic 'maze' that is a horizontal corridor of height 3.
    The top row encodes file bits as walls (1) or empty (0).
    Optional password encrypts the bits before encoding.
    """
    # Get bits from file
    bits = list(bytes_to_bitstream(data))
    if password:
        from .crypto import encrypt_bits
        bits = encrypt_bits(bits, password)

    n = len(bits)
    width = n + 2
    height = 3

    # Initialize all walls (1)
    grid = [[1 for _ in range(width)] for _ in range(height)]

    # Carve middle corridor
    for x in range(width):
        grid[1][x] = 0

    # Encode bits in top row: 1=wall, 0=empty (carve through wall where 0)
    for i, bit in enumerate(bits):
        grid[0][i+1] = bit

    # Entrance and exit already 0 from corridor pass
    return grid