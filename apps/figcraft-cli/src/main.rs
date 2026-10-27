//! FigCraft Headless CLI Tool
//! Provides terminal batch commands: inspect, export-svg, export-png, dev-code, and --mcp.

use figcraft_format::FormatIO;
use figcraft_mcp::FigCraftMcpServer;
use figcraft_render::Renderer2D;
use std::env;
use std::path::Path;

fn print_help() {
    println!("FigCraft CLI v0.11.2 — Clean-Room Headless Interface Design Tool");
    println!("Usage:");
    println!("  figcraft-cli --mcp                               Run Model Context Protocol (MCP) server over stdio");
    println!("  figcraft-cli inspect <file.figcraft>             Inspect document hierarchy and metadata");
    println!("  figcraft-cli export-svg <file.figcraft> <dir>    Export vector SVG files");
    println!("  figcraft-cli export-png <file.figcraft> <dir>    Render 2D rasterized PNGs with tiny-skia");
    println!("  figcraft-cli dev-code <file.figcraft> [target]   Generate code (css, tailwind, react, swiftui)");
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        print_help();
        return Ok(());
    }

    let command = &args[1];

    match command.as_str() {
        "help" | "--help" | "-h" => {
            print_help();
        }

        "--mcp" | "mcp" => {
            let server = FigCraftMcpServer::new();
            server.run_stdio()?;
        }

        "inspect" => {
            if args.len() < 3 {
                eprintln!("Error: Missing .figcraft file path.");
                return Ok(());
            }
            let path = Path::new(&args[2]);
            let doc = FormatIO::load_figcraft_file(path)?;
            println!("Title: {}", doc.title);
            println!("Version: {}", doc.version);
            println!("Total Top-Level Nodes: {}", doc.nodes.len());
            for node in &doc.nodes {
                println!(" - [{:?}] '{}' ({}x{} at {},{})", node.node_type, node.name, node.width, node.height, node.x, node.y);
            }
        }

        "export-svg" => {
            if args.len() < 4 {
                eprintln!("Usage: figcraft-cli export-svg <file.figcraft> <output_dir>");
                return Ok(());
            }
            let doc_path = Path::new(&args[2]);
            let out_dir = Path::new(&args[3]);
            std::fs::create_dir_all(out_dir)?;

            let doc = FormatIO::load_figcraft_file(doc_path)?;
            for node in &doc.nodes {
                let svg_content = FormatIO::export_svg(node);
                let out_file = out_dir.join(format!("{}.svg", node.name.replace(' ', "_")));
                std::fs::write(&out_file, svg_content)?;
                println!("Exported SVG: {}", out_file.display());
            }
        }

        "export-png" => {
            if args.len() < 4 {
                eprintln!("Usage: figcraft-cli export-png <file.figcraft> <output_dir> [scale]");
                return Ok(());
            }
            let doc_path = Path::new(&args[2]);
            let out_dir = Path::new(&args[3]);
            let scale: f32 = args.get(4).and_then(|s| s.parse().ok()).unwrap_or(2.0);
            std::fs::create_dir_all(out_dir)?;

            let doc = FormatIO::load_figcraft_file(doc_path)?;
            for node in &doc.nodes {
                if let Some(pixmap) = Renderer2D::render_node_to_pixmap(node, scale) {
                    if let Ok(png_data) = pixmap.encode_png() {
                        let out_file = out_dir.join(format!("{}_{}x.png", node.name.replace(' ', "_"), scale));
                        std::fs::write(&out_file, png_data)?;
                        println!("Exported PNG ({}x): {}", scale, out_file.display());
                    }
                }
            }
        }

        "dev-code" => {
            if args.len() < 3 {
                eprintln!("Usage: figcraft-cli dev-code <file.figcraft> [css|tailwind|react|swiftui]");
                return Ok(());
            }
            let doc_path = Path::new(&args[2]);
            let target = args.get(3).map(|s| s.as_str()).unwrap_or("css");
            let doc = FormatIO::load_figcraft_file(doc_path)?;
            for node in &doc.nodes {
                println!("/* =================== Layer: {} =================== */", node.name);
                println!("{}", FormatIO::generate_dev_code(node, target));
            }
        }

        unknown => {
            eprintln!("Unknown command '{}'", unknown);
            print_help();
        }
    }

    Ok(())
}
