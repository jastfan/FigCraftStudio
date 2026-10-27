//! FigCraft MCP (Model Context Protocol) Server
//! Enables AI coding and design agents (Claude, Antigravity, Cursor) to autonomously
//! query, inspect, and mutate the FigCraft canvas via standard JSON-RPC 2.0 tools.

use figcraft_doc::{DesignDocument, DesignNode, NodeType};
use figcraft_engine::{EngineCommand, EngineJournal};
use figcraft_format::FormatIO;
use figcraft_layout::{AutoLayoutConfig, AutoLayoutDirection, LayoutAlignment};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
use std::sync::{Arc, Mutex};

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub method: String,
    pub params: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<Value>,
}

pub struct FigCraftMcpServer {
    doc: Arc<Mutex<DesignDocument>>,
    history: Arc<Mutex<EngineJournal>>,
}

impl Default for FigCraftMcpServer {
    fn default() -> Self {
        Self::new()
    }
}

impl FigCraftMcpServer {
    pub fn new() -> Self {
        Self {
            doc: Arc::new(Mutex::new(DesignDocument::default())),
            history: Arc::new(Mutex::new(EngineJournal::new())),
        }
    }

    pub fn with_document(doc: DesignDocument) -> Self {
        Self {
            doc: Arc::new(Mutex::new(doc)),
            history: Arc::new(Mutex::new(EngineJournal::new())),
        }
    }

    pub fn handle_request(&self, req: JsonRpcRequest) -> JsonRpcResponse {
        let id = req.id.clone().unwrap_or(Value::Null);

        match req.method.as_str() {
            "initialize" => {
                let result = json!({
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {
                            "listChanged": false
                        },
                        "resources": {
                            "subscribe": false,
                            "listChanged": false
                        }
                    },
                    "serverInfo": {
                        "name": "figcraft-mcp-server",
                        "version": "0.11.2"
                    }
                });
                JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id,
                    result: Some(result),
                    error: None,
                }
            }

            "tools/list" => {
                let tools = json!({
                    "tools": [
                        {
                            "name": "get_document_state",
                            "description": "Returns full hierarchy of frames, layers, and properties on canvas",
                            "inputSchema": {
                                "type": "object",
                                "properties": {}
                            }
                        },
                        {
                            "name": "create_frame",
                            "description": "Creates a top-level artboard/screen (e.g. iPhone, Web, Desktop)",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "name": { "type": "string" },
                                    "x": { "type": "number" },
                                    "y": { "type": "number" },
                                    "width": { "type": "number" },
                                    "height": { "type": "number" },
                                    "corner_radius": { "type": "number" },
                                    "fill_hex": { "type": "string" }
                                },
                                "required": ["name", "width", "height"]
                            }
                        },
                        {
                            "name": "create_shape",
                            "description": "Creates a rectangle, ellipse, or text inside a parent frame",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "parent_id": { "type": "string" },
                                    "node_type": { "type": "string", "enum": ["rectangle", "ellipse", "text"] },
                                    "name": { "type": "string" },
                                    "x": { "type": "number" },
                                    "y": { "type": "number" },
                                    "width": { "type": "number" },
                                    "height": { "type": "number" },
                                    "fill_hex": { "type": "string" },
                                    "corner_radius": { "type": "number" }
                                },
                                "required": ["node_type", "name", "width", "height"]
                            }
                        },
                        {
                            "name": "set_auto_layout",
                            "description": "Configures Flexbox auto-layout on a frame (direction, gap, padding, alignment)",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "node_id": { "type": "string" },
                                    "direction": { "type": "string", "enum": ["horizontal", "vertical"] },
                                    "gap": { "type": "number" },
                                    "padding": { "type": "number" }
                                },
                                "required": ["node_id", "direction"]
                            }
                        },
                        {
                            "name": "export_dev_code",
                            "description": "Generates copy-paste production code (css, tailwind, react, swiftui) for any layer",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "node_id": { "type": "string" },
                                    "target": { "type": "string", "enum": ["css", "tailwind", "react", "swiftui"] }
                                },
                                "required": ["node_id", "target"]
                            }
                        }
                    ]
                });
                JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id,
                    result: Some(tools),
                    error: None,
                }
            }

            "tools/call" => {
                let params = req.params.unwrap_or(Value::Null);
                let tool_name = params.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let args = params.get("arguments").cloned().unwrap_or(json!({}));

                let result = match tool_name {
                    "get_document_state" => {
                        let doc = self.doc.lock().unwrap();
                        json!({
                            "title": doc.title,
                            "nodes_count": doc.nodes.len(),
                            "nodes": doc.nodes
                        })
                    }
                    "create_frame" => {
                        let name = args.get("name").and_then(|v| v.as_str()).unwrap_or("New Frame");
                        let x = args.get("x").and_then(|v| v.as_f64()).unwrap_or(100.0) as f32;
                        let y = args.get("y").and_then(|v| v.as_f64()).unwrap_or(100.0) as f32;
                        let w = args.get("width").and_then(|v| v.as_f64()).unwrap_or(393.0) as f32;
                        let h = args.get("height").and_then(|v| v.as_f64()).unwrap_or(852.0) as f32;

                        let mut frame = DesignNode::new(NodeType::Frame, name, x, y, w, h);
                        if let Some(fill) = args.get("fill_hex").and_then(|v| v.as_str()) {
                            frame.fill_hex = fill.to_string();
                        }
                        if let Some(r) = args.get("corner_radius").and_then(|v| v.as_f64()) {
                            frame.corner_radius = r as f32;
                        }

                        let node_id = frame.id.clone();
                        let mut doc = self.doc.lock().unwrap();
                        let mut history = self.history.lock().unwrap();
                        history.execute(EngineCommand::InsertNode { parent_id: None, node: frame }, &mut doc);

                        json!({
                            "status": "success",
                            "created_frame_id": node_id
                        })
                    }
                    "create_shape" => {
                        let ntype_str = args.get("node_type").and_then(|v| v.as_str()).unwrap_or("rectangle");
                        let ntype = match ntype_str {
                            "ellipse" => NodeType::Ellipse,
                            "text" => NodeType::Text,
                            _ => NodeType::Rectangle,
                        };
                        let name = args.get("name").and_then(|v| v.as_str()).unwrap_or("Shape");
                        let parent_id = args.get("parent_id").and_then(|v| v.as_str()).map(|s| s.to_string());
                        let x = args.get("x").and_then(|v| v.as_f64()).unwrap_or(20.0) as f32;
                        let y = args.get("y").and_then(|v| v.as_f64()).unwrap_or(20.0) as f32;
                        let w = args.get("width").and_then(|v| v.as_f64()).unwrap_or(120.0) as f32;
                        let h = args.get("height").and_then(|v| v.as_f64()).unwrap_or(80.0) as f32;

                        let mut shape = DesignNode::new(ntype, name, x, y, w, h);
                        if let Some(fill) = args.get("fill_hex").and_then(|v| v.as_str()) {
                            shape.fill_hex = fill.to_string();
                        }
                        if let Some(r) = args.get("corner_radius").and_then(|v| v.as_f64()) {
                            shape.corner_radius = r as f32;
                        }

                        let node_id = shape.id.clone();
                        let mut doc = self.doc.lock().unwrap();
                        let mut history = self.history.lock().unwrap();
                        history.execute(EngineCommand::InsertNode { parent_id, node: shape }, &mut doc);

                        json!({
                            "status": "success",
                            "created_shape_id": node_id
                        })
                    }
                    "set_auto_layout" => {
                        let node_id = args.get("node_id").and_then(|v| v.as_str()).unwrap_or("");
                        let dir_str = args.get("direction").and_then(|v| v.as_str()).unwrap_or("vertical");
                        let gap = args.get("gap").and_then(|v| v.as_f64()).unwrap_or(12.0) as f32;
                        let pad = args.get("padding").and_then(|v| v.as_f64()).unwrap_or(16.0) as f32;

                        let config = AutoLayoutConfig {
                            enabled: true,
                            direction: if dir_str == "horizontal" {
                                AutoLayoutDirection::Horizontal
                            } else {
                                AutoLayoutDirection::Vertical
                            },
                            gap,
                            padding_top: pad,
                            padding_right: pad,
                            padding_bottom: pad,
                            padding_left: pad,
                            primary_align: LayoutAlignment::Start,
                            counter_align: LayoutAlignment::Start,
                        };

                        let mut doc = self.doc.lock().unwrap();
                        let mut history = self.history.lock().unwrap();
                        history.execute(EngineCommand::SetAutoLayout { node_id: node_id.to_string(), config }, &mut doc);

                        json!({ "status": "success", "node_id": node_id })
                    }
                    "export_dev_code" => {
                        let node_id = args.get("node_id").and_then(|v| v.as_str()).unwrap_or("");
                        let target = args.get("target").and_then(|v| v.as_str()).unwrap_or("css");
                        let doc = self.doc.lock().unwrap();

                        let found = doc.nodes.iter().find(|n| n.id == node_id);
                        if let Some(node) = found {
                            let code = FormatIO::generate_dev_code(node, target);
                            json!({ "node_id": node_id, "target": target, "code": code })
                        } else {
                            json!({ "error": "Node not found" })
                        }
                    }
                    _ => json!({ "error": format!("Unknown tool: {}", tool_name) }),
                };

                JsonRpcResponse {
                    jsonrpc: "2.0".to_string(),
                    id,
                    result: Some(json!({ "content": [{ "type": "text", "text": result.to_string() }] })),
                    error: None,
                }
            }

            _ => JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id,
                result: None,
                error: Some(json!({ "code": -32601, "message": "Method not found" })),
            },
        }
    }

    pub fn run_stdio(&self) -> io::Result<()> {
        let stdin = io::stdin();
        let mut stdout = io::stdout();

        for line in stdin.lock().lines() {
            let line = line?;
            if line.trim().is_empty() {
                continue;
            }

            if let Ok(req) = serde_json::from_str::<JsonRpcRequest>(&line) {
                let resp = self.handle_request(req);
                let json = serde_json::to_string(&resp)?;
                writeln!(stdout, "{}", json)?;
                stdout.flush()?;
            }
        }
        Ok(())
    }
}
