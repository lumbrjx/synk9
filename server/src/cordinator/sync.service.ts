import { Injectable, OnModuleInit } from '@nestjs/common';
import { AgentService } from 'src/agent/agent.service';
import { EventBusService } from 'src/event-bus/event-bus.service';

@Injectable()
export class SyncService {
	constructor(
		private readonly eventBus: EventBusService,
		private readonly agentService: AgentService,
	) { }

	async syncAgentWithServerData(data: any, fingerprint: string) {

		const agent = this.agentService.findByFingerprint(fingerprint);


	}
}

