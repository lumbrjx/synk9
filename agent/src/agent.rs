use serde::Serialize;
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::mpsc::Receiver;
use tokio::sync::Mutex;
use tokio::time::sleep;

use crate::config::{SensorConfig, MONITOR_INTERVAL_MS};
use crate::helper::AppError;
use crate::monitoring::monitor_plc_loop;
use crate::plc_io;
use crate::state::SharedState;
use crate::ws::SocketServer;
use crate::ChEvent;

pub struct Agent {
    pub slave_ctx: Arc<Mutex<tokio_modbus::client::Context>>,
    pub socket_client: SocketServer,
    pub event_reciever: Receiver<ChEvent>,
    pub state: SharedState,
}

impl Agent {
    pub fn new(
        slave_ctx: Arc<Mutex<tokio_modbus::client::Context>>,
        socket_client: SocketServer,
        event_reciever: Receiver<ChEvent>,
    ) -> Self {
        Self {
            slave_ctx,
            socket_client,
            event_reciever,
            state: SharedState::new(),
        }
    }
    pub async fn run(&mut self) -> Result<(), AppError> {
        self.handle_master_event(ChEvent::Wait).await;
        while let Some(event) = self.event_reciever.recv().await {
            if let Err(err) = self.handle_master_event(event).await {
                println!("{}", err)
            }
        }
        Err(AppError::InternalError("Some Error".to_string()))
    }

    pub async fn handle_master_event(&mut self, event: ChEvent) -> Result<(), AppError> {
        match event {
            ChEvent::CleanUp => {
                if self.state.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }
                self.state.cleanup_sensors();
            }
            ChEvent::HealthCheck => {
                self.send_json("health_check", &self.state.registered_sensors)
                    .await?;
            }
            ChEvent::Stop => {
                println!("Received STOP event -> Stopping PLC.");
                if self.state.paused_agent {
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
                if self.state.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }

                let mut slave_ctx = self.slave_ctx.lock().await;
                plc_io::write_to_plc(&mut slave_ctx, reg, val)
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
                    start_register ,
                    end_register ,
                };

                if self.state.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }
                self.state.add_sensor(new_sensor);
            }
            ChEvent::RemoveSensor { id } => {
                if self.state.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }
                self.state.remove_sensor(&id);
            }
            ChEvent::EditSensor {
                id,
                label,
                start_register,
                end_register,
            } => {
                if self.state.paused_agent {
                    self.send_message("agent_locked", "Agent is locked").await?;
                    return Ok(());
                }
                self.state.edit_sensor(&id, label.clone(), start_register, end_register);
            }
            ChEvent::PauseAgent => {
                self.state.paused_agent = !self.state.paused_agent;
                let status = if self.state.paused_agent {
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
        self.socket_client
            .send_message(event, json!({ "message": message }))
            .await
    }

    pub async fn send_json<T: Serialize>(&self, event: &str, data: &T) -> Result<(), AppError> {
        let value =
            serde_json::to_value(data).map_err(|err| AppError::ValidationError(err.to_string()))?;
        self.socket_client.send_message(event, value).await
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
