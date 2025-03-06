use anyhow::Result;
use tokio_modbus::client::{tcp, Context};
use tokio::net::lookup_host;
use tokio_modbus::prelude::{*};

pub async fn create_mdb_client(hostname: &str) -> Result<Context> {
    let mut addrs = lookup_host(hostname).await?;
    let addr = addrs.next().ok_or_else(|| anyhow::anyhow!("DNS resolution failed"))?;

    let ctx = tcp::connect_slave(addr, Slave(1)).await?;
    Ok(ctx)
}

