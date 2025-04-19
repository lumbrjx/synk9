import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EventBusService } from 'src/event-bus/event-bus.service';

@Injectable()
export class ProcessEngineService implements OnModuleInit {
  constructor(
    @InjectQueue('global-process') private readonly processQueue: Queue<{ id: string, agentId?: string }>,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    // Ensure the event bus is initialized before subscribing
    this.eventBus.on("process:created").subscribe(this.enqueueJob.bind(this));
    console.log("Subscribed to process:created");
  }

  async enqueueJob(data: any) {
    console.log("creating process job", data);
    const d = await this.processQueue.add('new-process', { id: data.id, agentId: data.agentId });
    console.log("created process job", d.id, await d.getState());
  }
}

