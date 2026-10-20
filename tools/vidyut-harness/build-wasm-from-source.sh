#!/usr/bin/env bash
# ==============================================================================
# Vidyut WebAssembly Build Script from Source (Linux / macOS)
# Clones ambuda-org/vidyut and compiles Rust crates to WebAssembly using wasm-pack
# ==============================================================================

set -e

echo "=== 1. Checking Prerequisites ==="
command -v git >/dev/null 2>&1 || { echo "Error: git is required."; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "Error: Rust and cargo are required. Install from https://rustup.rs"; exit 1; }
command -v wasm-pack >/dev/null 2>&1 || { echo "Error: wasm-pack is required. Run 'cargo install wasm-pack'"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="$SCRIPT_DIR/../../_vidyut_build_temp"

echo "=== 2. Cloning Upstream Vidyut Repository ==="
rm -rf "$WORK_DIR"
git clone --depth 1 https://github.com/ambuda-org/vidyut.git "$WORK_DIR"

cd "$WORK_DIR"
GIT_COMMIT=$(git rev-parse HEAD)
echo "Cloned upstream Vidyut at commit: $GIT_COMMIT"

echo "=== 3. Building WebAssembly Module ==="
# Compiling vidyut-prakriya or wasm bindings
cd "$WORK_DIR/vidyut-prakriya"
wasm-pack build --target web --release

echo "=== 4. Build completed successfully ==="
echo "Artifacts are ready in: $WORK_DIR/vidyut-prakriya/pkg"
echo "To deploy to project: copy $WORK_DIR/vidyut-prakriya/pkg/*.wasm to project distribution."
