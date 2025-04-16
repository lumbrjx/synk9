use futures::FutureExt;
use rust_socketio::{asynchronous::Client, asynchronous::ClientBuilder, Payload};
use serde_json::{json, Value};
use std::error::Error as StdError;
use tokio::sync::mpsc::Sender;

use crate::helper::{parse_message_to_event, AppError};
use crate::ChEvent;

pub struct SocketServer {
    client: Client,
    event_sender: Sender<ChEvent>,
}
impl SocketServer {
    pub async fn new(url: &str, event_sender: Sender<ChEvent>) -> anyhow::Result<Self, AppError> {
        let sender = event_sender.clone();
        let client = ClientBuilder::new(url)
            .namespace("/")
            .on("data", move |payload: Payload, socket: Client| {
                let sender = sender.clone();
                Box::pin(Self::handle_data(sender, payload, socket))
            })
            .on("error", |err, _| Box::pin(Self::handle_error(err)))
            .on("disconnect", |_, _| Box::pin(Self::handle_disconnect()))
            .connect()
            .await
            .map_err(|err| AppError::InternalError(err.to_string()))?;
        println!("Connected to Socket.IO server: {}", url);

        Ok(SocketServer {
            client,
            event_sender,
        })
    }
    pub async fn send_message(&self, event: &str, message: Value) -> Result<(), AppError> {
        // json!({ "message": message })
        self.client
            .emit(event, message)
            .await
            .map_err(|e| AppError::SocketIoError(e.to_string()))
    }
    async fn handle_error(err: Payload) {
        eprintln!("Socket.IO error: {:?}", err);
    }
    async fn handle_disconnect() {
        println!("Disconnected from Socket.IO server");
    }
    async fn handle_data(sender: Sender<ChEvent>, payload: Payload, socket: Client) {
        match payload {
            Payload::String(ref str) => {
                println!("Received message: {}", str);

                if let Payload::String(data) = payload {
                    match parse_message_to_event(&data) {
                        Ok(event) => {
                            if let Err(e) = sender.send(event).await {
                                eprintln!("Failed to send event to channel: {}", e);
                            }
                        }
                        Err(e) => eprintln!("Failed to parse message: {}", e),
                    }
                }
            }
            Payload::Binary(bin_data) => {
                println!("Received binary data: {:?}", bin_data);
            }
        }

        if let Err(e) = socket.emit("data", json!({"status": "received"})).await {
            eprintln!("Failed to send acknowledgment: {}", e);
        }
    }
}
