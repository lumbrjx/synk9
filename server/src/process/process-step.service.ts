import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcessStep, Rule, Sensor } from 'src/entities';
import { DataSource, In, Repository } from 'typeorm';
import { CreateProcessStepDto } from './dto/create-process.dto';
import { UpdateProcessStepDto } from './dto/update-process.dto';

@Injectable()
export class ProcessStepService {
	constructor(
		@InjectRepository(ProcessStep)
		private processStepRepository: Repository<ProcessStep>,
		private dataSource: DataSource,
	) { }

	async create(createProcessStepDto: CreateProcessStepDto) {
		return await this.dataSource.transaction(async (manager) => {
			// Get all sensor IDs from the rules and fetch sensors from DB
			const sensorIds = createProcessStepDto.rules.map(rule => rule.sensor_id);
			const sensors = await manager.findBy(Sensor, { id: In(sensorIds) });

			const sensorMap = new Map(sensors.map(s => [s.id, s]));

			// Create the Rule entities
			const ruleEntities = createProcessStepDto.rules.map((ruleDto) => {
				const sensor = sensorMap.get(ruleDto.sensor_id);
				if (!sensor) {
					throw new Error(`Sensor with id ${ruleDto.sensor_id} not found`);
				}

				const rule = new Rule();
				rule.expectedValue = ruleDto.final_value;
				rule.sensor = sensor;
				return rule;
			});

			const processStep = {
				name: createProcessStepDto.name,
				description: createProcessStepDto.description,
				from: createProcessStepDto.from ? { id: createProcessStepDto.from } : undefined,
				to: createProcessStepDto.to ? { id: createProcessStepDto.to } : undefined,
				process: { id: createProcessStepDto.processId },
				rules: ruleEntities,
			};

			return await manager.save(ProcessStep, processStep);
		});
	}

	async findByProcess(processId: string) {
		return this.processStepRepository.find({
			where: {
				process: { id: processId },
			},
			relations: ['from', 'to', 'rules'],
		});
	}

	findAll() {
		return this.processStepRepository.find();
	}

	findOne(id: string) {
		return this.processStepRepository.findOne({ where: { id } });
	}

	async update(id: string, updateDto: UpdateProcessStepDto) {
		return await this.dataSource.transaction(async (manager) => {
			// Fetch existing process step and rules
			const step = await manager.findOne(ProcessStep, {
				where: { id },
				relations: ['rules'],
			});

			if (!step) {
				throw new Error(`ProcessStep with ID ${id} not found`);
			}

			// Update process step properties
			step.name = updateDto.name || 'no step';
			step.description = updateDto.description || "no step";
			step.skip = updateDto.skip;

			// Fetch sensors for the updated rules
			const sensorIds = updateDto.rules?.map(r => r.sensor_id);
			const sensors = await manager.findBy(Sensor, { id: In(sensorIds as string[]) });

			const sensorMap = new Map(sensors.map(s => [s.id, s]));

			// Delete existing rules and create new ones
			await manager.delete(Rule, { step: { id } });

			const newRules = updateDto.rules?.map(ruleDto => {
				const rule = new Rule();
				rule.expectedValue = ruleDto.final_value;
				rule.sensor = sensorMap.get(ruleDto.sensor_id)!;
				rule.step = step;
				return rule;
			});

			// Assign new rules to the process step
			step.rules = newRules as Rule[];

			// Save the updated process step
			await manager.save(step);
			return step;
		});
	}

	async remove(id: string) {
		await this.processStepRepository.softDelete({ id });
	}
}

