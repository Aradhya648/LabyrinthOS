import os
from typing import BinaryIO, Generator

def read_bytes(filepath: str) -> bytes:
    """Read file as raw bytes. Raises if unsupported or too large."""
    if not os.path.isfile(filepath):
        raise FileNotFoundError(f"Not found: {filepath}")
    size = os.path.getsize(filepath)
    if size > 10 * 1024 * 1024:  # 10 MB limit for now
        raise ValueError("File too large; max 10 MB")
    with open(filepath, "rb") as f:
        data = f.read()
    return data

def bytes_to_bitstream(data: bytes) -> Generator[int, None, None]:
    """Yield bits (0/1) from bytes, MSB first, deterministically."""
    for b in data:
        for i in range(7, -1, -1):
            yield (b >> i) & 1

def bitstream_to_bytes(bits: Generator[int, None, None]) -> bytes:
    """Reconstruct bytes from a bitstream (MSB first)."""
    out = bytearray()
    cur = 0
    count = 0
    for bit in bits:
        cur = (cur << 1) | (bit & 1)
        count += 1
        if count == 8:
            out.append(cur)
            cur = 0
            count = 0
    if count > 0:
        cur <<= (8 - count)
        out.append(cur)
    return bytes(out)
