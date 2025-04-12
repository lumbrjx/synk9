use serde::{Deserialize, Serialize};

pub const MONITOR_INTERVAL_MS: u64 = 100;
pub const CONNECTION_RETRY_MS: u64 = 2000;
pub const MESSAGE_CHANNEL_SIZE: usize = 32;

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
