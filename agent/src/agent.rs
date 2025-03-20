use chrono::Local;
use futures::{stream::SplitSink, SinkExt};
use std::error::Error as StdError;
use std::pin::Pin;
use tokio::net::TcpStream;
use tokio::time::{sleep, Duration};
use tokio_modbus::client::Context;
use tokio_tungstenite::{tungstenite::protocol::Message, MaybeTlsStream, WebSocketStream};

use crate::plc_io::{read_from_plc, stop_plc, write_to_plc, ModbusData};
use serde::{Deserialize, Serialize};
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type_of_event", content = "data")]

pub enum ChEvent {
    Wait,
    Stop,
    Write { reg: u16, val: u16 },
}

pub struct Agent {
    pub slave_ctx: Context,
    pub event: ChEvent,
    pub ws_tx: Pin<Box<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>,
}
impl Agent {
    pub fn new(
        slave_ctx: Context,
        event: ChEvent,
        ws_tx: SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>,
    ) -> Self {
        Self {
            slave_ctx,
            event,
            ws_tx: Box::pin(ws_tx),
        }
    }
    pub async fn handle_master_event(&mut self) -> Result<(), Box<dyn StdError>> {
        match self.event {
            ChEvent::Stop => {
                println!("Received STOP event -> Stopping PLC.");
                stop_plc(&mut self.slave_ctx).await?;
                Ok(())
            }
            ChEvent::Write { reg, val } => {
                println!(
                    "Received WRITE event -> Writing {} to register {}.",
                    val, reg
                );
                write_to_plc(&mut self.slave_ctx, reg, val).await?;
                Ok(())
            }
            ChEvent::Wait {} => Ok(()),
        }
    }
    // TODO!: make it dynamique
    pub async fn monitor_plc(&mut self) -> Result<(), Box<dyn StdError>> {
        sleep(Duration::from_millis(100)).await;
        let temp_sensor = read_from_plc(&mut self.slave_ctx, 512, 1).await?;
        let timestamp = Local::now().format("%y/%m/%d %H:%M:%S").to_string();

        println!("{} temp_sensor: {}", timestamp, temp_sensor);

        let modbus_data = ModbusData {
            time: timestamp,
            aq1: temp_sensor,
        };

        let json_data = serde_json::to_string(&modbus_data)?;
        self.ws_tx
            .send(Message::Text(json_data))
            .await
            .map_err(|e| Box::new(e) as Box<dyn StdError>)?;

        Ok(())
    }
}
