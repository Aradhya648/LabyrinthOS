#!/bin/bash
# Run LabyrinthOS demo with a file argument.
if [ -z "$1" ]; then
  echo "Usage: $0 <file>"
  exit 1
fi
PYTHONPATH=src python3 examples/demo.py "$1"