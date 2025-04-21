import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';

import { Process } from 'src/entities';
import { EventBusService } from 'src/event-bus/event-bus.service';

@Injectable()
@Processor('global-process')
export class GlobalProcessConsumer extends WorkerHost {
	private readonly logger = new Logger(GlobalProcessConsumer.name);

	constructor(
		@InjectRepository(Process)
		private readonly processRepository: Repository<Process>,
		private readonly eventBus: EventBusService,
	) {
		super();
	}

	async process(job: Job<{ id: string; agentId?: string }>): Promise<void> {
		const { id, agentId } = job.data;
		this.logger.log(`🚀 Starting process with ID: ${id} for agent: ${agentId}`);

		const process = await this.processRepository.findOne({
			where: { id },
			relations: ['steps', 'steps.rules', 'steps.rules.sensor', 'agent'],
		});

		if (!process || !process.steps?.length) {
			this.logger.error(`❌ Invalid or empty process for id: ${id}`);
			throw new Error(`Invalid or empty process for id ${id}`);
		}

		this.logger.log(`📦 Loaded process ${id} with ${process.steps.length} steps`);

		let currentStepIndex = 0;
		let matchedRules = new Set<string>();
		let resolveKill: () => void;
		const killPromise = new Promise<void>((resolve) => {
			resolveKill = resolve;
		});
		const sensorSubscription = this.eventBus.on('sensor:process-state-updated').subscribe((data) => {
			if (data.agentId !== agentId) return;

			this.logger.debug(`📡 Received sensor update: ${data.label} = ${data.value}`);

			const currentStep = process.steps[currentStepIndex];
			if (!currentStep) {
				this.logger.warn(`⚠️ No step found at index ${currentStepIndex} for process ${id}`);
				return;
			}


			this.eventBus.emit('step:running', {
				id,
				agentId,
				steps: process.steps.map((step, index) => ({
					stepId: step.id,
					status:
						index < currentStepIndex
							? 'success'
							: index === currentStepIndex
								? 'running'
								: 'pending',
				})),
			});

			this.logger.log(`🔄 Step ${currentStepIndex + 1} running (ID: ${currentStep.id})`);

			let matchedRule: any = undefined;
			for (const r of currentStep.rules) {
				if (r.sensor.name === data.label && Number(r.expectedValue) === Number(data.value)) {
					matchedRule = r;
					break;
				}
			}

			if (matchedRule) {
				this.logger.log(`✅ Rule matched for sensor "${data.label}"`);
				matchedRules.add(data.label);

				const allMatched = currentStep.rules.every(r => matchedRules.has(r.sensor.name));
				if (allMatched) {
					this.logger.log(`✅✅ Step ${currentStepIndex + 1} passed (ID: ${currentStep.id})`);
					this.eventBus.emit('step:valid', { id, stepId: currentStep.id, agentId });

					currentStepIndex++;
					matchedRules = new Set();

					if (currentStepIndex >= process.steps.length) {
						this.logger.log(`🎉 All steps completed for process ${id}. Restarting cycle...`);
						this.eventBus.emit('process:cycle-done', { id, agentId });
						currentStepIndex = 0;
					}
				}
			} else {
				this.logger.debug(`❌ Rule not matched for "${data.label}" = ${data.value}`);
			}
		});

		const killSubscription = this.eventBus.on('process:kill').subscribe(async (data) => {
			if (data.id !== id) return;

			this.logger.warn(`🛑 Process ${id} was killed. Cleaning up...`);

			// Clean up
			sensorSubscription.unsubscribe();
			killSubscription.unsubscribe();

			// Mark the job as completed 
			resolveKill(); // To unblock process()
			return;
		});

		this.logger.log(`🧭 Process ${id} is now actively monitoring events.`);

		await killPromise;
	}
}

