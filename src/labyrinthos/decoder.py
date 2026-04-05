from .maze_generator import decode_maze
import hashlib
from typing import Optional, List

def decode_bits_from_maze(maze: List[List[int]], password: Optional[str] = None) -> bytes:
    """Reconstruct original file bytes from maze."""
    return decode_maze(maze, password=password)

def validate(maze: List[List[int]], original_data: bytes, password: Optional[str] = None) -> bool:
    """Verify round-trip correctness via SHA256."""
    try:
        recovered = decode_bits_from_maze(maze, password=password)
        h1 = hashlib.sha256(original_data).hexdigest()
        h2 = hashlib.sha256(recovered).hexdigest()
        return h1 == h2
    except Exception:
        return False
