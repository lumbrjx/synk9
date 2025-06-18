import { Injectable } from '@nestjs/common';
import { AgentService } from 'src/agent/agent.service';
import { EventBusService } from 'src/event-bus/event-bus.service';
import { isEqual } from "lodash"
import { ParsersService } from 'src/parsers/parser-builder.service';

@Injectable()
export class SyncService {
	constructor(
		private readonly eventBus: EventBusService,
		private readonly agentService: AgentService,
		private readonly parserService: ParsersService
	) { }

	async syncAgentWithServerData(data: any, fingerprint: string) {
		const agent = await this.agentService.findByFingerprint(fingerprint, ["sensors", "alerts", "alerts.rules"]);
		const parser = this.parserService.getParser(agent?.plcId as string);
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
					register: sensor.register,
					agentFingerprint: agent.fingerprint,
					s_type: "sensor",
					r_type: parser?.addressToModbus(sensor.register).type?.toUpperCase() as string 
				})
		))
		agent?.alerts.map(sensor => (
			sensor.rules.map(rule => (
				this.eventBus.emit("sensor:created",
					{
						id: sensor.id,
						label: sensor.name,
						start_register: parser?.addressToModbus(rule.memoryAddress).modbusAddress as number,
						register: rule.memoryAddress,
						end_register: 1,
						agentFingerprint: agent.fingerprint,
						s_type: "general",
						r_type: parser?.addressToModbus(rule.memoryAddress).type as string,
					})
			))
		))
	}
}

