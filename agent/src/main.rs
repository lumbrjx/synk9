use agent::Agent;
use config::{ChEvent, MESSAGE_CHANNEL_SIZE};
use dotenv::dotenv;
use helper::AppError;
use std::env;
use std::error::Error as StdError;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use ws::SocketServer;

mod agent;
mod config;
mod helper;
mod mdb_client;
mod monitoring;
mod plc_io;
mod state;
mod ws;

#[tokio::main]
async fn main() -> Result<(), AppError> {
    dotenv().ok();

    let hostname = env::var("HOSTNAME").expect("HOSTNAME environment variable is required");
    let socket_io_url = env::var("WS_URL").expect("WS_URL environment variable is required");

    println!(
        "Starting agent, connecting to PLC at {} and Socket.IO at {}",
        hostname, socket_io_url
    );

    let ctx = Arc::new(Mutex::new(
        mdb_client::create_mdb_client(&hostname)
            .await
            .map_err(|err| AppError::InternalError(err.to_string()))?,
    ));

    // Channel For event dispathing
    let (tx, event_reciever) = mpsc::channel::<ChEvent>(MESSAGE_CHANNEL_SIZE);

    let socket = SocketServer::new(&socket_io_url, tx).await?;


    // Create agent
    let agent = Arc::new(Mutex::new(Agent::new(
        ctx,
        socket,
        event_reciever,
    )));

    Agent::start_monitoring(agent.clone())
        .await
        .map_err(|e| Box::new(e) as Box<dyn StdError>)?;

    println!("Agent initialized successfully");

    tokio::task::spawn(async move { agent.lock().await.run().await })
        .await
        .expect("Something went really wrong, tokio task stopped.")
}
