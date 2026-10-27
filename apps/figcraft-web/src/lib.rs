//! FigCraft Web Studio Engine
//! WebAssembly and Browser Bridge for FigCraft Studio.

use figcraft_doc::DesignDocument;
use figcraft_format::FormatIO;

pub struct FigCraftWebBridge;

impl FigCraftWebBridge {
    pub fn default_document() -> String {
        let doc = DesignDocument::default();
        serde_json::to_string(&doc).unwrap_or_default()
    }

    pub fn export_svg(json: &str) -> String {
        if let Ok(doc) = serde_json::from_str::<DesignDocument>(json) {
            if let Some(node) = doc.nodes.first() {
                return FormatIO::export_svg(node);
            }
        }
        String::new()
    }
}
