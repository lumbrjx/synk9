use dotenv::dotenv;
use futures::StreamExt;
use std::env;
use tokio::sync::mpsc;
use tokio_tungstenite::connect_async;

mod agent;
mod mdb_client;
mod plc_io;
mod ws;
use agent::*;
use mdb_client::*;
use ws::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    let hostname = env::var("HOSTNAME").expect("HOSTNAME environment variable is required");
    let ws_url = env::var("WS_URL").expect("WS_URL environment variable is required");

    let ctx = create_mdb_client(&hostname).await?;
    let (ws_write, ws_read) = connect_async(&ws_url).await?.0.split();
    println!("Connected to WebSocket server: {}", ws_url);

    let (tx, mut rx) = mpsc::channel::<ChEvent>(32);

    tokio::spawn(handle_websocket_messages(ws_read, tx.clone()));

    let mut agent = Agent::new(ctx, ChEvent::Wait, ws_write);

    loop {
        tokio::select! {
            // Process WebSocket events
            Some(event) = rx.recv() => {
                agent.event = event; // Update event
                agent.handle_master_event().await?;
            }

            // Monitor PLC and send data via WebSocket
            _ = agent.monitor_plc() => {}
        }
    }
}
