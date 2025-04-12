use std::error::Error as StdError;
use thiserror::Error;

use crate::ChEvent;



#[derive(Debug, Error)]
pub enum AppError {
    #[error("Validation failed: {0}")]
    ValidationError(String),
    
    #[error("Deserialization failed: {0}")]
    DeserializationError(String),
    
    #[error("PLC communication error: {0}")]
    PlcError(String),
    
    #[error("Socket.IO error: {0}")]
    SocketIoError(String),
    
    #[error("Internal error: {0}")]
    InternalError(String),
}

impl From<Box<dyn StdError>> for AppError {
    fn from(error: Box<dyn StdError>) -> Self {
        AppError::InternalError(error.to_string())
    }
}


pub fn parse_message_to_event(data: &str) -> Result<ChEvent, AppError> {
    serde_json::from_str(data)
        .map_err(|e| AppError::DeserializationError(format!("Failed to parse event: {}", e)))
}


