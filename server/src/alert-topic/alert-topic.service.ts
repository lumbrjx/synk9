import { Injectable } from '@nestjs/common';
import { CreateAlertTopicDto } from './dto/create-alert-topic.dto';
import { UpdateAlertTopicDto } from './dto/update-alert-topic.dto';
import { DataSource, Repository } from 'typeorm';
import { AlertTopic, AlertType, Rule } from 'src/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { EventBusService } from 'src/event-bus/event-bus.service';
import { AgentService } from 'src/agent/agent.service';
import { ParsersService } from 'src/parsers/parsers.service';

@Injectable()
export class AlertTopicService {
	constructor(
		private agentService: AgentService,
		@InjectRepository(AlertTopic)
		private alertTopicRepository: Repository<AlertTopic>,
		private dataSource: DataSource,
		private eventBus: EventBusService,
		private parserService: ParsersService,
	) { }
	async create(createAlertTopicDto: CreateAlertTopicDto) {

		const d = await this.dataSource.transaction(async (manager) => {
			// Create the Rule entities
			const ruleEntities = createAlertTopicDto.rules.map((ruleDto) => {

				const rule = new Rule();
				rule.expectedValue = ruleDto.expectedValue;
				rule.condition = ruleDto.condition;
				rule.memoryAddress = ruleDto.sensor_id;
				return rule;
			});

			const alertTopic = {
				name: createAlertTopicDto.name,
				message: createAlertTopicDto.message,
				alertType: createAlertTopicDto.alertType,
				rules: ruleEntities,
				agentId: createAlertTopicDto.agentId
			}
			return await manager.save(AlertTopic, alertTopic);
		});
		const agent = await this.agentService.findOne(createAlertTopicDto.agentId);

		for (const sensor of d.rules) {
			this.eventBus.emit("sensor:created", {
				label: d.name,
				id: d.id,
				start_register: this.parserService.logoToModbus(sensor.memoryAddress as string).modbusAddress as number,
				agentFingerprint: agent?.fingerprint as string,
				register: sensor.memoryAddress,
				end_register: 1,
				s_type: "general",
				r_type: this.parserService.logoToModbus(sensor.memoryAddress as string).type?.toUpperCase() as string,
			});
		}
	}

	findAll() {
		return this.alertTopicRepository.find({ relations: ["rules"] });
	}

	findOne(id: string, relations?: string[]) {
		return this.alertTopicRepository.findOne({ where: { id }, relations });
	}

	async update(id: string, updateAlertTopicDto: UpdateAlertTopicDto) {
		const d = await this.dataSource.transaction(async (manager) => {
			// Fetch existing process step and rules
			const s = await manager.findOne(AlertTopic, {
				where: { id },
				relations: ['rules'],
			});

			if (!s) {
				throw new Error(`AlertTopic with ID ${id} not found`);
			}

			// Update process step properties
			s.name = updateAlertTopicDto.name || 'no alert';
			s.message = updateAlertTopicDto.message || "no alert";
			s.alertType = updateAlertTopicDto.alertType || AlertType.normal;
			s.agentId = updateAlertTopicDto.agentId;

			// Delete existing rules and create new ones
			await manager.delete(Rule, { id: { id } });

			const newRules = updateAlertTopicDto.rules?.map(ruleDto => {
				const rule = new Rule();
				rule.expectedValue = ruleDto.expectedValue;
				rule.condition = ruleDto.condition;
				rule.memoryAddress = ruleDto.sensor_id;
				return rule;
			});
			s.rules = newRules || [new Rule()];

			await manager.save(s);
			return s;
		});
		const agent = await this.agentService.findOne(updateAlertTopicDto.agentId);

		for (const sensor of d.rules) {
			this.eventBus.emit("sensor:updated", {
				label: d.name,
				id: d.id,
				start_register: this.parserService.logoToModbus(sensor.memoryAddress as string).modbusAddress as number,
				agentFingerprint: agent?.fingerprint as string,
				register: sensor.memoryAddress,
				end_register: 1,
				s_type: "general",
				r_type: this.parserService.logoToModbus(sensor.memoryAddress as string).type?.toUpperCase() as string,
			});
		}
	}

	async remove(id: string) {
		const sensor = await this.findOne(id, ["agent"])
		if (!sensor) {
			return false;
		}
		const deleted = await this.alertTopicRepository.softDelete({ id })
		if (deleted.affected) {
			this.eventBus.emit("sensor:deleted", { id, agentFingerprint: sensor?.agent.fingerprint });
		}
		await this.alertTopicRepository.softDelete({ id });
	}
}
