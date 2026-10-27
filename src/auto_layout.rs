//! FigCraft Studio — Pure Rust Auto-Layout Engine
//! Automatic flexbox layout calculations for nested design frames.

use crate::document::{Alignment, AutoLayoutDirection, DesignNode, NodeType};

pub struct AutoLayoutEngine;

impl AutoLayoutEngine {
    pub fn compute_frame_layout(frame: &mut DesignNode) {
        if frame.node_type != NodeType::Frame || !frame.auto_layout.enabled {
            return;
        }

        let cfg = &frame.auto_layout;
        let is_horiz = cfg.direction == AutoLayoutDirection::Horizontal;
        let gap = cfg.gap;
        let pad_top = cfg.padding_top;
        let pad_right = cfg.padding_right;
        let pad_bottom = cfg.padding_bottom;
        let pad_left = cfg.padding_left;

        let mut offset = if is_horiz { pad_left } else { pad_top };
        let cross_size = if is_horiz {
            (frame.height - pad_top - pad_bottom).max(0.0)
        } else {
            (frame.width - pad_left - pad_right).max(0.0)
        };

        for child in frame.children.iter_mut() {
            if !child.visible {
                continue;
            }

            // Primary axis positioning
            if is_horiz {
                child.x = offset;
                offset += child.width + gap;
            } else {
                child.y = offset;
                offset += child.height + gap;
            }

            // Cross axis alignment
            match cfg.align_items {
                Alignment::Center => {
                    if is_horiz {
                        child.y = pad_top + (cross_size - child.height) / 2.0;
                    } else {
                        child.x = pad_left + (cross_size - child.width) / 2.0;
                    }
                }
                Alignment::End => {
                    if is_horiz {
                        child.y = pad_top + cross_size - child.height;
                    } else {
                        child.x = pad_left + cross_size - child.width;
                    }
                }
                Alignment::Start => {
                    if is_horiz {
                        child.y = pad_top;
                    } else {
                        child.x = pad_left;
                    }
                }
            }
        }
    }

    pub fn compute_recursive(node: &mut DesignNode) {
        if node.node_type == NodeType::Frame && node.auto_layout.enabled {
            Self::compute_frame_layout(node);
        }
        for child in node.children.iter_mut() {
            Self::compute_recursive(child);
        }
    }
}
