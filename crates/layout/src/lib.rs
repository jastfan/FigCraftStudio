//! FigCraft Layout Engine
//! Flexbox-style Auto Layout calculation solver.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AutoLayoutDirection {
    Horizontal,
    Vertical,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LayoutAlignment {
    Start,
    Center,
    End,
    SpaceBetween,
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
    pub primary_align: LayoutAlignment,
    pub counter_align: LayoutAlignment,
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
            primary_align: LayoutAlignment::Start,
            counter_align: LayoutAlignment::Start,
        }
    }
}

pub struct LayoutItem {
    pub width: f32,
    pub height: f32,
    pub out_x: f32,
    pub out_y: f32,
}

pub fn solve_auto_layout(
    config: &AutoLayoutConfig,
    parent_width: f32,
    parent_height: f32,
    items: &mut [LayoutItem],
) {
    if !config.enabled || items.is_empty() {
        return;
    }

    match config.direction {
        AutoLayoutDirection::Vertical => {
            let mut curr_y = config.padding_top;
            for item in items.iter_mut() {
                item.out_y = curr_y;
                item.out_x = match config.counter_align {
                    LayoutAlignment::Center => {
                        config.padding_left + ((parent_width - config.padding_left - config.padding_right - item.width) * 0.5).max(0.0)
                    }
                    LayoutAlignment::End => {
                        parent_width - config.padding_right - item.width
                    }
                    _ => config.padding_left,
                };
                curr_y += item.height + config.gap;
            }
        }
        AutoLayoutDirection::Horizontal => {
            let mut curr_x = config.padding_left;
            for item in items.iter_mut() {
                item.out_x = curr_x;
                item.out_y = match config.counter_align {
                    LayoutAlignment::Center => {
                        config.padding_top + ((parent_height - config.padding_top - config.padding_bottom - item.height) * 0.5).max(0.0)
                    }
                    LayoutAlignment::End => {
                        parent_height - config.padding_bottom - item.height
                    }
                    _ => config.padding_top,
                };
                curr_x += item.width + config.gap;
            }
        }
    }
}
