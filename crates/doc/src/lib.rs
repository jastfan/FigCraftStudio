//! FigCraft Document Data Model
//! Scene hierarchy, nodes, styles, components, and variables.

use figcraft_color::RgbaColor;
use figcraft_geom::{Rect, VectorPath};
use figcraft_layout::AutoLayoutConfig;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NodeType {
    Frame,
    Rectangle,
    Ellipse,
    Line,
    Text,
    Vector,
    Component,
    Instance,
    BooleanGroup,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BooleanOperation {
    None,
    Union,
    Subtract,
    Intersect,
    Exclude,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PrototypeLink {
    pub target_frame_id: String,
    pub trigger: String, // "OnClick", "OnHover", "AfterDelay"
    pub transition: String, // "Instant", "SmartAnimate", "Dissolve", "SlideLeft"
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DesignNode {
    pub id: String,
    pub name: String,
    pub node_type: NodeType,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub rotation: f32,
    pub opacity: f32,
    pub visible: bool,
    pub locked: bool,

    // Styling
    pub fill_hex: String,
    pub stroke_hex: Option<String>,
    pub stroke_width: f32,
    pub corner_radius: f32,
    pub boolean_op: BooleanOperation,

    // Content
    pub text_content: String,
    pub font_size: f32,
    pub font_family: String,
    pub vector_data: Option<VectorPath>,

    // Layout & Components
    pub master_component_id: Option<String>,
    pub auto_layout: AutoLayoutConfig,
    pub prototype_link: Option<PrototypeLink>,
    pub children: Vec<DesignNode>,
}

impl DesignNode {
    pub fn new(node_type: NodeType, name: &str, x: f32, y: f32, width: f32, height: f32) -> Self {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        Self {
            id: format!("node_{:x}", ts % 1_000_000_000),
            name: name.to_string(),
            node_type,
            x,
            y,
            width,
            height,
            rotation: 0.0,
            opacity: 1.0,
            visible: true,
            locked: false,
            fill_hex: "#18181b".to_string(),
            stroke_hex: Some("#27272a".to_string()),
            stroke_width: 1.0,
            corner_radius: 0.0,
            boolean_op: BooleanOperation::None,
            text_content: String::new(),
            font_size: 14.0,
            font_family: "Inter".to_string(),
            vector_data: None,
            master_component_id: None,
            auto_layout: AutoLayoutConfig::default(),
            prototype_link: None,
            children: Vec::new(),
        }
    }

    pub fn bounds(&self) -> Rect {
        Rect::new(self.x, self.y, self.width, self.height)
    }

    pub fn fill_rgba(&self) -> RgbaColor {
        RgbaColor::from_hex(&self.fill_hex)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesignVariable {
    pub id: String,
    pub name: String,
    pub value: String,
    pub mode: String, // "light", "dark"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesignDocument {
    pub title: String,
    pub version: String,
    pub variables: HashMap<String, DesignVariable>,
    pub components: HashMap<String, DesignNode>,
    pub nodes: Vec<DesignNode>,
}

impl Default for DesignDocument {
    fn default() -> Self {
        let mut doc = Self {
            title: "FigCraft Design System".to_string(),
            version: "0.11.2".to_string(),
            variables: HashMap::new(),
            components: HashMap::new(),
            nodes: Vec::new(),
        };

        // Ridgeline App Showcase (matching official FigCraft screenshot showcase)
        let mut screen = DesignNode::new(NodeType::Frame, "iPhone 16 Pro — Ridgeline Trail", 100.0, 100.0, 393.0, 852.0);
        screen.fill_hex = "#09090b".to_string();
        screen.corner_radius = 48.0;

        let mut hero_card = DesignNode::new(NodeType::Rectangle, "Elevation Graph Card", 20.0, 120.0, 353.0, 220.0);
        hero_card.fill_hex = "#18181b".to_string();
        hero_card.corner_radius = 20.0;
        screen.children.push(hero_card);

        let mut row1 = DesignNode::new(NodeType::Rectangle, "Trail Item: Mt. Whitney Pass", 20.0, 360.0, 353.0, 72.0);
        row1.fill_hex = "#18181b".to_string();
        row1.corner_radius = 16.0;
        screen.children.push(row1);

        doc.nodes.push(screen);
        doc
    }
}
