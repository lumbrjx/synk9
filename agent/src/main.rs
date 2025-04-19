use agent::Agent;
use config::{ChEvent, MESSAGE_CHANNEL_SIZE};
use state::SharedState;
use ws::setup_socket_io;
use std::env;
use std::error::Error as StdError;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use dotenv::dotenv;

mod plc_io;
mod mdb_client;
mod state;
mod agent;
mod monitoring;
mod ws;
mod helper;
mod config;


#[tokio::main]
async fn main() -> Result<(), Box<dyn StdError>> {
    dotenv().ok();
    
    let hostname = env::var("HOSTNAME").expect("HOSTNAME environment variable is required");
    let fingerprint= env::var("FINGERPRINT").expect("FINGERPRINT environment variable is required");
    let socket_io_url = env::var("WS_URL").expect("WS_URL environment variable is required");
    
    println!("Starting agent, connecting to PLC at {} and Socket.IO at {}", hostname, socket_io_url);
    
    let ctx = Arc::new(Mutex::new(mdb_client::create_mdb_client(&hostname).await?));
    
    // Channel For event dispathing
    let (tx, mut rx) = mpsc::channel::<ChEvent>(MESSAGE_CHANNEL_SIZE);
    
    let socket = setup_socket_io(&socket_io_url, tx.clone(), &fingerprint).await?;
    
    // Create shared state
    let shared_state = SharedState::new();
    
    // Create agent
    let agent = Agent::new(ctx, ChEvent::Wait, socket, shared_state);
    let agent_arc = Arc::new(Mutex::new(agent));
    
    Agent::start_monitoring(agent_arc.clone()).await
        .map_err(|e| Box::new(e) as Box<dyn StdError>)?;
    
    println!("Agent initialized successfully");
    
    // Main event loop
    loop {
        if let Some(event) = rx.recv().await {
            let mut agent_lock = agent_arc.lock().await;
            agent_lock.event = event;
            println!("Processing event: {:?}", agent_lock.event);
            
            if let Err(e) = agent_lock.handle_master_event().await {
                eprintln!("Error handling event: {}", e);
            }
        }
    }
}


