import hashlib
from typing import List

def _key_stream(password: str, length: int) -> List[int]:
    """Generate a deterministic stream of bits from password."""
    # Derive a long key using SHA256 in a stream
    key_bytes = hashlib.sha256(password.encode()).digest()
    # Repeat key bytes to cover length
    stream = []
    for i in range(length):
        b = key_bytes[i % len(key_bytes)]
        bit = (b >> (i % 8)) & 1
        stream.append(bit)
    return stream

def encrypt_bits(bits: List[int], password: str) -> List[int]:
    keystream = _key_stream(password, len(bits))
    return [b ^ k for b, k in zip(bits, keystream)]

def decrypt_bits(encrypted_bits: List[int], password: str) -> List[int]:
    # XOR is symmetric
    return encrypt_bits(encrypted_bits, password)