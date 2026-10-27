//! FigCraft Studio — Pure Rust eframe GUI Application
//! Connects toolbar, layers sidebar, canvas viewport, inspector, and prototype runner.

use crate::auto_layout::AutoLayoutEngine;
use crate::canvas::InfiniteCanvas;
use crate::document::{DesignDocument, DesignNode, NodeType};
use crate::export::ExportEngine;
use crate::prototype::PrototypeRunner;
use eframe::egui::{self, Color32, RichText, Ui};

pub struct FigCraftApp {
    pub doc: DesignDocument,
    pub canvas: InfiniteCanvas,
    pub prototype_runner: PrototypeRunner,
    pub active_mode: String, // "design", "prototype", "dev"
}

impl FigCraftApp {
    pub fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        Self {
            doc: DesignDocument::default(),
            canvas: InfiniteCanvas::new(),
            prototype_runner: PrototypeRunner::new(),
            active_mode: "design".to_string(),
        }
    }

    fn render_top_bar(&mut self, ctx: &egui::Context) {
        egui::TopBottomPanel::top("top_toolbar").show(ctx, |ui| {
            ui.horizontal(|ui| {
                // Branding
                ui.label(RichText::new("⚡ FigCraft Studio").strong().color(Color32::from_rgb(13, 153, 255)));
                ui.label(RichText::new("(Pure Rust)").small().color(Color32::from_rgb(113, 113, 122)));

                ui.separator();

                // Document Title
                ui.text_edit_singleline(&mut self.doc.title);

                ui.separator();

                // Tools
                if ui.selectable_label(self.canvas.active_tool == "select", "Select (V)").clicked() {
                    self.canvas.active_tool = "select".to_string();
                }
                if ui.selectable_label(self.canvas.active_tool == "frame", "Frame (F)").clicked() {
                    self.canvas.active_tool = "frame".to_string();
                    let count = self.doc.nodes.len() + 1;
                    let new_frame = DesignNode::new_frame(&format!("Screen {}", count), 100.0, 100.0, 393.0, 852.0);
                    self.doc.nodes.push(new_frame);
                    self.canvas.active_tool = "select".to_string();
                }
                if ui.selectable_label(self.canvas.active_tool == "rect", "Rect (R)").clicked() {
                    let new_rect = DesignNode::new_rectangle("Rectangle", 40.0, 40.0, 140.0, 80.0, "#38bdf8");
                    if let Some(first_frame) = self.doc.nodes.first_mut() {
                        first_frame.children.push(new_rect);
                    }
                    self.canvas.active_tool = "select".to_string();
                }

                ui.separator();

                // Mode Tabs
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
                    // Export PNG Button
                    if ui.button("Export 2x PNG").clicked() {
                        if let Some(frame) = self.doc.nodes.first() {
                            if let Some(png_bytes) = ExportEngine::export_node_png(frame, 2.0) {
                                if let Some(path) = rfd::FileDialog::new().add_filter("PNG Image", &["png"]).save_file() {
                                    let _ = std::fs::write(path, png_bytes);
                                }
                            }
                        }
                    }

                    // Present Button
                    if ui.button(RichText::new("▶ Present").color(Color32::from_rgb(168, 85, 247))).clicked() {
                        self.prototype_runner.start(self.canvas.selected_node_id.clone());
                    }

                    // Save .figcraft Project
                    if ui.button("Save .figcraft").clicked() {
                        if let Ok(json) = serde_json::to_string_pretty(&self.doc) {
                            if let Some(path) = rfd::FileDialog::new().add_filter("FigCraft Document", &["figcraft"]).save_file() {
                                let _ = std::fs::write(path, json);
                            }
                        }
                    }

                    ui.label(RichText::new("● 100% Offline").small().color(Color32::from_rgb(34, 197, 94)));
                });
            });
        });
    }

    fn render_left_sidebar(&mut self, ctx: &egui::Context) {
        egui::SidePanel::left("layers_panel").default_width(220.0).show(ctx, |ui| {
            ui.heading("Layers & Hierarchy");
            ui.separator();

            egui::ScrollArea::vertical().show(ui, |ui| {
                for node in &self.doc.nodes {
                    let is_selected = self.canvas.selected_node_id.as_deref() == Some(&node.id);
                    if ui.selectable_label(is_selected, format!("📱 {}", node.name)).clicked() {
                        self.canvas.selected_node_id = Some(node.id.clone());
                    }

                    for child in &node.children {
                        let is_child_sel = self.canvas.selected_node_id.as_deref() == Some(&child.id);
                        ui.horizontal(|ui| {
                            ui.add_space(14.0);
                            if ui.selectable_label(is_child_sel, format!("🔷 {}", child.name)).clicked() {
                                self.canvas.selected_node_id = Some(child.id.clone());
                            }
                        });
                    }
                }
            });
        });
    }

    fn render_right_sidebar(&mut self, ctx: &egui::Context) {
        egui::SidePanel::right("inspector_panel").default_width(260.0).show(ctx, |ui| {
            if self.active_mode == "dev" {
                ui.heading("⚡ Dev Mode Inspector");
                ui.separator();

                if let Some(sel_id) = &self.canvas.selected_node_id {
                    let found = self.doc.nodes.iter().find(|n| &n.id == sel_id)
                        .or_else(|| self.doc.nodes.iter().flat_map(|f| &f.children).find(|c| &c.id == sel_id));

                    if let Some(node) = found {
                        let css = ExportEngine::generate_css(node);
                        ui.label("CSS Styles:");
                        ui.code(css);
                    }
                } else {
                    ui.label("Select any layer to inspect CSS");
                }
                return;
            }

            ui.heading("Design Properties");
            ui.separator();

            if let Some(sel_id) = &self.canvas.selected_node_id {
                let mut found = self.doc.nodes.iter_mut().find(|n| &n.id == sel_id);
                if let Some(node) = &mut found {
                    ui.horizontal(|ui| {
                        ui.label("X:");
                        ui.add(egui::DragValue::new(&mut node.x));
                        ui.label("Y:");
                        ui.add(egui::DragValue::new(&mut node.y));
                    });

                    ui.horizontal(|ui| {
                        ui.label("W:");
                        ui.add(egui::DragValue::new(&mut node.width));
                        ui.label("H:");
                        ui.add(egui::DragValue::new(&mut node.height));
                    });

                    ui.horizontal(|ui| {
                        ui.label("Corner Radius:");
                        ui.add(egui::DragValue::new(&mut node.corner_radius));
                    });

                    ui.separator();

                    // Auto Layout Controls
                    if node.node_type == NodeType::Frame {
                        ui.checkbox(&mut node.auto_layout.enabled, "Enable Auto-Layout");
                        if node.auto_layout.enabled {
                            ui.horizontal(|ui| {
                                ui.label("Gap:");
                                ui.add(egui::DragValue::new(&mut node.auto_layout.gap));
                            });
                        }
                    }
                }
            } else {
                ui.label("No layer selected");
            }
        });
    }
}

impl eframe::App for FigCraftApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // If Prototype Mode active, show presentation player
        if self.prototype_runner.is_active {
            egui::CentralPanel::default().show(ctx, |ui| {
                self.prototype_runner.render_player(ui, &self.doc);
            });
            return;
        }

        self.render_top_bar(ctx);
        self.render_left_sidebar(ctx);
        self.render_right_sidebar(ctx);

        // Compute auto layout
        for frame in &mut self.doc.nodes {
            AutoLayoutEngine::compute_recursive(frame);
        }

        // Central Infinite Canvas Viewport
        egui::CentralPanel::default().show(ctx, |ui| {
            self.canvas.render(ui, &mut self.doc, &self.active_mode);
        });
    }
}
