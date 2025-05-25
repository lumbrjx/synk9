import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EventBusService } from 'src/event-bus/event-bus.service';
import { StreamManager } from './stream.service';
import { map, of, pipe, Subject } from 'rxjs';

@Injectable()
export class ProcessEngineService implements OnModuleInit {
	constructor(
		@InjectQueue('global-process') private readonly processQueue: Queue<{ id: string, agentId?: string }>,
		private readonly eventBus: EventBusService,
		private readonly streamManager: StreamManager,
	) { }

	async onModuleInit() {
		await this.processQueue.drain();
		await this.processQueue.clean(0, 1000, 'wait');
		await this.processQueue.clean(0, 1000, 'active');
		await this.processQueue.clean(0, 1000, 'delayed');
		await this.processQueue.clean(0, 1000, 'delayed');

		// Ensure the event bus is initialized before subscribing
		this.eventBus.on("process:created").subscribe(this.enqueueJob.bind(this));
		console.log("Subscribed to process:created");
	}

	async enqueueJob(data: any) {

		const subject = new Subject<any>();

		// const d = await this.processQueue.add('new-process', { id: data.id, agentId: data.agentId });
		const stream = await this.streamManager.createStream(`stream-${data.id}`, subject.asObservable(), // only expose the observable part
			data.id, data.agentId)
		const sensorSubscription = this.eventBus.on('sensor:process-state-updated').subscribe((data) => {
			subject.next(data);
		});
		return stream;
		// console.log("created process job", d.id, await d.getState());
	}
}

