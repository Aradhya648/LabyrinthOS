import pytest
from labyrinthos.file_ingestion import read_bytes, bytes_to_bitstream, bitstream_to_bytes

def test_roundtrip(tmp_path):
    data = b"Hello, LabyrinthOS!"
    p = tmp_path / "test.txt"
    p.write_bytes(data)
    loaded = read_bytes(str(p))
    assert loaded == data
    bits = list(bytes_to_bitstream(loaded))
    recovered = bitstream_to_bytes(iter(bits))
    assert recovered == data