import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'
import { Socket } from 'socket.io'
import { REDIS_CLIENT } from 'src/connection/constants'

interface ConnectionMetadata {
	userId: string
}

interface ConnectionData {
	socket: Socket
	metadata: ConnectionMetadata
}

@Injectable()
export class ConnectionStore {
	private connections: Map<string, ConnectionData>

	constructor(
		@Inject(REDIS_CLIENT) private readonly redisClient: Redis
	) {
		this.connections = new Map<string, ConnectionData>();
	}

	public async set(socketId: string, socket: Socket, metadata: ConnectionMetadata): Promise<void> {
		await this.redisClient.set(socketId, socketId);
		this.connections.set(socketId, { socket, metadata });
	}

	public async get(id: string): Promise<ConnectionData | undefined> {
		const socketId = await this.redisClient.get(id);
		if (!socketId) {
			return undefined;
		}
		return this.connections.get(socketId);
	}

	public delete(socketId: string): boolean {
		return this.connections.delete(socketId)
	}

	public getAll(): Map<string, ConnectionData> {
		return this.connections
	}

	public getAllIds(): string[] {
		return Array.from(this.connections.keys())
	}

	public size(): number {
		return this.connections.size
	}

	public clear(): void {
		this.connections.clear()
	}

	public has(socketId: string): boolean {
		return this.connections.has(socketId)
	}
}

export type { ConnectionMetadata, ConnectionData }
