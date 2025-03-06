use chrono::Local;
use serde::{Deserialize, Serialize};
use tokio_modbus::prelude::Reader;
mod mdb_client;
mod plc_io;
use mdb_client::*;
use plc_io::*;

#[derive(Serialize, Deserialize)]
struct ModbusData {
    time: String,
    aq1: u16,
}


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let hostname = "127.0.0.1:502";

    let mut ctx = create_mdb_client(&hostname).await?;

    loop {
        let aq1_data = ctx.read_holding_registers(512, 1).await?;
        let aq1_value = aq1_data[0];

        let timestamp = Local::now().format("%y/%m/%d %H:%M:%S").to_string();

        println!("{} AQ1 Value: {}", timestamp, aq1_value);

        if aq1_value == 0 {
            stop_plc(&mut ctx).await?;
        };

        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
}
