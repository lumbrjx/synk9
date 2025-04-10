use futures::FutureExt;
use std::env;
use std::error::Error as StdError;
use std::sync::Arc;
use std::time::Duration as StdDuration;
use tokio::sync::{mpsc, Mutex};
use tokio::time::sleep;
use dotenv::dotenv;
use rust_socketio::{asynchronous::Client, asynchronous::ClientBuilder, Payload, RawClient};
use serde_json::json;
use serde::{Deserialize, Serialize};
use chrono::Local;
use thiserror::Error;

// Import your local modules
mod plc_io;
mod mdb_client;

// ------------------- Types and Constants -------------------

const MONITOR_INTERVAL_MS: u64 = 100;
const CONNECTION_RETRY_MS: u64 = 2000;
const MESSAGE_CHANNEL_SIZE: usize = 32;

// ------------------- Structures and Enums -------------------

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SensorConfig {
    pub id: String,
    pub label: String,
    pub start_register: u16,
    pub end_register: u16,
}

#[derive(Debug, Serialize, Deserialize)]
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
    CleanUp,
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Validation failed: {0}")]
    ValidationError(String),
    
    #[error("Deserialization failed: {0}")]
    DeserializationError(String),
    
    #[error("PLC communication error: {0}")]
    PlcError(String),
    
    #[error("Socket.IO error: {0}")]
    SocketIoError(String),
    
    #[error("Internal error: {0}")]
    InternalError(String),
}

// Convert from std errors to our custom error type
impl From<Box<dyn StdError>> for AppError {
    fn from(error: Box<dyn StdError>) -> Self {
        AppError::InternalError(error.to_string())
    }
}

// ------------------- State Management -------------------

#[derive(Debug)]
pub struct SharedState {
    pub registered_sensors: Vec<SensorConfig>,
    pub paused_agent: bool,
}

impl SharedState {
    pub fn new() -> Arc<Mutex<Self>> {
        Arc::new(Mutex::new(Self {
            registered_sensors: Vec::new(),
            paused_agent: false,
        }))
    }

    pub fn add_sensor(&mut self, sensor: SensorConfig) {
        println!("Adding sensor: {:?}", sensor);
        self.registered_sensors.push(sensor);
        println!("Current sensors: {:?}", self.registered_sensors);
    }

    pub fn remove_sensor(&mut self, id: &str) {
        self.registered_sensors.retain(|sensor| sensor.id != id);
        println!("Sensor {} removed, remaining: {:?}", id, self.registered_sensors);
    }

    pub fn cleanup_sensors(&mut self) {
        self.registered_sensors.clear();
        println!("All sensors cleared");
    }
    
    pub fn edit_sensor(
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
            println!("Sensor {} updated: {:?}", id, sensor);
        }
    }
}

// ------------------- PLC Agent -------------------

pub struct Agent {
    pub slave_ctx: Arc<Mutex<tokio_modbus::client::Context>>,
    pub event: ChEvent,
    pub socket_io: Client,
    pub state: Arc<Mutex<SharedState>>,
}

impl Agent {
    pub fn new(
        slave_ctx: Arc<Mutex<tokio_modbus::client::Context>>,
        event: ChEvent,
        socket_io: Client,
        state: Arc<Mutex<SharedState>>,
    ) -> Self {
        Self {
            slave_ctx,
            event,
            socket_io,
            state,
        }
    }

    // Handle events coming from Socket.IO
    pub async fn handle_master_event(&mut self) -> Result<(), AppError> {
        match &self.event {
            ChEvent::CleanUp => {
                let mut state = self.state.lock().await;
                if state.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }
                state.cleanup_sensors();
            }
            ChEvent::HealthCheck => {
                let state = self.state.lock().await;
                self.send_json("health_check", &state.registered_sensors).await?;
            }
            ChEvent::Stop => {
                println!("Received STOP event -> Stopping PLC.");
                if self.state.lock().await.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }

                let mut slave_ctx = self.slave_ctx.lock().await;
                plc_io::stop_plc(&mut slave_ctx).await
                    .map_err(|e| AppError::PlcError(e.to_string()))?;
            }
            ChEvent::Write { reg, val } => {
                println!("Received WRITE event -> Writing {} to register {}.", val, reg);
                if self.state.lock().await.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }

                let mut slave_ctx = self.slave_ctx.lock().await;
                plc_io::write_to_plc(&mut slave_ctx, *reg, *val).await
                    .map_err(|e| AppError::PlcError(e.to_string()))?;
            }
            ChEvent::Wait => {
                // Just a placeholder, nothing to do
            }
            ChEvent::AddSensor {
                id,
                label,
                end_register,
                start_register,
            } => {
                println!("Processing AddSensor: {}", id);
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
                state.add_sensor(new_sensor);
            }
            ChEvent::RemoveSensor { id } => {
                let mut state = self.state.lock().await;
                if state.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }
                state.remove_sensor(id);
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
                state.edit_sensor(id, label.clone(), *start_register, *end_register);
            }
            ChEvent::PauseAgent => {
                let mut state = self.state.lock().await;
                state.paused_agent = !state.paused_agent;
                let status = if state.paused_agent { "paused" } else { "resumed" };
                println!("Agent {}", status);
                self.send_message("agent_status", &format!("Agent {}", status)).await?;
            }
        }
        Ok(())
    }

    // Helper method to send simple text messages
    async fn send_message(&self, event: &str, message: &str) -> Result<(), AppError> {
        self.socket_io
            .emit(event, json!({ "message": message }))
            .await
            .map_err(|e| AppError::SocketIoError(e.to_string()))?;
        Ok(())
    }

    // Helper method to send JSON data
    async fn send_json<T: Serialize>(
        &self,
        event: &str,
        data: &T,
    ) -> Result<(), AppError> {
        self.socket_io
            .emit(event, serde_json::to_value(data).unwrap())
            .await
            .map_err(|e| AppError::SocketIoError(e.to_string()))?;
        Ok(())
    }

    // Start monitoring PLC
    pub async fn start_monitoring(agent: Arc<Mutex<Self>>) -> Result<(), AppError> {
        // Small delay to ensure everything is initialized
        sleep(tokio::time::Duration::from_millis(MONITOR_INTERVAL_MS)).await;
        
        println!("Starting PLC monitoring...");
        
        // Clone the agent for the monitoring task
        let monitoring_agent = agent.clone();
        
        // Spawn a task for continuous monitoring
        tokio::spawn(async move {
            if let Err(e) = monitor_plc_loop(monitoring_agent).await {
                eprintln!("Monitoring error: {}", e);
            }
        });
        
        Ok(())
    }
}

// ------------------- Monitoring Logic -------------------

async fn monitor_plc_loop(agent: Arc<Mutex<Agent>>) -> Result<(), AppError> {
    let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(MONITOR_INTERVAL_MS));
    
    loop {
        interval.tick().await;
        
        // Get a snapshot of current sensors
        let sensors = {
            let agent_lock = agent.lock().await;
            let state_lock = agent_lock.state.lock().await;
            
            // Skip if agent is paused
            if state_lock.paused_agent {
                continue;
            }
            
            state_lock.registered_sensors.clone()
        };
        
        // Process each sensor if there are any
        if !sensors.is_empty() {
            println!("Processing sensors: {:?}", sensors);
            process_all_sensors(agent.clone(), sensors).await?;
        }
    }
}

async fn process_all_sensors(agent: Arc<Mutex<Agent>>, sensors: Vec<SensorConfig>) -> Result<(), AppError> {
    for sensor in sensors {
        let agent_clone = agent.clone();
        
        // Process each sensor in its own task
        tokio::spawn(async move {
            if let Err(err) = process_single_sensor(agent_clone, sensor.clone()).await {
                eprintln!("Error processing sensor {}: {}", sensor.id, err);
            }
        });
    }
    
    Ok(())
}

async fn process_single_sensor(
    agent: Arc<Mutex<Agent>>,
    sensor: SensorConfig,
) -> Result<(), AppError> {
    let agent_guard = agent.lock().await;
    let mut slave_ctx = agent_guard.slave_ctx.lock().await;
    
    // Read sensor data from PLC
    let sensor_value = plc_io::read_from_plc(
        &mut slave_ctx, sensor.start_register, sensor.end_register
    ).await
    .map_err(|e| AppError::PlcError(e.to_string()))?;

    // Create timestamp
    let timestamp = Local::now().format("%y/%m/%d %H:%M:%S").to_string();
    println!("{} - Sensor {}: {}", timestamp, sensor.id, sensor_value);

    // Create data structure for sending
    let modbus_data = plc_io::ModbusData {
        time: timestamp,
        aq1: sensor_value,
    };

    // Send data via Socket.IO
    agent_guard.send_json("sensor_data", &modbus_data).await?;

    Ok(())
}

// ------------------- Socket.IO Message Handling -------------------

fn parse_message_to_event(data: &str) -> Result<ChEvent, AppError> {
    serde_json::from_str(data)
        .map_err(|e| AppError::DeserializationError(format!("Failed to parse event: {}", e)))
}

// ------------------- Main Function -------------------

#[tokio::main]
async fn main() -> Result<(), Box<dyn StdError>> {
    // Load environment variables
    dotenv().ok();
    
    // Get configuration from environment
    let hostname = env::var("HOSTNAME").expect("HOSTNAME environment variable is required");
    let socket_io_url = env::var("WS_URL").expect("WS_URL environment variable is required");
    
    println!("Starting agent, connecting to PLC at {} and Socket.IO at {}", hostname, socket_io_url);
    
    // Create Modbus client
    let ctx = Arc::new(Mutex::new(mdb_client::create_mdb_client(&hostname).await?));
    
    // Create a channel for Socket.IO events
    let (tx, mut rx) = mpsc::channel::<ChEvent>(MESSAGE_CHANNEL_SIZE);
    
    // Create Socket.IO client with event handlers
    let socket = setup_socket_io(&socket_io_url, tx.clone()).await?;
    
    // Create shared state
    let shared_state = SharedState::new();
    
    // Create agent
    let agent = Agent::new(ctx, ChEvent::Wait, socket, shared_state);
    let agent_arc = Arc::new(Mutex::new(agent));
    
    // Start monitoring
    Agent::start_monitoring(agent_arc.clone()).await
        .map_err(|e| Box::new(e) as Box<dyn StdError>)?;
    
    println!("Agent initialized successfully");
    
    // Main event loop
    loop {
        if let Some(event) = rx.recv().await {
            let mut agent_lock = agent_arc.lock().await;
            agent_lock.event = event;
            println!("Processing event: {:?}", agent_lock.event);
            
            if let Err(e) = agent_lock.handle_master_event().await {
                eprintln!("Error handling event: {}", e);
            }
        }
    }
}

// Set up Socket.IO connection with event handlers
async fn setup_socket_io(url: &str, tx: mpsc::Sender<ChEvent>) -> Result<Client, Box<dyn StdError>> {
    let socket = ClientBuilder::new(url)
        .namespace("/")
        .on("test", move |payload: Payload, socket: Client| {
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
                                },
                                Err(e) => eprintln!("Failed to parse message: {}", e),
                            }
                        }
                    },
                    Payload::Binary(bin_data) => {
                        println!("Received binary data: {:?}", bin_data);
                    },
                }
                
                // Send acknowledgment
                if let Err(e) = socket.emit("test", json!({"status": "received"})).await {
                    eprintln!("Failed to send acknowledgment: {}", e);
                }
            }
            .boxed()
        })
        .on("error", |err, _| {
            async move { 
                eprintln!("Socket.IO error: {:?}", err);
            }.boxed()
        })
        .on("disconnect", |_, _| {
            async move {
                println!("Disconnected from Socket.IO server");
            }.boxed()
        })
        .connect()
        .await?;
    
    println!("Connected to Socket.IO server: {}", url);
    Ok(socket)
}
