//! FigCraft Format & Code Generation
//! Native .figcraft serialization, clean SVG export, and Dev Mode code generation (CSS / Tailwind / React / SwiftUI).

use figcraft_doc::{DesignDocument, DesignNode};
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;

pub struct FormatIO;

impl FormatIO {
    pub fn save_figcraft_file(path: &Path, doc: &DesignDocument) -> Result<(), std::io::Error> {
        let json = serde_json::to_string_pretty(doc)?;
        let mut file = File::create(path)?;
        file.write_all(json.as_bytes())?;
        Ok(())
    }

    pub fn load_figcraft_file(path: &Path) -> Result<DesignDocument, std::io::Error> {
        let mut file = File::open(path)?;
        let mut content = String::new();
        file.read_to_string(&mut content)?;
        let doc: DesignDocument = serde_json::from_str(&content)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        Ok(doc)
    }

    pub fn export_svg(node: &DesignNode) -> String {
        let mut svg = String::new();
        svg.push_str(&format!(
            r#"<svg width="{}" height="{}" viewBox="0 0 {} {}" fill="none" xmlns="http://www.w3.org/2000/svg">"#,
            node.width, node.height, node.width, node.height
        ));
        svg.push_str(&format!(
            r#"<rect width="{}" height="{}" rx="{}" fill="{}"/>"#,
            node.width, node.height, node.corner_radius, node.fill_hex
        ));
        svg.push_str("</svg>");
        svg
    }

    pub fn generate_dev_code(node: &DesignNode, target: &str) -> String {
        match target {
            "tailwind" => {
                format!(
                    r#"<div className="w-[{}px] h-[{}px] rounded-[{}px] bg-[{}]" />"#,
                    node.width.round(), node.height.round(), node.corner_radius, node.fill_hex
                )
            }
            "react" => {
                format!(
                    "export interface {}Props {{\n  className?: string;\n}}\n\nexport const {} = () => (\n  <div style={{{{ width: {}, height: {}, background: '{}', borderRadius: {} }}}} />\n);",
                    node.name.replace([' ', '-', '.'], ""),
                    node.name.replace([' ', '-', '.'], ""),
                    node.width, node.height, node.fill_hex, node.corner_radius
                )
            }
            "swiftui" => {
                format!(
                    "struct {}View: View {{\n    var body: some View {{\n        RoundedRectangle(cornerRadius: {})\n            .fill(Color(hex: \"{}\"))\n            .frame(width: {}, height: {})\n    }}\n}}",
                    node.name.replace([' ', '-', '.'], ""),
                    node.corner_radius,
                    node.fill_hex,
                    node.width,
                    node.height
                )
            }
            _ => {
                // Default: CSS
                let mut lines = Vec::new();
                lines.push(format!("/* {} */", node.name));
                lines.push(format!("width: {}px;", node.width.round()));
                lines.push(format!("height: {}px;", node.height.round()));
                lines.push(format!("background: {};", node.fill_hex));
                if node.corner_radius > 0.0 {
                    lines.push(format!("border-radius: {}px;", node.corner_radius));
                }
                lines.join("\n")
            }
        }
    }
}
