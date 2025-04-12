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
			const sensorIds = createProcessStepDto.rules.map(rule => rule.sensor_id);
			const sensors = await manager.findBy(Sensor, { id: In(sensorIds) });

			const sensorMap = new Map(sensors.map(s => [s.id, s]));

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

			const processStep = manager.create(ProcessStep, {
				name: createProcessStepDto.name,
				description: createProcessStepDto.description,
				process: { id: createProcessStepDto.processId },
				rules: ruleEntities,
			});

			return await manager.save(processStep);
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
			const step = await manager.findOne(ProcessStep, {
				where: { id },
				relations: ['rules'], 
			});

			if (!step) {
				throw new Error(`ProcessStep with ID ${id} not found`);
			}

			step.name = updateDto.name as string;
			step.description = updateDto.description as string;
			step.skip = updateDto.skip;

			const sensorIds = updateDto.rules?.map(r => r.sensor_id);
			const sensors = await manager.findBy(Sensor, { id: In(sensorIds as string[]) });

			const sensorMap = new Map(sensors.map(s => [s.id, s]));
			for (const id of sensorIds as string[]) {
				if (!sensorMap.has(id)) {
					throw new Error(`Sensor with ID ${id} not found`);
				}
			}

			await manager.delete(Rule, { step: { id } });

			const newRules = updateDto.rules?.map(ruleDto => {
				const rule = new Rule();
				rule.expectedValue = ruleDto.final_value;
				rule.sensor = sensorMap.get(ruleDto.sensor_id)!;
				rule.step = step;
				return rule;
			});

			step.rules = newRules as Rule[];

			await manager.save(step);
			return step;
		});
	}


	async remove(id: string) {
		await this.processStepRepository.softDelete({ id })
	}
}
