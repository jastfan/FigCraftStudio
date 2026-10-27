//! FigCraft Color Engine
//! Precision sRGB color models, hex string parsers, RGBA conversions.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct RgbaColor {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: f32,
}

impl Default for RgbaColor {
    fn default() -> Self {
        Self { r: 13, g: 153, b: 255, a: 1.0 }
    }
}

impl RgbaColor {
    pub const fn new(r: u8, g: u8, b: u8, a: f32) -> Self {
        Self { r, g, b, a }
    }

    pub fn from_hex(hex: &str) -> Self {
        let clean = hex.trim().trim_start_matches('#');
        if clean.len() >= 6 {
            let r = u8::from_str_radix(&clean[0..2], 16).unwrap_or(255);
            let g = u8::from_str_radix(&clean[2..4], 16).unwrap_or(255);
            let b = u8::from_str_radix(&clean[4..6], 16).unwrap_or(255);
            let a = if clean.len() >= 8 {
                u8::from_str_radix(&clean[6..8], 16).unwrap_or(255) as f32 / 255.0
            } else {
                1.0
            };
            Self { r, g, b, a }
        } else {
            Self::default()
        }
    }

    pub fn to_hex(&self) -> String {
        format!("#{:02x}{:02x}{:02x}", self.r, self.g, self.b)
    }
}
