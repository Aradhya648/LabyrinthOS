import pytest
from labyrinthos.file_ingestion import read_bytes
from labyrinthos.maze_generator import generate_maze, decode_maze
from labyrinthos.decoder import decode_bits_from_maze, validate
from labyrinthos.path_solver import solve_maze

def test_encode_decode_roundtrip(tmp_path):
    data = b"LabyrinthOS prototype test"
    p = tmp_path / "in.bin"
    p.write_bytes(data)
    loaded = read_bytes(str(p))
    maze = generate_maze(loaded)
    recovered = decode_bits_from_maze(maze)
    assert recovered == loaded

def test_validation_pass(tmp_path):
    data = b"validation test data"
    p = tmp_path / "in.bin"
    p.write_bytes(data)
    loaded = read_bytes(str(p))
    maze = generate_maze(loaded)
    assert validate(maze) is True
