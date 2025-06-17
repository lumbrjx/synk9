use serde::{Deserialize, Serialize};
use tokio_modbus::client::{Context, Reader};
use tokio_modbus::prelude::Writer;

#[derive(Serialize, Deserialize, Debug)]
pub struct WriteData {
    pub register: u16,
    pub value: u16,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ModbusData {
    pub sensor_id: String,
    pub register: String,
    pub time: String,
    pub value: u16,
    pub key: String,
    pub s_type: String,
    pub r_type: String,
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
    r_type: String,
) -> Result<(), Box<dyn std::error::Error>> {
    if r_type == "REG" {
        ctx.write_single_register(register, value).await?;
        println!("Wrote {} to register {}", value, register);
        Ok(())
    } else {
        let mut bl = true;
        if value == 0 {
            bl = false;
        };
        ctx.write_single_coil(register, bl).await?;
        println!("Wrote {} to register {}", value, register);
        Ok(())
    }
}
pub async fn read_from_plc(
    ctx: &mut Context,
    start_register: u16,
    end_register: u16,
    readType: String,
) -> Result<u16, Box<dyn std::error::Error>> {
    if readType == "REG" {
        let data = ctx
            .read_holding_registers(start_register, end_register)
            .await?;
        println!("{:?}", data);
        let result = data[0];

        Ok(result)
    } else {
        let data = ctx.read_coils(start_register, end_register).await?;
        println!("{:?}", data);
        let result = data[0];
        if result == true {
            return Ok(1);
        }
        Ok(0)
    }
}
