use std::net::TcpListener;
use std::io::{Read, Write};

fn main() {
    let listener = TcpListener::bind("0.0.0.0:8080").expect("Failed to bind port 8080");

    println!("Server running on http://0.0.0.0:8080");

    for stream in listener.incoming() {
        let mut stream = stream.expect("Failed to read stream");
        let mut buffer = [0; 1024];

        stream.read(&mut buffer).expect("Failed to read request");

        let response = "HTTP/1.1 200 OK\r\nContent-Length: 12\r\n\r\nHello world!";
        stream.write_all(response.as_bytes()).expect("Failed to write response");
    }
}

