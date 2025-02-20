FROM rust:1.73 AS builder

WORKDIR /app
COPY . .

# Build for ARM (adjust target as needed)
RUN rustup target add armv7-unknown-linux-gnueabihf && \
    cargo build --release --target=armv7-unknown-linux-gnueabihf

FROM debian:bookworm
WORKDIR /app
COPY --from=builder /app/target/armv7-unknown-linux-gnueabihf/release/your-binary /app/
CMD ["/app/your-binary"]

