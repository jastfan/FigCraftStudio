# Attribution and Third-Party Notices

FigCraft Studio is an open-source, clean-room interface design suite. This document lists third-party assets, design tokens, fonts, and dependencies utilized or referenced in FigCraft Studio.

---

## 🎨 Brand Identity & Mascots
- **Jackal Mascot Logo (`assets/figcraft-logo.png`, `assets/figcraft-jackal.png`)**: Original geometric vector origami artwork created specifically for FigCraft Studio. Released under CC0 / Public Domain for project use.

---

## 📱 Official Sample Design Archives
The sample design documents located in `official-samples/` are bundled for compatibility testing, rendering verification, and onboarding:
- `ridgeline-app.figcraft`
- `ridgeline-onboarding.figcraft`
- `ridgeline-design-system.figcraft`
- `ridgeline-studio-dashboard.figcraft`
- `glass-and-vectors.figcraft`

These files originate from open-source clean-room design specifications in the ArtCraft / Storytold ecosystem (licensed under MIT / Apache-2.0).

---

## 🔤 Typography & Open Fonts
- **Inter**: Designed by Rasmus Andersson. Licensed under the [SIL Open Font License 1.1](https://scripts.sil.org/OFL).
- **JetBrains Mono**: Designed by Philipp Nurullin, Konstantin Bulenkov, JetBrains. Licensed under the SIL Open Font License 1.1.

---

## 🦀 Rust Crate Dependencies
All native Rust dependencies in `Cargo.lock` maintain their respective permissive open-source licenses (MIT, Apache-2.0, BSD-3-Clause, ISC):
- `egui` / `epaint` / `eframe`: MIT OR Apache-2.0 (Emil Ernerfeldt)
- `tiny-skia`: BSD-3-Clause (Yevhenii Reizner)
- `kurbo`: MIT OR Apache-2.0 (Raph Levien and Linebender contributors)
- `serde` / `serde_json`: MIT OR Apache-2.0 (Erick Tryzelaar and David Tolnay)
- `zip`: MIT (Klaus Post and contributors)
- `tokio`: MIT (Tokio Contributors)
