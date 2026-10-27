//! FigCraft Studio — Pure Rust Infinite Canvas
//! 60/120FPS 2D Canvas with Pan, Zoom, Dot Grid, and Interactive Transform Controls.

use crate::document::{DesignDocument, DesignNode, NodeType};
use egui::{Color32, Pos2, Rect, Stroke, Ui, Vec2};

pub struct InfiniteCanvas {
    pub pan: Vec2,
    pub zoom: f32,
    pub active_tool: String, // "select", "frame", "rect", "ellipse", "text"
    pub selected_node_id: Option<String>,
}

impl InfiniteCanvas {
    pub fn new() -> Self {
        Self {
            pan: Vec2::new(100.0, 80.0),
            zoom: 1.0,
            active_tool: "select".to_string(),
            selected_node_id: None,
        }
    }

    pub fn screen_to_world(&self, screen_pos: Pos2, canvas_rect: Rect) -> Pos2 {
        let rel = screen_pos - canvas_rect.min - self.pan;
        Pos2::new(rel.x / self.zoom, rel.y / self.zoom)
    }

    pub fn world_to_screen(&self, world_pos: Pos2, canvas_rect: Rect) -> Pos2 {
        canvas_rect.min + self.pan + Vec2::new(world_pos.x * self.zoom, world_pos.y * self.zoom)
    }

    pub fn render(&mut self, ui: &mut Ui, doc: &mut DesignDocument, mode: &str) {
        let (response, painter) = ui.allocate_painter(ui.available_size_before_wrap(), egui::Sense::drag());
        let canvas_rect = response.rect;

        // 1. Pan & Zoom Interactions
        if response.dragged_by(egui::PointerButton::Middle) || (ui.input(|i| i.key_down(egui::Key::Space)) && response.dragged()) {
            self.pan += response.drag_delta();
        }

        let scroll_delta = ui.input(|i| i.raw_scroll_delta);
        if scroll_delta.y != 0.0 && ui.input(|i| i.modifiers.ctrl || i.modifiers.command) {
            let zoom_factor = if scroll_delta.y > 0.0 { 1.1 } else { 0.9 };
            self.zoom = (self.zoom * zoom_factor).clamp(0.1, 20.0);
        }

        // 2. Draw Dot Grid
        self.draw_dot_grid(&painter, canvas_rect);

        // 3. Render Nodes
        for node in &doc.nodes {
            self.render_node(&painter, node, canvas_rect, Pos2::ZERO);
        }

        // 4. Render Prototype Connections
        if mode == "prototype" {
            self.render_prototype_noodles(&painter, doc, canvas_rect);
        }

        // 5. Handle Selection Clicks
        if response.clicked() {
            if let Some(mouse_pos) = response.interact_pointer_pos() {
                let world_pos = self.screen_to_world(mouse_pos, canvas_rect);
                self.selected_node_id = None;
                for node in doc.nodes.iter().rev() {
                    if node.contains_point(world_pos.x, world_pos.y) {
                        self.selected_node_id = Some(node.id.clone());
                        break;
                    }
                }
            }
        }

        // 6. Draw Selection Box
        if let Some(sel_id) = &self.selected_node_id {
            if let Some(node) = doc.nodes.iter().find(|n| &n.id == sel_id) {
                let screen_min = self.world_to_screen(Pos2::new(node.x, node.y), canvas_rect);
                let screen_size = Vec2::new(node.width * self.zoom, node.height * self.zoom);
                let sel_rect = Rect::from_min_size(screen_min, screen_size);

                painter.rect_stroke(sel_rect, 0.0, Stroke::new(1.5, Color32::from_rgb(13, 153, 255)));

                // 8 Transform Handles
                let handle_size = 6.0;
                let corners = [
                    sel_rect.left_top(),
                    sel_rect.right_top(),
                    sel_rect.right_bottom(),
                    sel_rect.left_bottom(),
                ];
                for c in corners {
                    let h_rect = Rect::from_center_size(c, Vec2::splat(handle_size));
                    painter.rect_filled(h_rect, 1.0, Color32::WHITE);
                    painter.rect_stroke(h_rect, 1.0, Stroke::new(1.0, Color32::from_rgb(13, 153, 255)));
                }
            }
        }
    }

    fn draw_dot_grid(&self, painter: &egui::Painter, rect: Rect) {
        let spacing = 24.0 * self.zoom;
        if spacing < 8.0 {
            return;
        }

        let start_x = rect.min.x + (self.pan.x % spacing);
        let start_y = rect.min.y + (self.pan.y % spacing);
        let dot_color = Color32::from_rgba_premultiplied(255, 255, 255, 20);

        let mut x = start_x;
        while x < rect.max.x {
            let mut y = start_y;
            while y < rect.max.y {
                painter.circle_filled(Pos2::new(x, y), 1.0, dot_color);
                y += spacing;
            }
            x += spacing;
        }
    }

    fn render_node(&self, painter: &egui::Painter, node: &DesignNode, canvas_rect: Rect, parent_offset: Pos2) {
        if !node.visible {
            return;
        }

        let world_pos = Pos2::new(parent_offset.x + node.x, parent_offset.y + node.y);
        let screen_min = self.world_to_screen(world_pos, canvas_rect);
        let screen_size = Vec2::new(node.width * self.zoom, node.height * self.zoom);
        let rect = Rect::from_min_size(screen_min, screen_size);

        let fill = Color32::from_rgb(24, 24, 27);
        painter.rect_filled(rect, node.corner_radius * self.zoom, fill);

        if let Some(stroke_hex) = &node.stroke_hex {
            painter.rect_stroke(rect, node.corner_radius * self.zoom, Stroke::new(1.0, Color32::from_rgb(63, 63, 70)));
        }

        // Draw Frame Title Above Artboard
        if node.node_type == NodeType::Frame {
            painter.text(
                screen_min - Vec2::new(0.0, 14.0),
                egui::Align2::LEFT_BOTTOM,
                &node.name,
                egui::FontId::proportional(11.0),
                Color32::from_rgb(161, 161, 170),
            );
        }

        // Render Children
        for child in &node.children {
            self.render_node(painter, child, canvas_rect, world_pos);
        }
    }

    fn render_prototype_noodles(&self, painter: &egui::Painter, doc: &DesignDocument, canvas_rect: Rect) {
        for frame in &doc.nodes {
            for child in &frame.children {
                if let Some(proto) = &child.prototype_link {
                    if let Some(target) = doc.nodes.iter().find(|n| n.id == proto.target_frame_id) {
                        let from_world = Pos2::new(frame.x + child.x + child.width, frame.y + child.y + child.height / 2.0);
                        let to_world = Pos2::new(target.x, target.y + 40.0);

                        let from_screen = self.world_to_screen(from_world, canvas_rect);
                        let to_screen = self.world_to_screen(to_world, canvas_rect);

                        // Draw curved connection line
                        painter.line_segment([from_screen, to_screen], Stroke::new(2.0, Color32::from_rgb(168, 85, 247)));
                        painter.circle_filled(to_screen, 4.0, Color32::from_rgb(168, 85, 247));
                    }
                }
            }
        }
    }
}
