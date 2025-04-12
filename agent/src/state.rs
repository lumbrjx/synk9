use std::sync::Arc;
use tokio::sync::Mutex;

use crate::config::SensorConfig;

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
        println!(
            "Sensor {} removed, remaining: {:?}",
            id, self.registered_sensors
        );
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
