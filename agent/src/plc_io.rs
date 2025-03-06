use tokio_modbus::client::Context;
use tokio_modbus::prelude::Writer;

pub trait PlcApi {
    fn init(&mut self) -> Result<(), String>;
    fn start_plc(&mut self) -> Result<(), String>;
    fn stop_plc(&mut self) -> Result<(), String>;
    fn restart_plc(&mut self) -> Result<(), String>;
    fn write_to_plc(&mut self) -> Result<(), String>;
    fn read_from_plc(&mut self) -> Result<(), String>;
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
