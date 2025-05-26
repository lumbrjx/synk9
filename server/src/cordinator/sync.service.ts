import { Injectable } from '@nestjs/common';
import { AgentService } from 'src/agent/agent.service';
import { EventBusService } from 'src/event-bus/event-bus.service';
import { isEqual } from "lodash"
import { Agent, AlertTopic, Sensor } from 'src/entities';

@Injectable()
export class SyncService {
	constructor(
		private readonly eventBus: EventBusService,
		private readonly agentService: AgentService,
	) { }

	async syncAgentWithServerData(data: any, fingerprint: string) {
		const agent = await this.agentService.findByFingerprint(fingerprint, ["sensors", "alerts", "alerts.rules"]);
		const sensors = agent?.sensors.map(sensor => (
			{
				id: sensor.id,
				label: sensor.name,
				start_register: sensor.start_register,
				end_register: sensor.end_register,
				agentFingerprint: agent.fingerprint,
				s_type: "sensor"
			})
		)
		const isSynced = isEqual(data, sensors);
		console.log(isSynced)
		if (isSynced) return;
		this.eventBus.emit("agent:cleanup", { id: agent?.id as string });
		agent?.sensors.map(sensor => (
			this.eventBus.emit("sensor:created",
				{
					id: sensor.id,
					label: sensor.name,
					start_register: sensor.start_register,
					end_register: sensor.end_register,
					agentFingerprint: agent.fingerprint,
					s_type: "sensor"
				})
		))
		agent?.alerts.map(sensor => (
			sensor.rules.map(rule => (
				this.eventBus.emit("sensor:created",
					{
						id: sensor.id,
						label: sensor.name,
						start_register: 512,
						end_register: 1,
						agentFingerprint: agent.fingerprint,
						s_type: "general"
					})
			))
		))
	}
}

