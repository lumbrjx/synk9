use chrono::Local;
use futures::io;
use std::env;
use std::fs::File;
use std::sync::Arc;
use tokio::sync::watch;
use tokio::sync::Mutex;
use tokio::time::{self, Duration};

use futures::{stream::SplitSink, SinkExt};

use std::error::Error as StdError;
use std::fs::OpenOptions;
use std::io::Write;
use std::pin::Pin;
use tokio::net::TcpStream;
use tokio::time::sleep;
use tokio_modbus::client::Context;
use tokio_tungstenite::{tungstenite::protocol::Message, MaybeTlsStream, WebSocketStream};

use crate::plc_io::{read_from_plc, stop_plc, write_to_plc, ModbusData};
use serde::{Deserialize, Serialize};

type WsWriter = Pin<Box<SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>>>;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SensorConfig {
    pub id: String,
    pub label: String,
    pub start_register: u16,
    pub end_register: u16,
}

#[derive(Serialize, Debug)]
pub enum ChEvent {
    Wait,
    Stop,
    Write {
        reg: u16,
        val: u16,
    },
    AddSensor {
        id: String,
        label: String,
        start_register: u16,
        end_register: u16,
    },
    RemoveSensor {
        id: String,
    },
    EditSensor {
        id: String,
        label: String,
        start_register: u16,
        end_register: u16,
    },
    PauseAgent,
    HealthCheck,
    RequestRefresh,
}

#[derive(Debug)]
pub struct SharedState {
    pub registered_sensors: Vec<SensorConfig>,
    pub tx: watch::Sender<Vec<SensorConfig>>,
}

impl SharedState {
    pub fn new() -> Arc<Mutex<Self>> {
        let (tx, _) = watch::channel(Vec::new());
        Arc::new(Mutex::new(Self {
            registered_sensors: Vec::new(),
            tx,
        }))
    }

    async fn add_sensor(&mut self, sensor: SensorConfig) {
        self.registered_sensors.push(sensor);
        let _ = self.tx.send(self.registered_sensors.clone());
    }

    async fn remove_sensor(&mut self, id: &str) {
        self.registered_sensors.retain(|sensor| sensor.id != id);
        let _ = self.tx.send(self.registered_sensors.clone());
    }

    async fn get_subscriber(&self) -> watch::Receiver<Vec<SensorConfig>> {
        self.tx.subscribe()
    }
}

pub struct Agent {
    pub slave_ctx: Context,
    pub event: ChEvent,
    pub ws_tx: WsWriter,
    pub state: Arc<Mutex<SharedState>>,
}

async fn persist_sensor(
    id: &str,
    label: &str,
    start_register: u16,
    end_register: u16,
) -> Result<(), Box<dyn StdError>> {
    let event = format!("{},{},{},{}\n", id, label, start_register, end_register);
    let home = env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let cache_path = format!("{}/.cache/cache.txt", home);

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(cache_path)?;
    file.write_all(event.as_bytes())?;
    Ok(())
}

async fn remove_sensor_from_file(id: &str) -> Result<(), Box<dyn StdError>> {
    let home = env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let cache_path = format!("{}/.cache/cache.txt", home);

    let content = std::fs::read_to_string(&cache_path).unwrap_or_default();
    let mut lines: Vec<String> = content.lines().map(String::from).collect();

    lines.retain(|line| !line.starts_with(&format!("{},", id)));
    std::fs::write(&cache_path, lines.join("\n"))?;
    Ok(())
}

impl Agent {
    pub fn new(
        slave_ctx: Context,
        event: ChEvent,
        ws_tx: SplitSink<WebSocketStream<MaybeTlsStream<TcpStream>>, Message>,
        state: Arc<Mutex<SharedState>>,
    ) -> Self {
        Self {
            slave_ctx,
            event,
            ws_tx: Box::pin(ws_tx),
            state,
        }
    }

    pub async fn handle_master_event(&mut self) -> Result<(), Box<dyn StdError>> {
        match &self.event {
            ChEvent::Stop => {
                println!("Received STOP event -> Stopping PLC.");
                stop_plc(&mut self.slave_ctx).await?;
            }
            ChEvent::Write { reg, val } => {
                println!(
                    "Received WRITE event -> Writing {} to register {}.",
                    val, reg
                );
                write_to_plc(&mut self.slave_ctx, *reg, *val).await?;
            }
            ChEvent::Wait {} => {}
            ChEvent::AddSensor {
                id,
                label,
                end_register,
                start_register,
            } => {
                persist_sensor(id, label, *start_register, *end_register).await?;

                let new_sensor = SensorConfig {
                    id: id.to_string(),
                    label: label.to_string(),
                    start_register: *start_register,
                    end_register: *end_register,
                };

                let mut state = self.state.lock().await;
                state.add_sensor(new_sensor).await;
            }
            ChEvent::RemoveSensor { id } => {
                remove_sensor_from_file(id).await?;

                let mut state = self.state.lock().await;
                state.remove_sensor(id).await;

                println!("Sensor {} removed successfully", id);
            }
            _ => {}
        }

        Ok(())
    }

    pub async fn monitor_plc(agent: Arc<Mutex<Self>>) -> Result<(), Box<dyn StdError>> {
        sleep(Duration::from_millis(100)).await;

        // Extract the state and create a subscriber
        let state_arc = {
            let locked_agent = agent.lock().await;
            locked_agent.state.clone()
        };

        let state = state_arc.lock().await;
        let rx = state.get_subscriber().await;
        drop(state); 

        tokio::spawn(async move {
            monitor_sensors(agent, rx).await;
        });

        Ok(())
    }
}

// Extracted function for monitoring sensors
async fn monitor_sensors(agent: Arc<Mutex<Agent>>, mut rx: watch::Receiver<Vec<SensorConfig>>) {
    let mut sensors = rx.borrow().clone();

    loop {
        let mut interval = time::interval(Duration::from_millis(100));

        loop {
            tokio::select! {
                _ = rx.changed() => {
                    sensors = rx.borrow().clone(); // Update sensors when state changes
                }
                _ = interval.tick() => {
                    process_all_sensors(agent.clone(), sensors.clone()).await; // Keep processing
                }
            }
        }
    }
}

// Process all sensors in parallel
async fn process_all_sensors(agent: Arc<Mutex<Agent>>, sensors: Vec<SensorConfig>) {
    for sensor in sensors {
        let agent_clone = agent.clone();

        tokio::spawn(async move {
            if let Err(err) = process_single_sensor(agent_clone, sensor).await {
                eprintln!("Error processing sensor: {}", err);
            }
        });
    }
}

// Process a single sensor
async fn process_single_sensor(
    agent: Arc<Mutex<Agent>>,
    sensor: SensorConfig,
) -> Result<(), Box<dyn StdError>> {
    let mut agent_guard = agent.lock().await;
    let temp_sensor = read_from_plc(
        &mut agent_guard.slave_ctx,
        sensor.start_register,
        sensor.end_register,
    )
    .await?;

    let timestamp = Local::now().format("%y/%m/%d %H:%M:%S").to_string();
    println!("{} temp_sensor: {}", timestamp, temp_sensor);

    let modbus_data = ModbusData {
        time: timestamp,
        aq1: temp_sensor,
    };

    let json_data = serde_json::to_string(&modbus_data)?;
    agent_guard.ws_tx.send(Message::Text(json_data)).await?;

    Ok(())
}
