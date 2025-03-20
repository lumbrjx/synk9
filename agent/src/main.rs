use dotenv::dotenv;
use futures::{stream::SplitSink, StreamExt};
use serde::{Deserialize, Serialize};
use std::env;
use std::error::Error as StdError;
use tokio::{net::TcpStream, sync::mpsc};
use tokio_modbus::client::Context;
use tokio_tungstenite::{
    connect_async, tungstenite::protocol::Message, MaybeTlsStream, WebSocketStream,
};

mod agent;
mod mdb_client;
mod plc_io;
use agent::*;
use mdb_client::*;

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type_of_event", content = "data")]
pub enum ChEvent {
    Stop,
    Write { reg: u16, val: u16 },
}

#[derive(Serialize, Deserialize, Debug)]
struct WsEvent {
    type_of_event: String,
    data: WriteData,
}

#[derive(Serialize, Deserialize, Debug)]
struct WriteData {
    register: u16,
    value: u16,
}

/// Modbus Data
#[derive(Serialize, Deserialize)]
struct ModbusData {
    time: String,
    aq1: u16,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    let hostname = env::var("HOSTNAME").expect("HOSTNAME environment variable is required");
    let ws_url = env::var("WS_URL").expect("WS_URL environment variable is required");

    let ctx = create_mdb_client(&hostname).await?;
    let (ws_write, ws_read) = connect_async(&ws_url).await?.0.split();
    println!("Connected to WebSocket server: {}", ws_url);

    let (tx, rx) = mpsc::channel::<ChEvent>(32);

    tokio::spawn(handle_websocket_messages(ws_read, tx.clone()));

    spawn_agent(ctx, ws_write, rx).await?;

    Ok(())
}

async fn handle_websocket_messages(
    mut ws_read: impl StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>> + Unpin,
    tx: mpsc::Sender<ChEvent>,
) {
    while let Some(message) = ws_read.next().await {
        match message {
            Ok(Message::Text(text)) => {
                if let Ok(event) = serde_json::from_str::<WsEvent>(&text) {
                    match event.type_of_event.as_str() {
                        "stop" => {
                            if tx.send(ChEvent::Stop).await.is_err() {
                                eprintln!("Main loop dropped, stopping WebSocket listener.");
                                break;
                            }
                        }
                        "write" => {
                            if tx
                                .send(ChEvent::Write {
                                    reg: event.data.register,
                                    val: event.data.value,
                                })
                                .await
                                .is_err()
                            {
                                eprintln!("Main loop dropped, stopping WebSocket listener.");
                                break;
                            }
                        }
                        _ => println!("Unknown event: {}", event.type_of_event),
                    }
                } else {
                    eprintln!("Failed to parse message as JSON: {}", text);
                }
            }
            Ok(Message::Close(_)) => {
                println!("WebSocket connection closed by server.");
                break;
            }
            Err(e) => {
                eprintln!("Error receiving message: {}", e);
                break;
            }
            _ => {}
        }
    }
}

async fn spawn_agent(
    ctx: Context,
    ws_write: SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>,
    mut rx: mpsc::Receiver<ChEvent>,
) -> Result<(), Box<dyn StdError>> {
    let mut agent = Agent::new(ctx, ChEvent::Stop, ws_write); 

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
