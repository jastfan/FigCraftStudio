//! FigCraft Studio — Pure Rust Persistent Scene Graph
//! Clean-room data model for offline interface design and prototyping.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum NodeType {
    Frame,
    Rectangle,
    Ellipse,
    Text,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum AutoLayoutDirection {
    Horizontal,
    Vertical,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Alignment {
    Start,
    Center,
    End,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AutoLayoutConfig {
    pub enabled: bool,
    pub direction: AutoLayoutDirection,
    pub gap: f32,
    pub padding_top: f32,
    pub padding_right: f32,
    pub padding_bottom: f32,
    pub padding_left: f32,
    pub align_items: Alignment,
}

impl Default for AutoLayoutConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            direction: AutoLayoutDirection::Vertical,
            gap: 12.0,
            padding_top: 16.0,
            padding_right: 16.0,
            padding_bottom: 16.0,
            padding_left: 16.0,
            align_items: Alignment::Start,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PrototypeLink {
    pub target_frame_id: String,
    pub transition: String,
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

    // Visual styles
    pub fill_hex: String,
    pub stroke_hex: Option<String>,
    pub stroke_width: f32,
    pub corner_radius: f32,

    // Text specific
    pub text_content: String,
    pub font_size: f32,

    // Layout & Prototyping
    pub auto_layout: AutoLayoutConfig,
    pub prototype_link: Option<PrototypeLink>,
    pub children: Vec<DesignNode>,
}

impl DesignNode {
    pub fn new_frame(name: &str, x: f32, y: f32, width: f32, height: f32) -> Self {
        Self {
            id: format!("frame_{}", Self::gen_id()),
            name: name.to_string(),
            node_type: NodeType::Frame,
            x,
            y,
            width,
            height,
            rotation: 0.0,
            opacity: 1.0,
            visible: true,
            locked: false,
            fill_hex: "#09090b".to_string(),
            stroke_hex: Some("rgba(255,255,255,0.12)".to_string()),
            stroke_width: 1.0,
            corner_radius: 12.0,
            text_content: String::new(),
            font_size: 14.0,
            auto_layout: AutoLayoutConfig::default(),
            prototype_link: None,
            children: Vec::new(),
        }
    }

    pub fn new_rectangle(name: &str, x: f32, y: f32, width: f32, height: f32, fill: &str) -> Self {
        Self {
            id: format!("rect_{}", Self::gen_id()),
            name: name.to_string(),
            node_type: NodeType::Rectangle,
            x,
            y,
            width,
            height,
            rotation: 0.0,
            opacity: 1.0,
            visible: true,
            locked: false,
            fill_hex: fill.to_string(),
            stroke_hex: None,
            stroke_width: 0.0,
            corner_radius: 8.0,
            text_content: String::new(),
            font_size: 14.0,
            auto_layout: AutoLayoutConfig::default(),
            prototype_link: None,
            children: Vec::new(),
        }
    }

    pub fn new_text(text: &str, x: f32, y: f32, size: f32, color: &str) -> Self {
        Self {
            id: format!("text_{}", Self::gen_id()),
            name: text.to_string(),
            node_type: NodeType::Text,
            x,
            y,
            width: text.len() as f32 * size * 0.6 + 10.0,
            height: size * 1.3,
            rotation: 0.0,
            opacity: 1.0,
            visible: true,
            locked: false,
            fill_hex: color.to_string(),
            stroke_hex: None,
            stroke_width: 0.0,
            corner_radius: 0.0,
            text_content: text.to_string(),
            font_size: size,
            auto_layout: AutoLayoutConfig::default(),
            prototype_link: None,
            children: Vec::new(),
        }
    }

    pub fn contains_point(&self, px: f32, py: f32) -> bool {
        px >= self.x && px <= (self.x + self.width) && py >= self.y && py <= (self.y + self.height)
    }

    fn gen_id() -> String {
        format!("{:x}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos() % 1_000_000_000)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesignDocument {
    pub title: String,
    pub version: String,
    pub nodes: Vec<DesignNode>,
}

impl Default for DesignDocument {
    fn default() -> Self {
        let mut doc = Self {
            title: "Mobile App Flow".to_string(),
            version: "1.0.0".to_string(),
            nodes: Vec::new(),
        };

        // Create Default Welcome Screen Frame (iPhone 16 Pro dimensions: 393 x 852)
        let mut welcome = DesignNode::new_frame("Welcome Screen", 100.0, 100.0, 393.0, 852.0);
        let hero_card = DesignNode::new_rectangle("Hero Banner", 24.0, 60.0, 345.0, 240.0, "#18181b");
        let title = DesignNode::new_text("FigCraft Studio (Pure Rust)", 44.0, 180.0, 22.0, "#f4f4f5");
        let mut cta = DesignNode::new_rectangle("Get Started Button", 24.0, 720.0, 345.0, 56.0, "#0d99ff");
        cta.prototype_link = Some(PrototypeLink {
            target_frame_id: "dashboard_frame".to_string(),
            transition: "instant".to_string(),
        });

        welcome.children.push(hero_card);
        welcome.children.push(title);
        welcome.children.push(cta);

        // Create Default Features Dashboard Frame
        let mut dash = DesignNode::new_frame("Features Dashboard", 560.0, 100.0, 393.0, 852.0);
        dash.id = "dashboard_frame".to_string();
        let dash_title = DesignNode::new_text("100% Native Rust Engine", 24.0, 60.0, 20.0, "#38bdf8");
        dash.children.push(dash_title);

        doc.nodes.push(welcome);
        doc.nodes.push(dash);

        doc
    }
}
