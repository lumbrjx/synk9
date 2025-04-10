use crate::plc_io::{read_from_plc, stop_plc, write_to_plc, ModbusData};
use chrono::Local;
use rust_socketio::{asynchronous::Client, Payload};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::error::Error as StdError;
use std::sync::Arc;
use std::thread::sleep;
use thiserror::Error;
use tokio::sync::{watch, Mutex};
use tokio::time::{self, Duration};
use tokio_modbus::client::Context;
use validator::{Validate, ValidationError};

// Remove the WebSocket types and replace with Socket.IO client
type SocketIoClient = Client;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SensorConfig {
    pub id: String,
    pub label: String,
    pub start_register: u16,
    pub end_register: u16,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum ChEvent {
    // #[validate]
    Wait,
    // #[validate]
    Stop,
    // #[validate]
    Write {
        // #[validate(range(min = 0, max = 65535))]
        reg: u16,
        // #[validate(range(min = 0, max = 65535))]
        val: u16,
    },
    // #[validate]
    AddSensor {
        id: String,
        label: String,
        start_register: u16,
        end_register: u16,
    },
    // #[validate]
    RemoveSensor {
        id: String,
    },
    // #[validate]
    EditSensor {
        id: String,
        label: String,
        start_register: u16,
        end_register: u16,
    },
    PauseAgent,
    HealthCheck,
    CleanUp,
}
#[derive(Debug, Error)]
pub enum ParseError {
    #[error("Validation failed: {0}")]
    ValidationError(String),
    #[error("Deserialization failed: {0}")]
    DeserializationError(String),
}
#[derive(Debug)]
pub struct SharedState {
    pub registered_sensors: Vec<SensorConfig>,
    pub paused_agent: bool,
    pub tx: watch::Sender<Vec<SensorConfig>>,
}

impl SharedState {
    pub fn new() -> Arc<Mutex<Self>> {
        // Initialize with an empty vector
        let (tx, _) = watch::channel(Vec::new());

        Arc::new(Mutex::new(Self {
            registered_sensors: Vec::new(),
            paused_agent: false,
            tx,
        }))
    }

    async fn add_sensor(&mut self, sensor: SensorConfig) {
        println!("Adding sensor: {:?}", sensor);
        self.registered_sensors.push(sensor);
        println!("Sensors after add: {:?}", self.registered_sensors);

        if self.tx.send(self.registered_sensors.clone()).is_err() {
            eprintln!("Failed to send sensor update!");
        } else {
            println!("Successfully sent sensor update to channel");
        }
    }

    async fn remove_sensor(&mut self, id: &str) {
        self.registered_sensors.retain(|sensor| sensor.id != id);
        let _ = self.tx.send(self.registered_sensors.clone());
    }

    async fn cleanup_sensors(&mut self) {
        self.registered_sensors.clear();
        let _ = self.tx.send(self.registered_sensors.clone());
    }
    
    pub async fn edit_sensor(
        &mut self,
        id: &str,
        new_label: String,
        new_start_register: u16,
        new_end_register: u16,
    ) {
        if let Some(sensor) = self.registered_sensors.iter_mut().find(|s| s.id == id) {
            sensor.label = new_label;
            sensor.start_register = new_start_register;
            sensor.end_register = new_end_register;
        }
        let _ = self.tx.send(self.registered_sensors.clone());
    }
}

pub struct Agent {
    // Wrap Context in Arc<Mutex<>> to make it shareable and thread-safe
    pub slave_ctx: Arc<Mutex<Context>>,
    pub event: ChEvent,
    pub socket_io: SocketIoClient,
    pub state: Arc<Mutex<SharedState>>,
}

impl Agent {
    pub fn new(
        slave_ctx: Arc<Mutex<Context>>, // Use Arc<Mutex<Context>> for slave_ctx
        event: ChEvent,
        socket_io: SocketIoClient,
        state: Arc<Mutex<SharedState>>,
    ) -> Self {
        Self {
            slave_ctx,
            event,
            socket_io,
            state,
        }
    }

    pub async fn handle_master_event(&mut self) -> Result<(), Box<dyn StdError>> {
        match &self.event {
            ChEvent::CleanUp => {
                let mut state = self.state.lock().await;
                if state.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }
                state.cleanup_sensors().await;
            }
            ChEvent::HealthCheck => {
                let locked_state = self.state.lock().await;
                if locked_state.paused_agent {
                    self.send_json("health_check", &locked_state.registered_sensors)
                        .await?;
                    return Ok(());
                }
            }
            ChEvent::Stop => {
                println!("Received STOP event -> Stopping PLC.");
                if self.state.lock().await.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }

                let mut slave_ctx = self.slave_ctx.lock().await; // Lock it here
                stop_plc(&mut slave_ctx).await?;
            }
            ChEvent::Write { reg, val } => {
                println!(
                    "Received WRITE event -> Writing {} to register {}.",
                    val, reg
                );
                if self.state.lock().await.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }

                let mut slave_ctx = self.slave_ctx.lock().await; // Lock it here
                write_to_plc(&mut slave_ctx, *reg, *val).await?;
            }
            ChEvent::Wait => {}
            ChEvent::AddSensor {
                id,
                label,
                end_register,
                start_register,
            } => {
                println!("Processing AddSensor: {}", id); // Debug print
                let new_sensor = SensorConfig {
                    id: id.to_string(),
                    label: label.to_string(),
                    start_register: *start_register,
                    end_register: *end_register,
                };

                let mut state = self.state.lock().await;
                if state.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }
                state.add_sensor(new_sensor).await;
            }
            ChEvent::RemoveSensor { id } => {
                let mut state = self.state.lock().await;
                if state.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }
                state.remove_sensor(id).await;
                println!("Sensor {} removed successfully", id);
            }
            ChEvent::EditSensor {
                id,
                label,
                start_register,
                end_register,
            } => {
                let mut state = self.state.lock().await;
                if state.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }
                state
                    .edit_sensor(id, label.clone(), *start_register, *end_register)
                    .await;
                println!("Sensor {} edited successfully", id);
            }
            _ => {}
        }
        Ok(())
    }

    // Helper method to send simple text messages
    async fn send_message(&self, event: &str, message: &str) -> Result<(), Box<dyn StdError>> {
        self.socket_io
            .emit(event, json!({ "message": message }))
            .await?;
        Ok(())
    }

    // Helper method to send JSON data
    async fn send_json<T: Serialize>(
        &self,
        event: &str,
        data: &T,
    ) -> Result<(), Box<dyn StdError>> {
        self.socket_io
            .emit(event, serde_json::to_value(data)?)
            .await?;
        Ok(())
    }

    pub async fn monitor_plc(agent: Arc<Mutex<Self>>) -> Result<(), Box<dyn StdError>> {
        sleep(Duration::from_millis(100));

        // Create a clone of the state first to avoid deadlocks
        let state_arc = {
            let locked_agent = agent.lock().await;
            locked_agent.state.clone()
        };

        // Lock the state and create a new watch channel
        let mut state = state_arc.lock().await;

        // Create a new watch channel - replace the existing one
        let (new_tx, rx) = watch::channel(state.registered_sensors.clone());
        state.tx = new_tx;

        println!("Created new watch channel for monitoring");
        drop(state); // Release the lock before spawning tasks

        tokio::spawn(async move {
            monitor_sensors(agent, rx).await;
        });

        Ok(())
    }
}

// Extracted function for monitoring sensors
async fn monitor_sensors(agent: Arc<Mutex<Agent>>, mut rx: watch::Receiver<Vec<SensorConfig>>) {
    println!("Starting sensor monitoring...");

    // Initialize sensors from the current state of the channel
    let mut sensors = rx.borrow().clone();
    println!("Initial sensors: {:?}", sensors);

    let mut interval = time::interval(Duration::from_millis(100));

    loop {
        tokio::select! {
            result = rx.changed() => {
                if result.is_ok() {
                    sensors = rx.borrow().clone();
                    println!("Sensors updated: {:?}", sensors);

                    // Process immediately after an update
                    if !sensors.is_empty() {
                        process_all_sensors(agent.clone(), sensors.clone()).await;
                    }
                } else {
                    println!("Sensor channel was closed, exiting monitor loop");
                    break;
                }
            }
            _ = interval.tick() => {
                println!("Tick: processing sensors: {:?}", sensors);
                if !sensors.is_empty() {
                    process_all_sensors(agent.clone(), sensors.clone()).await;
                }
            }
        }
    }
}

async fn process_all_sensors(agent: Arc<Mutex<Agent>>, sensors: Vec<SensorConfig>) {
    println!("Processing all sensors: {:?}", sensors);

    for sensor in sensors {
        let agent_clone = agent.clone();
        tokio::spawn(async move {
            if let Err(err) = process_single_sensor(agent_clone, sensor.clone()).await {
                eprintln!("Error processing sensor {}: {}", sensor.id, err);
            }
        });
    }
}

async fn process_single_sensor(
    agent: Arc<Mutex<Agent>>,
    sensor: SensorConfig,
) -> Result<(), Box<dyn StdError>> {
    let agent_guard = agent.lock().await;
    let mut slave_ctx = agent_guard.slave_ctx.lock().await; // Lock here as well
    let temp_sensor =
        read_from_plc(&mut slave_ctx, sensor.start_register, sensor.end_register).await?;

    let timestamp = Local::now().format("%y/%m/%d %H:%M:%S").to_string();
    println!("{} temp_sensor: {}", timestamp, temp_sensor);

    let modbus_data = ModbusData {
        time: timestamp,
        aq1: temp_sensor,
    };

    // Use the helper method to send JSON data via Socket.IO
    agent_guard.send_json("sensor_data", &modbus_data).await?;

    Ok(())
}
