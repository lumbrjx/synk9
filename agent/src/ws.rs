use futures::StreamExt;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::protocol::Message;

use crate::{agent::ChEvent, plc_io::WriteData};
#[derive(Serialize, Deserialize, Debug)]
pub struct WsEvent {
    pub type_of_event: String,
    pub data: WriteData,
}
pub async fn handle_websocket_messages(
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

