import { Logger } from '@nestjs/common';
import {
	SubscribeMessage,
	WebSocketGateway,
	OnGatewayInit,
	OnGatewayConnection,
	OnGatewayDisconnect,
	MessageBody,
	ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true }) // Optional: set port or namespace
export class MasterGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	private server: Server;

	afterInit(server: Server) {
		this.server = server;
		Logger.log('WebSocket server initialized');
	}

	handleConnection(client: Socket) {
		console.log(`Client connected: ${client.id}`);

		this.server.emit("test", { AddSensor: { "id": "idddd", "label": "PT100", "start_register": 512, "end_register": 1 } });
	}

	handleDisconnect(client: Socket) {
		console.log(`Client disconnected: ${client.id}`);
	}

	@SubscribeMessage('messageToServer')
	handleMessage(
		@MessageBody() data: string,
		@ConnectedSocket() client: Socket,
	): void {
		console.log(`Received message: ${data}`);
		this.server.emit('messageToClient', data); // broadcast to everyone
	}
}

