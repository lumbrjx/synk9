use rust_socketio::asynchronous::Client;
use serde::Serialize;
use serde_json::json;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::sleep;

use crate::config::{SensorConfig, MONITOR_INTERVAL_MS};
use crate::helper::AppError;
use crate::monitoring::monitor_plc_loop;
use crate::plc_io;
use crate::state::SharedState;
use crate::ChEvent;

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
                println!("reciebved helath signal");
                self.send_json("health_check", &state.registered_sensors)
                    .await?;
            }
            ChEvent::Stop => {
                println!("Received STOP event -> Stopping PLC.");
                if self.state.lock().await.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }

                let mut slave_ctx = self.slave_ctx.lock().await;
                plc_io::stop_plc(&mut slave_ctx)
                    .await
                    .map_err(|e| AppError::PlcError(e.to_string()))?;
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

                let mut slave_ctx = self.slave_ctx.lock().await;
                plc_io::write_to_plc(&mut slave_ctx, *reg, *val)
                    .await
                    .map_err(|e| AppError::PlcError(e.to_string()))?;
            }
            ChEvent::Wait => {}
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
                state.remove_sensor(id);
                state.add_sensor(SensorConfig {
                    id: id.to_string(),
                    label: label.to_string(),
                    start_register: *start_register,
                    end_register: *end_register,
                });
            }
            ChEvent::PauseAgent => {
                let mut state = self.state.lock().await;
                state.paused_agent = !state.paused_agent;
                let status = if state.paused_agent {
                    "paused"
                } else {
                    "resumed"
                };
                println!("Agent {}", status);
                self.send_message("agent_status", &format!("Agent {}", status))
                    .await?;
            }
        }
        Ok(())
    }

    async fn send_message(&self, event: &str, message: &str) -> Result<(), AppError> {
        self.socket_io
            .emit(event, json!({ "message": message }))
            .await
            .map_err(|e| AppError::SocketIoError(e.to_string()))?;
        Ok(())
    }

    pub async fn send_json<T: Serialize>(&self, event: &str, data: &T) -> Result<(), AppError> {
        self.socket_io
            .emit(event, serde_json::to_value(data).unwrap())
            .await
            .map_err(|e| AppError::SocketIoError(e.to_string()))?;
        Ok(())
    }

    pub async fn start_monitoring(agent: Arc<Mutex<Self>>) -> Result<(), AppError> {
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
