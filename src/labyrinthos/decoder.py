from .file_ingestion import bitstream_to_bytes
from .crypto import decrypt_bits

def decode_bits_from_maze(maze: list, password: str = None) -> bytes:
    """
    Extract bits from the maze and reconstruct original file bytes.
    For corridor maze: bits are in top row (row 0) from col 1 to width-2.
    """
    if not maze or len(maze) < 2:
        raise ValueError("Invalid maze")
    width = len(maze[0])
    bits = []
    for x in range(1, width-1):
        bit = maze[0][x] & 1
        bits.append(bit)
    if password:
        bits = decrypt_bits(bits, password)
    return bitstream_to_bytes(iter(bits))

def validate(maze: list, original_data: bytes, password: str = None) -> bool:
    try:
        recovered = decode_bits_from_maze(maze, password=password)
        import hashlib
        h1 = hashlib.sha256(original_data).hexdigest()
        h2 = hashlib.sha256(recovered).hexdigest()
        return h1 == h2
    except Exception:
        return False