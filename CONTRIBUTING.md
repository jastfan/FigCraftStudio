# Contributing to FigCraft Studio

Thank you for your interest in contributing to **FigCraft Studio**! FigCraft is a clean-room, pure Rust and open web interface design suite built for privacy, performance, 100% offline capability, and zero subscription models.

---

## 🏛️ Architecture & Crate Boundaries

FigCraft is structured as a Cargo workspace with strict crate layering to ensure clean separation of concerns:

| Crate / Path | Responsibility | Technologies / Rules |
|---|---|---|
| **`crates/geom`** | 2D Geometry primitives, affine transforms, Bézier curves | Pure math, `kurbo` based |
| **`crates/color`** | Color spaces (sRGB, Display P3), ICC color profiles, blend modes | Pure data, zero UI dependencies |
| **`crates/layout`** | Directional auto-layout solver, wrap, grid, constraints | Flexbox-inspired constraint solver |
| **`crates/doc`** | Persistent immutable scene graph & document state | `Arc`, structural sharing, `serde` |
| **`crates/engine`** | 400+ commands registry, undo/redo transaction stack | Command pattern, history snapshots |
| **`crates/render`** | Canvas rasterization, blend modes, shadows, blurs | `tiny-skia` renderer |
| **`crates/format`** | Native `.figcraft` zip format reader & writer | `zip`, `flate2`, strict schema validation |
| **`crates/ui-egui`** | Native desktop UI panels (Toolbar, Layers, Inspector, Dev) | `egui` 0.28 / 0.37, pure immediate mode |
| **`crates/mcp`** | Model Context Protocol server for AI coding agents | JSON-RPC 2.0 stdio |
| **`crates/collab-net`**| Multiplayer state, live cursors, CRDT delta synchronization | P2P mesh & WebSocket transport |
| **`apps/figcraft`** | Native desktop executable | `eframe` + `tiny-skia` + `AccessKit` |
| **`apps/figcraft-web`**| Pure client-side browser studio | HTML5 Canvas, WebAssembly, zero-server |
| **`apps/figcraft-cli`**| Headless CLI exporter and MCP daemon | Stdio, batch render, CI automation |
| **`apps/figcraft-server`**| Lightweight collaboration relay server | WebSocket synchronization |

---

## 🛠️ Development Setup

### Prerequisites
- **Rust**: Latest stable toolchain (`rustup update stable`).
- **Windows**: Microsoft Visual C++ Build Tools (for native desktop `link.exe`).
  ```powershell
  winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  ```
- **Linux**: Standard build tools & X11/Wayland dev libraries:
  ```bash
  sudo apt install build-essential libxcb-render0-dev libxcb-shape0-dev libxcb-xfixes0-dev libxkbcommon-dev libasound2-dev
  ```
- **macOS**: Xcode Command Line Tools.

### Building & Running

```bash
# Run native desktop studio
cargo run -p figcraft

# Run CLI verification
cargo run -p figcraft-cli -- --help

# Run MCP server for AI agents
cargo run -p figcraft-cli -- --mcp

# Launch Web Studio locally
# Open http://localhost:3030 in any modern browser
python -m http.server 3030
# Or double click Launch_Studio.bat on Windows
```

---

## 🧪 Testing & Code Quality

Before opening a pull request, verify that all crates compile cleanly and pass lints:

```bash
# 1. Check all workspace crates
cargo check --workspace --all-targets

# 2. Run unit & integration test suite
cargo test --workspace

# 3. Verify format adherence
cargo fmt --all -- --check

# 4. Strict clippy lints
cargo clippy --workspace --all-targets -- -D warnings
```

### Code Style Guidelines
- **No Unwraps in Production Paths**: Prefer returning `Result<T, DocError>` or `Option<T>` rather than panic-inducing `.unwrap()` or `.expect()`.
- **Pure Functions in Math & Layout**: Geometry and layout operations must be pure, deterministic, and free of side effects.
- **Web App Parity**: When introducing new scene graph node types or document properties, ensure both the Rust `format` crate and the web `FormatReader` (`js/engine/format-reader.js`) maintain 1:1 schema parity.

---

## 🤝 Pull Request Process

1. Fork the repository and create your feature branch from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Commit your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "feat(layout): implement wrap auto-layout constraint solver"
   ```
3. Push to your fork and submit a Pull Request.
4. Ensure CI checks pass. Maintainers will review and provide feedback.

Thank you for helping make FigCraft the ultimate open-source design tool!
