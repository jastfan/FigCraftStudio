//! FigCraft Studio — Pure Rust Prototyping Runner
//! Interactive presentation mode for running clickable mobile & desktop flows.

use crate::document::{DesignDocument, DesignNode, NodeType};
use egui::{Color32, Pos2, Rect, Stroke, Ui, Vec2};

pub struct PrototypeRunner {
    pub is_active: bool,
    pub current_frame_id: Option<String>,
    pub history: Vec<String>,
}

impl PrototypeRunner {
    pub fn new() -> Self {
        Self {
            is_active: false,
            current_frame_id: None,
            history: Vec::new(),
        }
    }

    pub fn start(&mut self, initial_frame_id: Option<String>) {
        self.is_active = true;
        self.current_frame_id = initial_frame_id;
        if let Some(id) = &self.current_frame_id {
            self.history = vec![id.clone()];
        }
    }

    pub fn stop(&mut self) {
        self.is_active = false;
        self.current_frame_id = None;
        self.history.clear();
    }

    pub fn render_player(&mut self, ui: &mut Ui, doc: &DesignDocument) {
        ui.horizontal(|ui| {
            ui.heading("🎬 FigCraft Prototype Player");
            if ui.button("✕ Close Player").clicked() {
                self.stop();
            }
        });

        ui.separator();

        let current_node = doc.nodes.iter().find(|n| {
            if let Some(cur_id) = &self.current_frame_id {
                &n.id == cur_id
            } else {
                n.node_type == NodeType::Frame
            }
        });

        if let Some(frame) = current_node {
            // Draw Device Frame Mockup Centered
            let available_rect = ui.available_rect_before_wrap();
            let center = available_rect.center();
            let frame_rect = Rect::from_center_size(center, Vec2::new(frame.width, frame.height));

            // Device Outer Bezel
            ui.painter().rect(
                frame_rect.expand(12.0),
                44.0,
                Color32::from_rgb(24, 24, 27),
                Stroke::new(2.0, Color32::from_rgb(63, 63, 70)),
            );

            // Screen Canvas
            ui.painter().rect_filled(frame_rect, 32.0, Color32::from_rgb(9, 9, 11));

            // Render Frame Children & Clickable Hotspots
            let mut next_target = None;
            for child in &frame.children {
                let child_rect = Rect::from_min_size(
                    frame_rect.min + Vec2::new(child.x, child.y),
                    Vec2::new(child.width, child.height),
                );

                // Render child shape
                ui.painter().rect_filled(child_rect, child.corner_radius, Color32::from_rgb(32, 32, 36));

                // Check Hotspot Clicks
                if let Some(proto) = &child.prototype_link {
                    let resp = ui.allocate_rect(child_rect, egui::Sense::click());
                    if resp.hovered() {
                        ui.painter().rect_stroke(child_rect, child.corner_radius, Stroke::new(2.0, Color32::from_rgb(168, 85, 247)));
                    }
                    if resp.clicked() {
                        next_target = Some(proto.target_frame_id.clone());
                    }
                }
            }

            if let Some(target) = next_target {
                self.current_frame_id = Some(target);
            }
        }
    }
}
