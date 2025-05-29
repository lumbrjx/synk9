import { Injectable } from '@nestjs/common';
import { CreateAlertTopicDto } from './dto/create-alert-topic.dto';
import { UpdateAlertTopicDto } from './dto/update-alert-topic.dto';
import { DataSource, Repository } from 'typeorm';
import { AlertTopic, AlertType, Rule } from 'src/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { EventBusService } from 'src/event-bus/event-bus.service';
import { AgentService } from 'src/agent/agent.service';

@Injectable()
export class AlertTopicService {
	constructor(
		private agentService: AgentService,
		@InjectRepository(AlertTopic)
		private alertTopicRepository: Repository<AlertTopic>,
		private dataSource: DataSource,
		private eventBus: EventBusService,
	) { }
	async create(createAlertTopicDto: CreateAlertTopicDto) {

		const d = await this.dataSource.transaction(async (manager) => {
			// Create the Rule entities
			const ruleEntities = createAlertTopicDto.rules.map((ruleDto) => {

				const rule = new Rule();
				rule.expectedValue = ruleDto.expectedValue;
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
				start_register: 512,
				agentFingerprint: agent?.fingerprint as string,
				end_register: 1,
				s_type: "general"
			});
		}
	}

	findAll() {
		return this.alertTopicRepository.find();
	}

	findOne(id: string) {
		return this.alertTopicRepository.findOne({ where: { id } });
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
			await manager.delete(Rule, { step: { id } });

			const newRules = updateAlertTopicDto.rules?.map(ruleDto => {
				const rule = new Rule();
				rule.expectedValue = ruleDto.expectedValue;
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
				start_register: parseInt(sensor.memoryAddress),
				agentFingerprint: agent?.fingerprint as string,
				end_register: parseInt(sensor.memoryAddress),

				s_type: "general"
			});
		}
	}

	async remove(id: string) {
		await this.alertTopicRepository.softDelete({ id });
	}
}
