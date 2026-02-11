#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-$ROOT_DIR/artifacts}"
ZIP_NAME="${2:-ironweb-modificado.zip}"

mkdir -p "$OUT_DIR"
cd "$ROOT_DIR"

zip -r "$OUT_DIR/$ZIP_NAME" . \
  -x "node_modules/*" \
     ".next/*" \
     ".git/*" \
     "artifacts/*" \
     "*.log" \
     "tsconfig.tsbuildinfo"

echo "ZIP generado en: $OUT_DIR/$ZIP_NAME"
