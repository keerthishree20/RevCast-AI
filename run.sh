#!/usr/bin/env bash
# run.sh — Train the RevCast AI elasticity model and produce pickle/model.pkl
#
# Usage:
#   chmod +x run.sh
#   ./run.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "== RevCast AI model training =="

# Create output directory
mkdir -p pickle

# Use python3 if available, fall back to python
PYTHON_BIN="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_BIN="python"
fi

# Ensure dependencies are present (numpy, pandas, scikit-learn)
echo "Checking dependencies..."
"$PYTHON_BIN" -c "import numpy, pandas, sklearn" 2>/dev/null || {
    echo "Installing missing dependencies..."
    "$PYTHON_BIN" -m pip install --quiet numpy pandas scikit-learn --break-system-packages 2>/dev/null \
        || "$PYTHON_BIN" -m pip install --quiet numpy pandas scikit-learn
}

echo "Running train_model.py..."
"$PYTHON_BIN" train_model.py

echo "== Done. Model saved at pickle/model.pkl =="
