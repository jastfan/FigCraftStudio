#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // Hide console window on Windows release

mod app;
mod auto_layout;
mod canvas;
mod document;
mod export;
mod prototype;

use app::FigCraftApp;
use eframe::egui::{self, ViewportBuilder};

fn main() -> eframe::Result<()> {
    let native_options = eframe::NativeOptions {
        viewport: ViewportBuilder::default()
            .with_title("FigCraft Studio — Clean-Room Interface Design & Prototyping (Pure Rust)")
            .with_inner_size([1400.0, 900.0])
            .with_min_inner_size([960.0, 600.0])
            .with_active(true),
        ..Default::default()
    };

    eframe::run_native(
        "FigCraft Studio",
        native_options,
        Box::new(|cc| Ok(Box::new(FigCraftApp::new(cc)))),
    )
}
