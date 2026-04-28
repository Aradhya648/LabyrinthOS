import os
import sys

# Ensure src is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from labyrinthos.core import encode, decode, generate_maze, read_bytes, validate


def test_encode_decode_roundtrip():
    data = b"Hello, LabyrinthOS!"
    encoded = encode(data)
    assert decode(encoded) == data


def test_validation_pass(tmp_path):
    data = b"A" * 64
    p = tmp_path / "test.bin"
    p.write_bytes(data)
    loaded = read_bytes(str(p))
    maze = generate_maze(loaded)
    assert validate(maze, loaded) is True
