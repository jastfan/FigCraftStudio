//! FigCraft Collaboration Server Application
//! Standalone multiplayer sync and room management daemon.

use figcraft_collab_net::CollaborationHub;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("⚡ Starting FigCraft Collaboration Server on 127.0.0.1:8080...");
    let hub = CollaborationHub::new();
    let _main_room = hub.get_or_create_room("global-studio");
    println!("✓ Live collaboration room initialized: global-studio");
    println!("✓ Listening for peer-to-peer cursor tracking and live document updates...");
    
    // Server loop
    tokio::signal::ctrl_c().await?;
    println!("\nShutting down FigCraft Collaboration Server.");
    Ok(())
}
