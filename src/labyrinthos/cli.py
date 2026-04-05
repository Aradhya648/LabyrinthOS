import argparse
from labyrinthos.file_ingestion import read_bytes, bytes_to_bitstream

def main():
    parser = argparse.ArgumentParser(description="LabyrinthOS CLI")
    parser.add_argument("file", help="Path to input file")
    parser.add_argument("--bits", action="store_true", help="Output bitstream")
    args = parser.parse_args()

    data = read_bytes(args.file)
    print(f"Read {len(data)} bytes from {args.file}")
    if args.bits:
        bits = list(bytes_to_bitstream(data))
        print(f"Bitstream length: {len(bits)} bits")
        print("First 64 bits:", bits[:64])

if __name__ == "__main__":
    main()