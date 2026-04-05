import pytest
from labyrinthos.maze_io import save_maze, load_maze
from labyrinthos.file_ingestion import read_bytes
from labyrinthos.maze_generator import generate_maze
from labyrinthos.crypto import encrypt_bits, decrypt_bits

def test_save_load_roundtrip(tmp_path):
    data = b"Roundtrip test data"
    maze = generate_maze(data)
    out = tmp_path / "maze.txt"
    save_maze(maze, str(out))
    loaded = load_maze(str(out))
    assert loaded == maze

def test_encryption_roundtrip():
    bits = [1,0,1,1,0,0,1,0,0,1]
    pwd = "secret"
    enc = encrypt_bits(bits, pwd)
    dec = decrypt_bits(enc, pwd)
    assert dec == bits
    # wrong password yields different bits
    dec2 = decrypt_bits(enc, "wrong")
    assert dec2 != bits