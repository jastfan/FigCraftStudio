//! FigCraft UI Engine
//! Native immediate-mode GUI built with egui & eframe.

use figcraft_doc::{DesignDocument, DesignNode, NodeType};
use figcraft_engine::{EngineCommand, EngineJournal};
use figcraft_format::FormatIO;
use figcraft_render::Renderer2D;

use eframe::egui::{self, Color32, Pos2, Rect, RichText, Stroke, Ui, Vec2};

pub struct FigCraftUIApp {
    pub doc: DesignDocument,
    pub history: EngineJournal,
    pub pan: Vec2,
    pub zoom: f32,
    pub active_tool: String,
    pub selected_node_id: Option<String>,
    pub active_mode: String, // "design", "prototype", "dev"
}

impl Default for FigCraftUIApp {
    fn default() -> Self {
        Self::new()
    }
}

impl FigCraftUIApp {
    pub fn new() -> Self {
        Self {
            doc: DesignDocument::default(),
            history: EngineJournal::new(),
            pan: Vec2::new(100.0, 80.0),
            zoom: 1.0,
            active_tool: "select".to_string(),
            selected_node_id: None,
            active_mode: "design".to_string(),
        }
    }

    pub fn render(&mut self, ctx: &egui::Context) {
        self.render_top_bar(ctx);
        self.render_left_panel(ctx);
        self.render_right_inspector(ctx);

        egui::CentralPanel::default().show(ctx, |ui| {
            self.render_canvas(ui);
        });
    }

    fn render_top_bar(&mut self, ctx: &egui::Context) {
        egui::TopBottomPanel::top("top_bar").show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.label(RichText::new("⚡ FigCraft").strong().color(Color32::from_rgb(13, 153, 255)));
                ui.text_edit_singleline(&mut self.doc.title);
                ui.separator();

                // Tool selection
                if ui.selectable_label(self.active_tool == "select", "Select (V)").clicked() {
                    self.active_tool = "select".to_string();
                }
                if ui.selectable_label(self.active_tool == "frame", "Frame (F)").clicked() {
                    let frame = DesignNode::new(NodeType::Frame, "New Screen", 100.0, 100.0, 393.0, 852.0);
                    self.history.execute(EngineCommand::InsertNode { parent_id: None, node: frame }, &mut self.doc);
                    self.active_tool = "select".to_string();
                }
                if ui.selectable_label(self.active_tool == "rect", "Rect (R)").clicked() {
                    let rect = DesignNode::new(NodeType::Rectangle, "Rectangle", 40.0, 40.0, 120.0, 80.0);
                    self.history.execute(EngineCommand::InsertNode { parent_id: None, node: rect }, &mut self.doc);
                    self.active_tool = "select".to_string();
                }

                ui.separator();

                // Mode switch
                if ui.selectable_label(self.active_mode == "design", "Design").clicked() {
                    self.active_mode = "design".to_string();
                }
                if ui.selectable_label(self.active_mode == "prototype", "Prototype").clicked() {
                    self.active_mode = "prototype".to_string();
                }
                if ui.selectable_label(self.active_mode == "dev", "Dev Mode").clicked() {
                    self.active_mode = "dev".to_string();
                }

                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if ui.button("Export PNG").clicked() {
                        if let Some(frame) = self.doc.nodes.first() {
                            if let Some(pixmap) = Renderer2D::render_node_to_pixmap(frame, 2.0) {
                                if let Ok(png) = pixmap.encode_png() {
                                    if let Some(path) = rfd::FileDialog::new().add_filter("PNG", &["png"]).save_file() {
                                        let _ = std::fs::write(path, png);
                                    }
                                }
                            }
                        }
                    }

                    if ui.button("Save .figcraft").clicked() {
                        if let Some(path) = rfd::FileDialog::new().add_filter("FigCraft", &["figcraft"]).save_file() {
                            let _ = FormatIO::save_figcraft_file(&path, &self.doc);
                        }
                    }

                    ui.label(RichText::new("● Pure Rust Desktop").small().color(Color32::from_rgb(34, 197, 94)));
                });
            });
        });
    }

    fn render_left_panel(&mut self, ctx: &egui::Context) {
        egui::SidePanel::left("left_tree").default_width(220.0).show(ctx, |ui| {
            ui.heading("Layers");
            ui.separator();

            egui::ScrollArea::vertical().show(ui, |ui| {
                for node in &self.doc.nodes {
                    let sel = self.selected_node_id.as_deref() == Some(&node.id);
                    if ui.selectable_label(sel, format!("📱 {}", node.name)).clicked() {
                        self.selected_node_id = Some(node.id.clone());
                    }
                    for child in &node.children {
                        let child_sel = self.selected_node_id.as_deref() == Some(&child.id);
                        ui.horizontal(|ui| {
                            ui.add_space(14.0);
                            if ui.selectable_label(child_sel, format!("🔷 {}", child.name)).clicked() {
                                self.selected_node_id = Some(child.id.clone());
                            }
                        });
                    }
                }
            });
        });
    }

    fn render_right_inspector(&mut self, ctx: &egui::Context) {
        egui::SidePanel::right("right_inspector").default_width(260.0).show(ctx, |ui| {
            if self.active_mode == "dev" {
                ui.heading("⚡ Dev Mode Inspector");
                ui.separator();
                if let Some(sel_id) = &self.selected_node_id {
                    if let Some(node) = self.doc.nodes.iter().find(|n| &n.id == sel_id) {
                        let css = FormatIO::generate_dev_code(node, "css");
                        ui.label("CSS Code:");
                        ui.code(css);
                        ui.separator();
                        let ts = FormatIO::generate_dev_code(node, "react");
                        ui.label("React TypeScript:");
                        ui.code(ts);
                    }
                } else {
                    ui.label("Select layer to inspect code");
                }
                return;
            }

            ui.heading("Design Properties");
            ui.separator();

            if let Some(sel_id) = &self.selected_node_id {
                let mut found = self.doc.nodes.iter_mut().find(|n| &n.id == sel_id);
                if let Some(node) = &mut found {
                    ui.horizontal(|ui| {
                        ui.label("X:"); ui.add(egui::DragValue::new(&mut node.x));
                        ui.label("Y:"); ui.add(egui::DragValue::new(&mut node.y));
                    });
                    ui.horizontal(|ui| {
                        ui.label("W:"); ui.add(egui::DragValue::new(&mut node.width));
                        ui.label("H:"); ui.add(egui::DragValue::new(&mut node.height));
                    });
                    ui.horizontal(|ui| {
                        ui.label("Corner Radius:");
                        ui.add(egui::DragValue::new(&mut node.corner_radius));
                    });
                    ui.horizontal(|ui| {
                        ui.label("Fill Color:");
                        ui.text_edit_singleline(&mut node.fill_hex);
                    });
                }
            } else {
                ui.label("No layer selected");
            }
        });
    }

    fn render_canvas(&mut self, ui: &mut Ui) {
        let (response, painter) = ui.allocate_painter(ui.available_size_before_wrap(), egui::Sense::drag());
        let rect = response.rect;

        if response.dragged_by(egui::PointerButton::Middle) || (ui.input(|i| i.key_down(egui::Key::Space)) && response.dragged()) {
            self.pan += response.drag_delta();
        }

        // Draw Dot Grid
        let spacing = 24.0 * self.zoom;
        if spacing >= 8.0 {
            let start_x = rect.min.x + (self.pan.x % spacing);
            let start_y = rect.min.y + (self.pan.y % spacing);
            let mut x = start_x;
            while x < rect.max.x {
                let mut y = start_y;
                while y < rect.max.y {
                    painter.circle_filled(Pos2::new(x, y), 1.0, Color32::from_rgba_premultiplied(255, 255, 255, 18));
                    y += spacing;
                }
                x += spacing;
            }
        }

        // Render Nodes
        for node in &self.doc.nodes {
            let screen_pos = rect.min + self.pan + Vec2::new(node.x * self.zoom, node.y * self.zoom);
            let size = Vec2::new(node.width * self.zoom, node.height * self.zoom);
            let node_rect = Rect::from_min_size(screen_pos, size);

            painter.rect_filled(node_rect, node.corner_radius * self.zoom, Color32::from_rgb(24, 24, 27));
            painter.rect_stroke(node_rect, node.corner_radius * self.zoom, Stroke::new(1.0, Color32::from_rgb(63, 63, 70)));

            if node.node_type == NodeType::Frame {
                painter.text(screen_pos - Vec2::new(0.0, 14.0), egui::Align2::LEFT_BOTTOM, &node.name, egui::FontId::proportional(11.0), Color32::from_rgb(161, 161, 170));
            }

            for child in &node.children {
                let c_pos = screen_pos + Vec2::new(child.x * self.zoom, child.y * self.zoom);
                let c_size = Vec2::new(child.width * self.zoom, child.height * self.zoom);
                let c_rect = Rect::from_min_size(c_pos, c_size);

                painter.rect_filled(c_rect, child.corner_radius * self.zoom, Color32::from_rgb(39, 39, 42));
                painter.rect_stroke(c_rect, child.corner_radius * self.zoom, Stroke::new(1.0, Color32::from_rgb(82, 82, 91)));
            }
        }
    }
}
