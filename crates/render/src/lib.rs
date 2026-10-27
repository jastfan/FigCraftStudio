//! FigCraft Render Engine
//! 2D Vector & Canvas rendering using tiny-skia and kurbo geometry.

use figcraft_doc::DesignNode;
use tiny_skia::{Color, Paint, Pixmap, Rect, Transform};

pub struct Renderer2D;

impl Renderer2D {
    pub fn render_node_to_pixmap(node: &DesignNode, scale: f32) -> Option<Pixmap> {
        let w = (node.width * scale).round() as u32;
        let h = (node.height * scale).round() as u32;
        if w == 0 || h == 0 {
            return None;
        }

        let mut pixmap = Pixmap::new(w, h)?;
        let mut paint = Paint::default();
        paint.set_color(Self::hex_to_color(&node.fill_hex));

        if let Some(rect) = Rect::from_xywh(0.0, 0.0, node.width * scale, node.height * scale) {
            pixmap.fill_rect(rect, &paint, Transform::identity(), None);
        }

        for child in &node.children {
            Self::draw_child(&mut pixmap, child, 0.0, 0.0, scale);
        }

        Some(pixmap)
    }

    fn draw_child(pixmap: &mut Pixmap, child: &DesignNode, parent_x: f32, parent_y: f32, scale: f32) {
        if !child.visible {
            return;
        }
        let x = (parent_x + child.x) * scale;
        let y = (parent_y + child.y) * scale;
        let w = child.width * scale;
        let h = child.height * scale;

        let mut paint = Paint::default();
        paint.set_color(Self::hex_to_color(&child.fill_hex));

        if let Some(rect) = Rect::from_xywh(x, y, w, h) {
            pixmap.fill_rect(rect, &paint, Transform::identity(), None);
        }

        for sub in &child.children {
            Self::draw_child(pixmap, sub, parent_x + child.x, parent_y + child.y, scale);
        }
    }

    pub fn hex_to_color(hex: &str) -> Color {
        let clean = hex.trim_start_matches('#');
        if clean.len() >= 6 {
            let r = u8::from_str_radix(&clean[0..2], 16).unwrap_or(255);
            let g = u8::from_str_radix(&clean[2..4], 16).unwrap_or(255);
            let b = u8::from_str_radix(&clean[4..6], 16).unwrap_or(255);
            Color::from_rgba8(r, g, b, 255)
        } else {
            Color::from_rgba8(56, 189, 248, 255)
        }
    }
}
