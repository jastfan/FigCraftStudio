//! FigCraft Native Desktop Application Entrypoint
//! Pure Rust cross-platform executable using egui, eframe, and tiny-skia.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use eframe::egui;
use figcraft_ui_egui::FigCraftUIApp;

struct FigCraftDesktopWrapper {
    studio_app: FigCraftUIApp,
}

impl FigCraftDesktopWrapper {
    fn new(cc: &eframe::CreationContext<'_>) -> Self {
        // Customize egui theme: Sleek Dark Mode matching modern design tools
        let mut visuals = egui::Visuals::dark();
        visuals.window_fill = egui::Color32::from_rgb(18, 18, 20);
        visuals.panel_fill = egui::Color32::from_rgb(24, 24, 27);
        visuals.faint_bg_color = egui::Color32::from_rgb(39, 39, 42);
        visuals.extreme_bg_color = egui::Color32::from_rgb(9, 9, 11);
        visuals.selection.bg_fill = egui::Color32::from_rgb(13, 153, 255);
        cc.egui_ctx.set_visuals(visuals);

        Self {
            studio_app: FigCraftUIApp::new(),
        }
    }
}

impl eframe::App for FigCraftDesktopWrapper {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.studio_app.render(ctx);
    }
}

fn main() -> eframe::Result<()> {
    let native_options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1440.0, 900.0])
            .with_min_inner_size([1024.0, 680.0])
            .with_title("FigCraft Studio — Native Clean-Room Interface Design Suite")
            .with_active(true),
        ..Default::default()
    };

    println!("Starting FigCraft Desktop Studio...");
    eframe::run_native(
        "FigCraft Studio",
        native_options,
        Box::new(|cc| Ok(Box::new(FigCraftDesktopWrapper::new(cc)))),
    )
}
