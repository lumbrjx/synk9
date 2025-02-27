use tokio_modbus::prelude::{*, Reader, Writer}; // Import Reader and Writer
use tokio_modbus::client::{tcp, Context};
use tokio::net::TcpStream;
use std::net::SocketAddr;
use serde::{Serialize, Deserialize};
use chrono::Local;
use std::{fs::OpenOptions, io::Write};

#[derive(Serialize, Deserialize)]
struct ModbusData {
    time: String,
    aq1: u16,
}

async fn stop_plc(ctx: &mut Context) {
    // Assuming V1.3 is mapped to holding register 40001 (Modbus address 0)
    let stop_register = 0; // Modbus address for V1.3 (40001 in Modbus is address 0)
    let stop_value = 0b00001000; // Set bit 3 (V1.3) to 1 to stop the PLC
    ctx.write_single_register(stop_register, stop_value).await.unwrap();
    println!("PLC stopped by writing {} to register {}", stop_value, stop_register);
}

#[tokio::main]
async fn main() {
    let addr: SocketAddr = "192.168.139.216:502".parse().unwrap(); // IP dyal LOGO!
    let mut ctx = tcp::connect_slave(addr, Slave(1)).await.unwrap();

    loop {
        let aq1_data = ctx.read_holding_registers(512, 1).await.unwrap();
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

        let json_data = serde_json::to_string_pretty(&json_list).unwrap();
        let mut file = OpenOptions::new().write(true).create(true).truncate(true).open("modbus_data.json").unwrap();
        file.write_all(json_data.as_bytes()).unwrap();

        println!("AQ1 Value: {}", aq1_value);

        // Example condition to stop the PLC
        if aq1_value == 4 {
            stop_plc(&mut ctx).await;
            break; // Exit the loop after stopping the PLC
        }

        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
}
