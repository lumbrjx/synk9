use serde::{Deserialize, Serialize};
use tokio_modbus::client::{Context, Reader};
use tokio_modbus::prelude::Writer;

#[derive(Serialize, Deserialize, Debug)]
pub struct WriteData {
    pub register: u16,
    pub value: u16,
}

#[derive(Serialize, Deserialize)]
pub struct ModbusData {
    pub time: String,
    pub value: u16,
    pub key: String,
}

pub async fn stop_plc(ctx: &mut Context) -> Result<(), Box<dyn std::error::Error>> {
    let stop_register = 0;
    let stop_value = 0b00001000;
    ctx.write_single_register(stop_register, stop_value).await?;
    println!(
        "PLC stopped by writing {} to register {}",
        stop_value, stop_register
    );
    Ok(())
}
pub async fn write_to_plc(
    ctx: &mut Context,
    register: u16,
    value: u16,
) -> Result<(), Box<dyn std::error::Error>> {
    ctx.write_single_register(register, value).await?;
    println!("Wrote {} to register {}", value, register);
    Ok(())
}
pub async fn read_from_plc(
    ctx: &mut Context,
    start_register: u16,
    end_register: u16,
) -> Result<u16, Box<dyn std::error::Error>> {
    let data = ctx
        .read_holding_registers(start_register, end_register)
        .await?;
    let result = data[0];

    Ok(result)
}
