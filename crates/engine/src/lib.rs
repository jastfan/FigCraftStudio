//! FigCraft Engine
//! Command Registry, Document State Management, Undo/Redo Transaction Journal.

use figcraft_doc::{DesignDocument, DesignNode, PrototypeLink};
use figcraft_layout::AutoLayoutConfig;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EngineCommand {
    InsertNode { parent_id: Option<String>, node: DesignNode },
    UpdateNodeBounds { node_id: String, x: f32, y: f32, width: f32, height: f32 },
    SetNodeFill { node_id: String, fill_hex: String },
    SetNodeStroke { node_id: String, stroke_hex: Option<String>, width: f32 },
    SetCornerRadius { node_id: String, radius: f32 },
    SetAutoLayout { node_id: String, config: AutoLayoutConfig },
    LinkPrototype { source_id: String, link: PrototypeLink },
    DeleteNode { node_id: String },
}

pub struct EngineJournal {
    pub past: Vec<EngineCommand>,
    pub future: Vec<EngineCommand>,
}

impl Default for EngineJournal {
    fn default() -> Self {
        Self::new()
    }
}

impl EngineJournal {
    pub fn new() -> Self {
        Self {
            past: Vec::new(),
            future: Vec::new(),
        }
    }

    pub fn execute(&mut self, cmd: EngineCommand, doc: &mut DesignDocument) {
        Self::apply(&cmd, doc);
        self.past.push(cmd);
        self.future.clear();
    }

    pub fn can_undo(&self) -> bool {
        !self.past.is_empty()
    }

    pub fn can_redo(&self) -> bool {
        !self.future.is_empty()
    }

    fn apply(cmd: &EngineCommand, doc: &mut DesignDocument) {
        match cmd {
            EngineCommand::InsertNode { parent_id, node } => {
                if let Some(pid) = parent_id {
                    if let Some(parent) = doc.nodes.iter_mut().find(|n| &n.id == pid) {
                        parent.children.push(node.clone());
                    }
                } else {
                    doc.nodes.push(node.clone());
                }
            }
            EngineCommand::UpdateNodeBounds { node_id, x, y, width, height } => {
                if let Some(node) = doc.nodes.iter_mut().find(|n| &n.id == node_id) {
                    node.x = *x;
                    node.y = *y;
                    node.width = *width;
                    node.height = *height;
                }
            }
            EngineCommand::SetNodeFill { node_id, fill_hex } => {
                if let Some(node) = doc.nodes.iter_mut().find(|n| &n.id == node_id) {
                    node.fill_hex = fill_hex.clone();
                }
            }
            EngineCommand::SetNodeStroke { node_id, stroke_hex, width } => {
                if let Some(node) = doc.nodes.iter_mut().find(|n| &n.id == node_id) {
                    node.stroke_hex = stroke_hex.clone();
                    node.stroke_width = *width;
                }
            }
            EngineCommand::SetCornerRadius { node_id, radius } => {
                if let Some(node) = doc.nodes.iter_mut().find(|n| &n.id == node_id) {
                    node.corner_radius = *radius;
                }
            }
            EngineCommand::SetAutoLayout { node_id, config } => {
                if let Some(node) = doc.nodes.iter_mut().find(|n| &n.id == node_id) {
                    node.auto_layout = config.clone();
                }
            }
            EngineCommand::LinkPrototype { source_id, link } => {
                if let Some(node) = doc.nodes.iter_mut().find(|n| &n.id == source_id) {
                    node.prototype_link = Some(link.clone());
                }
            }
            EngineCommand::DeleteNode { node_id } => {
                doc.nodes.retain(|n| &n.id != node_id);
            }
        }
    }
}
