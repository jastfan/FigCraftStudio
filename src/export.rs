//! FigCraft Studio — Pure Rust Export Engine
//! tiny-skia 2D rasterizer for Hi-DPI PNGs and Dev Mode CSS generator.

use crate::document::{DesignNode, NodeType};
use tiny_skia::{Color, Paint, PathBuilder, Pixmap, Rect, Transform};

pub struct ExportEngine;

impl ExportEngine {
    pub fn export_node_png(node: &DesignNode, scale: f32) -> Option<Vec<u8>> {
        let width = (node.width * scale).round() as u32;
        let height = (node.height * scale).round() as u32;
        if width == 0 || height == 0 {
            return None;
        }

        let mut pixmap = Pixmap::new(width, height)?;
        let mut paint = Paint::default();

        // Render background fill
        let fill_color = Self::parse_hex(&node.fill_hex);
        paint.set_color(fill_color);

        let rect = Rect::from_xywh(0.0, 0.0, node.width * scale, node.height * scale)?;
        pixmap.fill_rect(rect, &paint, Transform::identity(), None);

        // Render children
        for child in &node.children {
            Self::render_child(&mut pixmap, child, 0.0, 0.0, scale);
        }

        pixmap.encode_png().ok()
    }

    fn render_child(pixmap: &mut Pixmap, node: &DesignNode, parent_x: f32, parent_y: f32, scale: f32) {
        if !node.visible {
            return;
        }

        let abs_x = (parent_x + node.x) * scale;
        let abs_y = (parent_y + node.y) * scale;
        let w = node.width * scale;
        let h = node.height * scale;

        let mut paint = Paint::default();
        paint.set_color(Self::parse_hex(&node.fill_hex));

        if let Some(rect) = Rect::from_xywh(abs_x, abs_y, w, h) {
            pixmap.fill_rect(rect, &paint, Transform::identity(), None);
        }

        for sub in &node.children {
            Self::render_child(pixmap, sub, parent_x + node.x, parent_y + node.y, scale);
        }
    }

    pub fn generate_css(node: &DesignNode) -> String {
        let mut lines = Vec::new();
        lines.push(format!("/* Layer: {} */", node.name));
        lines.push("position: absolute;".to_string());
        lines.push(format!("width: {}px;", node.width.round()));
        lines.push(format!("height: {}px;", node.height.round()));
        lines.push(format!("left: {}px;", node.x.round()));
        lines.push(format!("top: {}px;", node.y.round()));
        lines.push(format!("background: {};", node.fill_hex));

        if node.corner_radius > 0.0 {
            lines.push(format!("border-radius: {}px;", node.corner_radius));
        }
        if node.opacity < 1.0 {
            lines.push(format!("opacity: {:.2};", node.opacity));
        }

        if node.node_type == NodeType::Frame && node.auto_layout.enabled {
            let dir = match node.auto_layout.direction {
                crate::document::AutoLayoutDirection::Horizontal => "row",
                crate::document::AutoLayoutDirection::Vertical => "column",
            };
            lines.push("display: flex;".to_string());
            lines.push(format!("flex-direction: {};", dir));
            lines.push(format!("gap: {}px;", node.auto_layout.gap));
            lines.push(format!(
                "padding: {}px {}px {}px {}px;",
                node.auto_layout.padding_top,
                node.auto_layout.padding_right,
                node.auto_layout.padding_bottom,
                node.auto_layout.padding_left
            ));
        }

        if node.node_type == NodeType::Text {
            lines.push(format!("font-size: {}px;", node.font_size));
            lines.push(format!("color: {};", node.fill_hex));
        }

        lines.join("\n")
    }

    fn parse_hex(hex: &str) -> Color {
        let clean = hex.trim_start_matches('#');
        if clean.len() == 6 {
            let r = u8::from_str_radix(&clean[0..2], 16).unwrap_or(255);
            let g = u8::from_str_radix(&clean[2..4], 16).unwrap_or(255);
            let b = u8::from_str_radix(&clean[4..6], 16).unwrap_or(255);
            Color::from_rgba8(r, g, b, 255)
        } else {
            Color::from_rgba8(56, 189, 248, 255)
        }
    }
}
