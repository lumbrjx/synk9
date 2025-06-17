use chrono::Local;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::agent::Agent;
use crate::config::{SensorConfig, MONITOR_INTERVAL_MS};
use crate::helper::AppError;
use crate::plc_io;

pub async fn monitor_plc_loop(agent: Arc<Mutex<Agent>>) -> Result<(), AppError> {
    let mut interval =
        tokio::time::interval(tokio::time::Duration::from_millis(MONITOR_INTERVAL_MS));

    loop {
        interval.tick().await;

        // Get a snapshot of current sensors
        let sensors = {
            let agent_lock = agent.lock().await;
            let state_lock = agent_lock.state.lock().await;

            if state_lock.paused_agent {
                println!("im locekdd");
                continue;
            }

            state_lock.registered_sensors.clone()
        };

        if !sensors.is_empty() {
            // println!("Processing sensors: {:?}", sensors);
            process_all_sensors(agent.clone(), sensors).await?;
        }
    }
}

async fn process_all_sensors(
    agent: Arc<Mutex<Agent>>,
    sensors: Vec<SensorConfig>,
) -> Result<(), AppError> {
    for sensor in sensors {
        let agent_clone = agent.clone();
        let agentlock = agent.clone();

        // Process each sensor in its own task
        tokio::spawn(async move {
            if let Err(err) = process_single_sensor(agent_clone, sensor.clone()).await {
                println!("Socket.IO error: {:?}", err);
                if err == AppError::SocketIoError("EngineIO Error".to_string()) {
                    let agent_guard = agentlock.lock().await;
                    let mut state_lock = agent_guard.state.lock().await;
                    state_lock.registered_sensors.clear();
                }
            }
        })
        .await
        .expect("Error");
    }
    Ok(())
}

async fn process_single_sensor(
    agent: Arc<Mutex<Agent>>,
    sensor: SensorConfig,
) -> Result<(), AppError> {
    let agent_guard = agent.lock().await;
    let mut slave_ctx = agent_guard.slave_ctx.lock().await;

    let sensor_value = plc_io::read_from_plc(
        &mut slave_ctx,
        sensor.start_register,
        sensor.end_register,
        sensor.r_type.clone(),
    )
    .await
    .map_err(|e| AppError::PlcError(e.to_string()))?;

    let timestamp = Local::now().format("%y/%m/%d %H:%M:%S").to_string();

    if sensor.s_type == "sensor" {
        let modbus_data = plc_io::ModbusData {
            sensor_id: sensor.id.clone(),
            time: timestamp.clone(),
            value: sensor_value,
            key: sensor.label.clone(),
            register: sensor.register.clone(),
            s_type: String::from("sensor"),
            r_type: sensor.r_type,
        };
        agent_guard
            .send_json("monitoring_streamline", &modbus_data)
            .await?;
    } else if sensor.s_type == "general" {
        let modbus_data = plc_io::ModbusData {
            sensor_id: sensor.id,
            time: timestamp,
            value: sensor_value,
            key: sensor.label,
            s_type: String::from("general"),
            register: sensor.register,
            r_type: sensor.r_type,
        };
        agent_guard
            .send_json("monitoring_streamline", &modbus_data)
            .await?;
    }
    Ok(())
}
