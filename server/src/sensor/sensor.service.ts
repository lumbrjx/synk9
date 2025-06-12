import { Injectable } from '@nestjs/common';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Process, Sensor } from 'src/entities';
import { In, Repository } from 'typeorm';
import { EventBusService } from 'src/event-bus/event-bus.service';
import { AgentService } from 'src/agent/agent.service';
import { ParsersService } from 'src/parsers/parsers.service';

@Injectable()
export class SensorService {

	constructor(
		@InjectRepository(Sensor)
		private sensorRepository: Repository<Sensor>,
		@InjectRepository(Process)
		private processReposistory: Repository<Process>,
		private eventBus: EventBusService,
		private agentService: AgentService,
		private parserService: ParsersService
	) { }

	async create(createSensorDto: CreateSensorDto) {
		const data = {
			...createSensorDto,
			start_register: this.parserService.logoToModbus(createSensorDto.register).modbusAddress,
			end_register: 1
		}
		const sensor = this.sensorRepository.create(data);
		if (!sensor) {
			throw new Error("Failed to create a new sensor");
		}
		const saved = await this.sensorRepository.save(sensor);
		if (saved) {
			const agent = await this.agentService.findOne(saved.agentId);

			this.eventBus.emit("sensor:created", {
				label: saved.name,
				id: saved.id,
				start_register: saved.start_register,
				agentFingerprint: agent?.fingerprint as string,
				register: saved.register,
				end_register: saved.end_register,
				s_type: "sensor"
			});
			return saved;
		}
	}

	findBatch(ids: string[]) {
		return this.sensorRepository.find({ where: { id: In(ids) } })
	}
	findAll() {
		return this.sensorRepository.find();
	}
	async findForProcess(id: string) {
		const process = await this.processReposistory.findOne({ where: { id: id }, relations: ["agent"] })
		return this.sensorRepository.find({ where: { agentId: process?.agent.id } });
	}
	findOne(id: string) {
		return this.sensorRepository.findOne({ where: { id } });
	}

	async update(id: string, updateSensorDto: UpdateSensorDto) {
		const updatedSensor = await this.sensorRepository.update({ id }, {
			name: updateSensorDto.name,
			description: updateSensorDto.description,
			register: updateSensorDto.register,
			start_register: this.parserService.logoToModbus(updateSensorDto.register as string).modbusAddress as number,
			end_register: 1
		})
		if (!updatedSensor.affected) {
			throw new Error(`Failed to update the agent with ID: ${id}`);
		}

		if (!updateSensorDto.agentId) {
			throw new Error(`agent ID required: ${id}`);
		}
		const agent = await this.agentService.findOne(updateSensorDto.agentId as string);
		if (!agent) {
			throw new Error(`Failed to find the agent with ID: ${id}`);
		}
		this.eventBus.emit("sensor:updated", {
			id,
			label: updateSensorDto.name as string,
			start_register: this.parserService.logoToModbus(updateSensorDto.register as string).modbusAddress as number,
			agentFingerprint: agent?.fingerprint as string,
			register: updateSensorDto.register as string,
			end_register: 1,
			s_type: "sensor"
		});
		return updatedSensor
	}

	async remove(id: string) {
		const deleted = await this.sensorRepository.softDelete({ id })
		if (deleted.affected) {
			this.eventBus.emit("sensor:deleted", { id });
		}
	}
}
