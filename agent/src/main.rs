use chrono::Local;
use serde::{Deserialize, Serialize};
use std::{fs::OpenOptions, io::Write};
use tokio::net::lookup_host; // Import DNS resolver
use tokio::net::TcpStream;
use tokio_modbus::client::{tcp, Context};
use tokio_modbus::prelude::{Reader, Writer, *}; // Import Reader and Writer

#[derive(Serialize, Deserialize)]
struct ModbusData {
    time: String,
    aq1: u16,
}

async fn stop_plc(ctx: &mut Context) -> Result<(), Box<dyn std::error::Error>> {
    let stop_register = 0;
    let stop_value = 0b00001000;
    ctx.write_single_register(stop_register, stop_value).await?;
    println!(
        "PLC stopped by writing {} to register {}",
        stop_value, stop_register
    );
    Ok(())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let hostname = "127.0.0.1:502";

    // 🔹 Resolve the hostname to an IP address
    let mut addrs = lookup_host(hostname).await?;
    let addr = addrs.next().ok_or("DNS resolution failed")?;
    let mut ctx = tcp::connect_slave(addr, Slave(1)).await?;

    loop {
        let aq1_data = ctx.read_holding_registers(512, 1).await?;
        let aq1_value = aq1_data[0];

        let timestamp = Local::now().format("%y/%m/%d %H:%M:%S").to_string();

        let modbus_entry = ModbusData {
            time: timestamp,
            aq1: aq1_value,
        };

        let mut json_list: Vec<ModbusData> = match std::fs::read_to_string("modbus_data.json") {
            Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| vec![]),
            Err(_) => vec![],
        };

        json_list.push(modbus_entry);

        let json_data = serde_json::to_string_pretty(&json_list)?;
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open("modbus_data.json")?;
        file.write_all(json_data.as_bytes())?;

        println!("AQ1 Value: {}", aq1_value);

        if aq1_value == 0 {
            stop_plc(&mut ctx).await?;
            break;
        }

        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }

    Ok(())
}
