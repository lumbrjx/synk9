use futures::{StreamExt, SinkExt};
use serde_json::json;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::protocol::Message;

#[tokio::main]
async fn main() {
    let addr = "127.0.0.1:9001";
    let listener = TcpListener::bind(&addr).await.expect("Failed to bind");

    println!("WebSocket server running on ws://{}", addr);

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(async move {
            let ws_stream = accept_async(stream)
                .await
                .expect("Failed to accept WebSocket connection");
            let (ws_write, mut ws_read) = ws_stream.split();

            let ws_write = Arc::new(Mutex::new(ws_write));

            println!("Client connected!");

            // Clone the write handle and spawn a task to send events
            let ws_write_clone = Arc::clone(&ws_write);
            tokio::spawn(async move {
                sleep(Duration::from_secs(5)).await;
                let stop_msg = json!({"type_of_event": "stop", "data": {"register": 512, "value": 42}}).to_string();
                let _ = ws_write_clone.lock().await.send(Message::Text(stop_msg)).await;

                sleep(Duration::from_secs(5)).await;
                let write_msg = json!({"type_of_event": "write", "data": {"register": 512, "value": 42}}).to_string();
                let _ = ws_write_clone.lock().await.send(Message::Text(write_msg)).await;
            });

            while let Some(message) = ws_read.next().await {
                match message {
                    Ok(Message::Text(text)) => {
                        println!("Received: {}", text);
                        let _ = ws_write.lock().await.send(Message::Text(format!("Echo: {}", text))).await;
                    }
                    Ok(Message::Binary(bin)) => {
                        println!("Received binary message: {:?}", bin);
                    }
                    Ok(Message::Close(_)) => {
                        println!("Client disconnected.");
                        break;
                    }
                    Err(e) => {
                        eprintln!("Error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        });
    }
}

