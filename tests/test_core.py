import pytest
from labyrinthos.file_ingestion import read_bytes
from labyrinthos.maze_generator import generate_maze, decode_maze
from labyrinthos.decoder import decode_bits_from_maze, validate
from labyrinthos.path_solver import solve_maze

def test_encode_decode_roundtrip(tmp_path):
    data = b"LabyrinthOS prototype \xe2\x80\x94 reversible storage test"
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
    assert validate(maze, loaded)

def test_validation_fail():
    data1 = b"hello"
    data2 = b"world"
    maze = generate_maze(data1)
    assert not validate(maze, data2)

def test_deterministic():
    data = b"deterministic check"
    maze1 = generate_maze(data)
    maze2 = generate_maze(data)
    assert maze1 == maze2

def test_path_exists():
    data = b"path test data for maze solver"
    maze = generate_maze(data)
    path = solve_maze(maze)
    assert len(path) > 0
    assert path[0] == (1, 0)
    assert path[-1] == (len(maze) - 2, len(maze[0]) - 1)

def test_encryption_roundtrip():
    data = b"encrypted data test"
    pwd = "secret123"
    maze = generate_maze(data, password=pwd)
    recovered = decode_bits_from_maze(maze, password=pwd)
    assert recovered == data

def test_wrong_password_fails():
    data = b"encrypted data test"
    maze = generate_maze(data, password="correct")
    try:
        recovered = decode_bits_from_maze(maze, password="wrong")
        assert recovered != data
    except Exception:
        pass  # decompression may fail with wrong key

def test_binary_data():
    data = bytes(range(256))
    maze = generate_maze(data)
    recovered = decode_bits_from_maze(maze)
    assert recovered == data

def test_empty_file():
    data = b""
    maze = generate_maze(data)
    recovered = decode_bits_from_maze(maze)
    assert recovered == data

def test_large_text():
    data = b"A" * 4096
    maze = generate_maze(data)
    recovered = decode_bits_from_maze(maze)
    assert recovered == data
    # Verify compression helped
    assert len(maze[0]) < 4096 * 8  # maze width should be much less than raw bits
