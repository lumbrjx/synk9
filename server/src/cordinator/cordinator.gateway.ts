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
import { AgentEventType } from 'src/event-bus/agent-events';
import { EventBusService } from 'src/event-bus/event-bus.service';

@WebSocketGateway({ cors: true })
export class CordinatorGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	private server: Server;
	private logger = new Logger(CordinatorGateway.name);

	constructor(private eventBus: EventBusService) { }

	afterInit(server: Server) {
		this.server = server;
		this.logger.log('WebSocket server initialized');

		this.eventBus.on("sensor:created").subscribe(this.sensorCreated.bind(this));
		this.eventBus.on("sensor:updated").subscribe(this.sensorUpdated.bind(this));
		this.eventBus.on("sensor:deleted").subscribe(this.sensorDeleted.bind(this));

	}

	emit<K extends AgentEventType>(event: K, payload: any) {
		this.server.emit("data", { [event]: payload });
	}

	sensorUpdated(payload: any) {
		this.logger.log('Sensor updated:', payload);
		this.emit("EditSensor", payload);
	}

	sensorDeleted(payload: any) {
		this.logger.log('Sensor deleted:', payload);
		this.emit("RemoveSensor", payload);
	}

	sensorCreated(payload: any) {
		this.logger.log('Sensor created:', payload);
		this.emit("AddSensor", payload);
	}

	handleConnection(client: Socket) {
		this.logger.log(`Client connected: ${client.id}`);
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`Client disconnected: ${client.id}`);
	}

	@SubscribeMessage('monitoring_streamline')
	handleMessage(
		@MessageBody() data: string,
		@ConnectedSocket() client: Socket,
	): void {
		this.logger.log(`Received message: ${JSON.stringify(data)}`);
	}
}
