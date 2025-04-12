use futures::FutureExt;
use rust_socketio::{asynchronous::Client, asynchronous::ClientBuilder, Payload};
use serde_json::json;
use std::error::Error as StdError;
use tokio::sync::mpsc;

use crate::helper::parse_message_to_event;
use crate::ChEvent;

pub async fn setup_socket_io(
    url: &str,
    tx: mpsc::Sender<ChEvent>,
) -> Result<Client, Box<dyn StdError>> {
    let socket = ClientBuilder::new(url)
        .namespace("/")
        .on("data", move |payload: Payload, socket: Client| {
            let tx = tx.clone();

            async move {
                match payload {
                    Payload::String(ref str) => {
                        println!("Received message: {}", str);

                        if let Payload::String(data) = payload {
                            match parse_message_to_event(&data) {
                                Ok(event) => {
                                    if let Err(e) = tx.send(event).await {
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
            .boxed()
        })
        .on("error", |err, _| {
            async move {
                eprintln!("Socket.IO error: {:?}", err);
            }
            .boxed()
        })
        .on("disconnect", |_, _| {
            async move {
                println!("Disconnected from Socket.IO server");
            }
            .boxed()
        })
        .connect()
        .await?;

    println!("Connected to Socket.IO server: {}", url);
    Ok(socket)
}
