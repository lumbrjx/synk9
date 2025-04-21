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
import { AgentService } from 'src/agent/agent.service';
import { ConnectionStore } from 'src/connection-store/connection-store.service';
import { Process, ProcessState } from 'src/entities';
import { AgentEventType } from 'src/event-bus/agent-events';
import { AppEvents } from 'src/event-bus/event-bus.interface';
import { EventBusService } from 'src/event-bus/event-bus.service';
import { ProcessService } from 'src/process/process.service';
import { SyncService } from './sync.service';

@WebSocketGateway({ cors: true })
export class CordinatorGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	private server: Server;
	private logger = new Logger(CordinatorGateway.name);

	constructor(
		private eventBus: EventBusService,
		private connectionStore: ConnectionStore,
		private processService: ProcessService,
		private agentService: AgentService,
		private syncService: SyncService
	) { }

	afterInit(server: Server) {
		this.server = server;
		this.logger.log('WebSocket server initialized');

		this.eventBus.on("sensor:created").subscribe(this.sensorCreated.bind(this));
		this.eventBus.on("step:running").subscribe(this.stepRunning.bind(this));
		this.eventBus.on("step:valid").subscribe(this.stepValid.bind(this));
		this.eventBus.on("process:cycle-done").subscribe(this.cycleDone.bind(this));
		this.eventBus.on("sensor:updated").subscribe(this.sensorUpdated.bind(this));
		this.eventBus.on("sensor:deleted").subscribe(this.sensorDeleted.bind(this));

	}

	serverEmit<K extends AgentEventType>(event: K, payload: any) {
		this.server.emit("data", { [event]: payload });
	}
	async notifyAgents<K extends AgentEventType>(event: K, payload: any) {
		const agentsIds = this.connectionStore.getAllIds().filter(sock => sock.startsWith("sock-agent-"));
		for (const id of agentsIds) {
			const connection = await this.connectionStore.get(id);
			const d = connection?.socket.emit("data", { [event]: payload });
			console.log(d);
		}
	}

	async notifyClients<K extends AppEvents>(event: keyof K, payload: any, channel: "data" | "step-data") {
		const agentsIds = this.connectionStore.getAllIds().filter(sock => sock.startsWith("sock-client-"));
		for (const id of agentsIds) {
			console.log(id)
			const connection = await this.connectionStore.get(id);
			const l = connection?.socket.emit(channel, { [event]: payload });
			console.log(l)
		}
	}
	async sensorUpdated(payload: any) {
		this.logger.log('Sensor updated:', payload);
		await this.notifyAgents("EditSensor", payload);
	}
	async stepValid(payload: any) {
		this.logger.log('Step Valid:', payload);
		await this.notifyClients("step:valid", payload, 'step-data');
	}
	async cycleDone(payload: any) {
		this.logger.log('process Cycle Done:', payload);
		await this.notifyClients("process:cycle-done", payload, 'step-data');
	}
	async stepRunning(payload: any) {
		this.logger.log('Step Running:', payload);
		await this.notifyClients("step:running", payload, 'step-data');
	}
	async sensorDeleted(payload: any) {
		this.logger.log('Sensor deleted:', payload);
		await this.notifyAgents("RemoveSensor", payload);
	}

	sensorCreated(payload: any) {
		this.logger.log('Sensor created:', payload);
		this.serverEmit("AddSensor", payload);
	}

	async handleConnection(client: Socket) {
		this.logger.log(`Client connected: ${client.id}`);
		const authType = client.handshake.auth.type;
		if (authType === "client") {
			console.log("cks", client.handshake.auth.token)
			const id = `sock-client-${client.id}`
			await this.connectionStore.set(id, client, { userId: client.handshake.auth.token })
			return;
		}
		else if (authType === "agent") {
			console.log("otk", client.handshake.auth.token)
			const id = `sock-agent-${client.id}`
			await this.connectionStore.set(id, client, { userId: client.handshake.auth.token})
			client.emit("data", "HealthCheck");
			return;
		} else {
			console.log("auths", client.handshake.auth.token)
			console.log("discon from", client.id)
			client.disconnect(true)
			return;
		}
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`Client disconnected: ${client.id}`);
	}
	@SubscribeMessage('command')
	async handleCommand(
		@MessageBody() data: string,
	): Promise<void> {
		this.logger.log(`Received message: ${JSON.stringify(data)}`);
		const parsedData = JSON.parse(data)
		const process = await this.processService.findOne(parsedData.id, ['steps', 'agent']) as Process
		if (!process.steps || !process.steps.length) {
			const socket = await this.connectionStore.get("your-jwt-token-here");
			socket?.socket.emit("data", "Add process Steps first");
			return;
		};
		if (parsedData.command === "PAUSE-PROCESS") {
			// send destroy job signal
			this.eventBus.emit("process:kill", { id: process.id })
			this.processService.updateState(process.id, ProcessState.stopped);
			return;
		}
		if (parsedData.command === "START-PROCESS") {
			this.eventBus.emit("process:created", { id: process?.id, agentId: process?.agent.id })
			this.processService.updateState(process.id, ProcessState.running);
			return;
		}
	}

	@SubscribeMessage('monitoring_streamline')
	async handleMessage(
		@MessageBody() data: { key: string; value: any },
		@ConnectedSocket() client: Socket,
	): Promise<void> {
		this.logger.log(`Received message: ${JSON.stringify(data)}`);

		const clientIds = this.connectionStore.getAllIds().filter(sock => sock.startsWith("sock-client-"));
		for (const id of clientIds) {
			const connection = await this.connectionStore.get(id);
			connection?.socket.emit("data", data);
		}

		const agentId = this.connectionStore.getAllIds()
			.filter(sock => sock.startsWith("sock-agent-"))
			.find(d => d === "sock-agent-" + client.id);

		if (!agentId) return;
		const agentFingerprint = await this.connectionStore.get(agentId);
		if (!agentFingerprint) return;
		const agentDbId = await this.agentService.findByFingerprint(agentFingerprint.metadata.userId);
		if (!agentDbId) return;

		this.eventBus.emit("sensor:process-state-updated", {
			label: data.key,
			value: data.value,
			agentId: agentDbId.id,
		});
	}
	@SubscribeMessage('health_check')
	async handleHealthCheckMessage(
		@MessageBody() data: any,
		@ConnectedSocket() client: Socket,
	): Promise<void> {
		this.logger.log(`Received health message: ${JSON.stringify(data)}`);

		const agentId = await this.connectionStore.get("sock-agent-" + client.id)
		if(!agentId) return;
		
		this.syncService.syncAgentWithServerData(data, agentId?.metadata.userId as string);

	}
}
