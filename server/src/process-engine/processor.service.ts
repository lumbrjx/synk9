// import { Processor, WorkerHost } from '@nestjs/bullmq';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Job } from 'bullmq';
// import { Injectable, Logger } from '@nestjs/common';
//
// import { Process } from 'src/entities';
// import { EventBusService } from 'src/event-bus/event-bus.service';
//
// @Injectable()
// @Processor('global-process')
// export class GlobalProcessConsumer extends WorkerHost {
// 	private readonly logger = new Logger(GlobalProcessConsumer.name);
//
// 	constructor(
// 		@InjectRepository(Process)
// 		private readonly processRepository: Repository<Process>,
// 		private readonly eventBus: EventBusService,
// 	) {
// 		super();
// 	}
//
// 	async process(job: Job<{ id: string; agentId?: string }>): Promise<void> {
// 		const { id, agentId } = job.data;
// 		this.logger.log(`🚀 Starting process with ID: ${id} for agent: ${agentId}`);
//
// 		const process = await this.processRepository.findOne({
// 			where: { id },
// 			relations: ['steps', 'steps.rules', 'steps.rules.sensor', 'agent'],
// 		});
//
// 		if (!process || !process.flow) {
// 			this.logger.error(`❌ Invalid or empty process for id: ${id}`);
// 			throw new Error(`Invalid or empty process for id ${id}`);
// 		}
//
// 		this.logger.log(`📦 Loaded process ${id} with ${process.steps.length} steps`);
//
// 		let currentStepIndex = 0;
// 		let matchedRules = new Set<string>();
// 		let resolveKill: () => void;
// 		const sensorsList: string[] = [];
// 		const processFlow = process.flow
// 		if (!processFlow.nodes.length) {
// 			throw new Error("Needs process flow edges");
// 		}
// 		const flowNodes = processFlow.nodes;
// 		for (const edge of flowNodes) {
// 			const sensors = edge.data.sensor as any;
// 			if (sensors.length) {
// 				for (const sensor of sensors) {
// 					sensorsList.push(sensor.sensor_id);
// 				}
// 			}
// 		}
// 		const killPromise = new Promise<void>((resolve) => {
// 			resolveKill = resolve;
// 		});
// 		const sensorSubscription = this.eventBus.on('sensor:process-state-updated').subscribe((data) => {
// 			if (data.agentId !== agentId) return;
//
// 			console.log(" from sensor", data.sensor_id);
// 			this.logger.debug(`📡 Received sensor update: ${data.label} = ${data.value}`);
//
// 			for (const edge of flowNodes) {
// 				const sensors = edge.data.sensor || [];
//
// 				const specialSensor = edge.data.propSensors || {};
// 				if (sensors.length) {
// 					for (const sensor of sensors) {
// 						if (sensor.sensor_id === data.sensor_id) {
// 							sensor.sensorValue = data.value;
// 							sensor.name = data.label;
// 						}
// 					}
// 				}
//
// 				if (specialSensor && Object.keys(specialSensor).length > 0) {
// 					for (const [key, sensor_id] of Object.entries(specialSensor)) {
// 						if (sensor_id === data.sensor_id) {
// 							specialSensor[key] = {
// 								sensor_id,
// 								sensorValue: data.value,
// 								name: data.label,
// 							};
// 						}
// 					}
// 				}
//
// 			}
//
// 			this.eventBus.emit('step:running', {
// 				id,
// 				agentId,
// 				data: { processId: process.id, nodes: flowNodes, edges: processFlow.edges }
// 			});
//
// 		});
//
// 		const killSubscription = this.eventBus.on('process:kill').subscribe(async (data) => {
// 			if (data.id !== id) return;
//
// 			this.logger.warn(`🛑 Process ${id} was killed. Cleaning up...`);
//
// 			// Clean up
// 			sensorSubscription.unsubscribe();
// 			killSubscription.unsubscribe();
//
// 			// Mark the job as completed 
// 			resolveKill(); // To unblock process()
// 			return;
// 		});
//
// 		this.logger.log(`🧭 Process ${id} is now actively monitoring events.`);
//
// 		await killPromise;
// 	}
// }
//

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Process } from 'src/entities';
import { EventBusService } from 'src/event-bus/event-bus.service';
import { Job } from 'bullmq';

@Injectable()
export class GlobalProcessService {
	private readonly logger = new Logger(GlobalProcessService.name);

	constructor(
		@InjectRepository(Process)
		private readonly processRepository: Repository<Process>,
		private readonly eventBus: EventBusService,
	) { }

	async handle(job: Job<{ id: string; agentId?: string }>): Promise<void> {
		const { id, agentId } = job.data;
		this.logger.log(`🚀 Starting process with ID: ${id} for agent: ${agentId}`);

		const process = await this.processRepository.findOne({
			where: { id },
			relations: ['steps', 'steps.rules', 'steps.rules.sensor', 'agent'],
		});

		if (!process || !process.flow) {
			this.logger.error(`❌ Invalid or empty process for id: ${id}`);
			throw new Error(`Invalid or empty process for id ${id}`);
		}

		const flowNodes = process.flow.nodes;
		const sensorsList: string[] = [];

		for (const edge of flowNodes) {
			const sensors = edge.data.sensor || [];
			for (const sensor of sensors) {
				sensorsList.push(sensor.sensor_id);
			}
		}

		let resolveKill: () => void;
		const killPromise = new Promise<void>((resolve) => {
			resolveKill = resolve;
		});

		const sensorSubscription = this.eventBus.on('sensor:process-state-updated').subscribe((data) => {
			if (data.agentId !== agentId) return;

			for (const edge of flowNodes) {
				const sensors = edge.data.sensor || [];
				const specialSensor = edge.data.propSensors || {};
				for (const sensor of sensors) {
					if (sensor.sensor_id === data.sensor_id) {
						sensor.sensorValue = data.value;
						sensor.name = data.label;

						if (specialSensor.counter_sensor !== undefined) {
							specialSensor.counter_sensor= {
								sensor_id: sensor.sensor_id,
								sensorValue: data.value,
								name: data.label,
							};
						}
						if (specialSensor.tank_level_sensor !== undefined) {
							specialSensor.tank_level_sensor = {
								sensor_id: sensor.sensor_id,
								sensorValue: data.value,
								name: data.label,
							};

						}
					}

				}
			}


			this.eventBus.emit('step:running', {
				id,
				agentId,
				data: { processId: process.id, nodes: flowNodes, edges: process.flow.edges },
			});
		});

		const killSubscription = this.eventBus.on('process:kill').subscribe((data) => {
			if (data.id !== id) return;
			this.logger.warn(`🛑 Process ${id} was killed. Cleaning up...`);
			sensorSubscription.unsubscribe();
			killSubscription.unsubscribe();
			resolveKill();
		});

		this.logger.log(`🧭 Process ${id} is now actively monitoring events.`);
		await killPromise;
	}
}
