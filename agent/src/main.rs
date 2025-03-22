use tokio::sync::Mutex;
use dotenv::dotenv;
use futures::StreamExt;
use std::env;
use std::sync::Arc;
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
    let (ws_stream, _) = connect_async(&ws_url).await?;
    println!("Connected to WebSocket server: {}", ws_url);
    
    let (ws_write, ws_read) = ws_stream.split();
    
    let (tx, mut rx) = mpsc::channel::<ChEvent>(32);
    
    tokio::spawn(handle_websocket_messages(ws_read, tx.clone()));
    
    let shared_state = SharedState::new();
    
    let agent = Agent::new(ctx, ChEvent::Wait, ws_write, shared_state);
    let agent_arc = Arc::new(Mutex::new(agent));
    
    let monitoring_agent = agent_arc.clone();
    tokio::spawn(async move {
        if let Err(e) = Agent::monitor_plc(monitoring_agent).await {
            eprintln!("Error in PLC monitoring: {}", e);
        }
    });
    
    loop {
        if let Some(event) = rx.recv().await {
            let mut agent_lock = agent_arc.lock().await;
            agent_lock.event = event;
            println!("{:?}", agent_lock.event);
            
            if let Err(e) = agent_lock.handle_master_event().await {
                eprintln!("Error handling event: {}", e);
            }
        }
    }
}
