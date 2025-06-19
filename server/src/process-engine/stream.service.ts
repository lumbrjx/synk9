import { Global, Injectable, Logger } from '@nestjs/common';
import { Subject, interval, fromEvent, merge } from 'rxjs';
import { map, takeUntil, tap } from 'rxjs';
import { GlobalProcessService } from './processor.service';
import { InjectRepository } from '@nestjs/typeorm';
import { AgentState, Process } from 'src/entities';
import { Repository } from 'typeorm';
import { EventBusService } from 'src/event-bus/event-bus.service';
import { PredictorService } from 'src/predictor/predictor.service';
import { AgentService } from 'src/agent/agent.service';

@Global()
@Injectable()
export class StreamManager {
	private streams: Map<any, any>;
	private streamCounter: number;
	private readonly logger = new Logger(GlobalProcessService.name);
	private agentId: string;
	constructor(
		@InjectRepository(Process)
		private readonly processRepository: Repository<Process>,
		private readonly eventBus: EventBusService,
		private readonly predictorService: PredictorService,
		private readonly agentService: AgentService,

	) {
		this.streams = new Map();
		this.streamCounter = 0;
	}

	// Create a new stream
	async createStream(name: string, streamSource, id, agentId) {
		const streamId = id;
		const killSwitch = new Subject();

		const stream = streamSource.pipe(
			takeUntil(killSwitch),
			tap(data => {
				console.log("immmm dataaaaa", data)
			})
		);
		this.logger.log(`🚀 Starting process with ID: ${id} for agent: ${agentId}`);

		const process = await this.processRepository.findOne({
			where: { id },
			relations: ['agent', 'agent.processes', "agent.alerts", "agent.alerts.rules"],
		});
		this.agentService.changeAgentState(process?.agent.id as string, AgentState.busy);
		this.agentId = process?.agent.id as string;
		if (!process || !process.flow) {
			this.logger.error(`❌ Invalid or empty process for id: ${id}`);
			return;
		}

		const alerts = process.agent.alerts;
		const flowNodes = process.flow.nodes;
		const sensorsList: string[] = [];

		for (const edge of flowNodes) {
			const sensors = edge.data.sensor || [];
			for (const sensor of sensors) {
				sensorsList.push(sensor.sensor_id);
			}
		}
		// Subscribe to the stream
		const subscription = stream.subscribe({
			next: (data) => {
				// Send to socket or process data
				this.handleData(streamId, name, agentId, flowNodes, data, id, process, alerts);
			},
			error: (error) => {
				console.log(`Stream ${streamId} error:`, error);
				this.streams.delete(streamId);
			},
			complete: () => {
				console.log(`Stream ${streamId} completed`);
				this.streams.delete(streamId);
			}
		});

		// Store stream info
		this.streams.set(streamId, {
			id: streamId,
			name,
			killSwitch,
			subscription,
			status: 'active',
			buffer: []
		});

		console.log(`Created stream ${streamId}: ${name}`);
		return { stream, streamId };
	}

	// Delete a specific stream
	deleteStream(streamId) {
		const stream = this.streams.get(streamId);
		if (stream) {
			stream.killSwitch.next(); // Kill the stream
			stream.killSwitch.complete();
			stream.subscription.unsubscribe();
			this.streams.delete(streamId);
			console.log(`Deleted stream ${streamId}: ${stream.name}`);
			this.agentService.changeAgentState(this.agentId as string, AgentState.ready);
			return true;
		}
		return false;
	}

	// Delete all streams
	deleteAllStreams() {
		let deletedCount = 0;
		for (const [streamId, stream] of this.streams) {
			stream.killSwitch.next();
			stream.killSwitch.complete();
			stream.subscription.unsubscribe();
			deletedCount++;
		}
		this.streams.clear();
		console.log(`Deleted ${deletedCount} streams`);
		return deletedCount;
	}

	// List active streams
	listStreams() {
		return Array.from(this.streams.values()).map(stream => ({
			id: stream.id,
			name: stream.name,
			status: stream.status
		}));
	}

	// Handle data from streams (customize this)
	async handleData(streamId, streamName, agentId, flowNodes, data, id, process, alerts) {
		// This is where you'd send to socket
		if (data.agentId !== agentId) return;
		const stream = this.streams.get(streamId);
		if (!stream) return;
		const value = parseFloat(data.value);
		if (isNaN(value)) return;

		stream.buffer.push(value);
		console.log("buff", stream.buffer)
		if (stream.buffer.length === 9) {
			console.log("heey")
			const batch = stream.buffer.splice(0, 9);
			const predict = await this.predictorService.predict(batch);

			if (predict && predict.predicted === 'Fail') {
				this.eventBus.emit('alert:ai', {
					id,
					agentId,
					data: {
						processName: process.name,
						percentage: predict.percentage,
						sensor: data.label,
						value: data.value,
					},
				});
			}
		}
		for (const edge of flowNodes) {
			const sensors = edge.data.sensor || [];
			const specialSensor = edge.data.propSensors || {};
			for (const sensor of sensors) {
				if (sensor.sensor_id === data.sensor_id) {
					sensor.sensorValue = data.value;
					sensor.name = data.label;
					sensor.register = data.register

					if (specialSensor.counter_sensor !== undefined) {
						specialSensor.counter_sensor = {
							sensor_id: sensor.sensor_id,
							sensorValue: data.value,
							name: data.label,
						};
					}
					if (specialSensor.valve_sensor !== undefined) {
						specialSensor.valve_sensor = {
							sensor_id: sensor.sensor_id,
							sensorValue: data.value,
							name: data.label,
						};
					};
					if (specialSensor.conveyor_sensor !== undefined) {
						specialSensor.conveyor_sensor = {
							sensor_id: sensor.sensor_id,
							sensorValue: data.value,
							name: data.label,
						};
					};
					if (specialSensor.rack_sensor !== undefined) {
						specialSensor.rack_sensor = {
							sensor_id: sensor.sensor_id,
							sensorValue: data.value,
							name: data.label,
						};
					};
					if (specialSensor.tank_level_sensor !== undefined) {
						specialSensor.tank_level_sensor = {
							sensor_id: sensor.sensor_id,
							sensorValue: data.value,
							name: data.label,
						};

					}
				}

			}

			for (const alert of alerts) {
				for (const rule of alert.rules) {
					if (rule.id === data.sensor_id) {
						if (rule.condition === "gt" && parseInt(rule.expectedValue) < parseInt(data.value)) {
							this.eventBus.emit('alert:alert', {
								id,
								agentId,
								data: { processId: process.id, nodes: flowNodes, alert: alert },
							});
						}
						if (rule.condition === "lt" && parseInt(rule.expectedValue) > parseInt(data.value)) {
							this.eventBus.emit('alert:alert', {
								id,
								agentId,
								data: { processId: process.id, nodes: flowNodes, alert: alert },
							});
						}
						if (rule.condition === "gtq" && parseInt(rule.expectedValue) <= parseInt(data.value)) {
							this.eventBus.emit('alert:alert', {
								id,
								agentId,
								data: { processId: process.id, nodes: flowNodes, alert: alert },
							});
						}
						if (rule.condition === "ltq" && parseInt(rule.expectedValue) >= parseInt(data.value)) {
							this.eventBus.emit('alert:alert', {
								id,
								agentId,
								data: { processId: process.id, nodes: flowNodes, alert: alert },
							});
						}
						if (rule.condition === "neq" && parseInt(rule.expectedValue) !== parseInt(data.value)) {
							this.eventBus.emit('alert:alert', {
								id,
								agentId,
								data: { processId: process.id, nodes: flowNodes, alert: alert },
							});

						}
						if (rule.condition === "eq" && parseInt(rule.expectedValue) === parseInt(data.value)) {
							this.eventBus.emit('alert:alert', {
								id,
								agentId,
								data: { processId: process.id, nodes: flowNodes, alert: alert },
							});

						}
					}
				}

			}

			this.eventBus.emit('step:running', {
				id,
				agentId,
				data: { processId: process.id, nodes: flowNodes, edges: process.flow.edges },
			});

			// Example: send to socket
			// socket.send(JSON.stringify({ streamId, streamName, data }));
		}
	}
}
