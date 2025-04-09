use futures::StreamExt;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::protocol::Message;

use crate::{
    agent::{ChEvent, SensorConfig},
    plc_io::WriteData,
};
#[derive(Serialize, Deserialize, Debug)]
pub struct WsCmdEvent {
    pub type_of_event: String,
    pub data: WriteData,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct WsConfigEvent {
    pub type_of_event: String,
    pub data: SensorConfig,
}

pub async fn handle_websocket_messages(
    mut ws_read: impl StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>> + Unpin,
    tx: mpsc::Sender<ChEvent>,
) {
    while let Some(message) = ws_read.next().await {
        match message {
            Ok(Message::Text(text)) => {
                if let Ok(event) = serde_json::from_str::<WsCmdEvent>(&text) {
                    match event.type_of_event.as_str() {
                        "clean_up" => {
                            if tx.send(ChEvent::CleanUp).await.is_err() {
                                eprintln!("Main loop dropped, stopping WebSocket listener.");
                                break;
                            }
                        }
                        "health_check" => {
                            if tx.send(ChEvent::HealthCheck).await.is_err() {
                                eprintln!("Main loop dropped, stopping WebSocket listener.");
                                break;
                            }
                        }
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
                }
                if let Ok(event) = serde_json::from_str::<WsConfigEvent>(&text) {
                    match event.type_of_event.as_str() {
                        "pause_agent" => {
                            if tx.send(ChEvent::PauseAgent).await.is_err() {
                                eprintln!("Main loop dropped, stopping WebSocket listener.");
                                break;
                            }
                        }
                        "edit_sensor" => {
                            if tx
                                .send(ChEvent::EditSensor {
                                    id: event.data.id,
                                    label: event.data.label,
                                    start_register: event.data.start_register,
                                    end_register: event.data.end_register,
                                })
                                .await
                                .is_err()
                            {
                                eprintln!("Main loop dropped, stopping WebSocket listener.");
                                break;
                            }
                        }
                        "add_sensor" => {
                            if tx
                                .send(ChEvent::AddSensor {
                                    id: event.data.id,
                                    label: event.data.label,
                                    start_register: event.data.start_register,
                                    end_register: event.data.end_register,
                                })
                                .await
                                .is_err()
                            {
                                eprintln!("Main loop dropped, stopping WebSocket listener.");
                                break;
                            }
                        }
                        "remove_sensor" => {
                            if tx
                                .send(ChEvent::RemoveSensor { id: event.data.id })
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
